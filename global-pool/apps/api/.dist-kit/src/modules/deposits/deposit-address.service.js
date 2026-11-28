"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DepositAddressService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepositAddressService = void 0;
const common_1 = require("@nestjs/common");
const chains_1 = require("@gp/shared/chains");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const errors_1 = require("../../common/errors");
const app_config_1 = require("../../config/app-config");
const load_env_1 = require("../../config/load-env");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const hd_1 = require("./hd");
const INDEX_LOCK = 7_262_101;
let DepositAddressService = DepositAddressService_1 = class DepositAddressService {
    prisma;
    config;
    logger = new common_1.Logger(DepositAddressService_1.name);
    xpub;
    fingerprint;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    onModuleInit() {
        const configured = this.config.env.DEPOSIT_XPUB;
        if (configured) {
            (0, hd_1.parseXpub)(configured);
            this.xpub = configured;
        }
        else if (this.config.isProduction) {
            throw new Error('DEPOSIT_XPUB is required in production');
        }
        else {
            this.xpub = this.devXpub();
        }
        this.fingerprint = (0, hd_1.xpubFingerprint)(this.xpub);
    }
    /** Persist the throwaway dev xpub (public key only) so addresses stay stable across restarts. */
    devXpub() {
        if (this.config.isTest)
            return (0, hd_1.generateDevXpub)();
        const file = (0, node_path_1.resolve)((0, load_env_1.findApiRoot)(), '.dev', 'deposit-xpub.dev.json');
        try {
            if ((0, node_fs_1.existsSync)(file)) {
                const saved = JSON.parse((0, node_fs_1.readFileSync)(file, 'utf8'));
                if (saved.xpub)
                    return saved.xpub;
            }
            const xpub = (0, hd_1.generateDevXpub)();
            (0, node_fs_1.mkdirSync)((0, node_path_1.resolve)(file, '..'), { recursive: true });
            (0, node_fs_1.writeFileSync)(file, JSON.stringify({ xpub, note: 'DEV ONLY throwaway testnet xpub (private seed discarded). Git-ignored.' }, null, 2));
            this.logger.warn(`DEPOSIT_XPUB unset — generated a throwaway DEV xpub (${file})`);
            return xpub;
        }
        catch {
            return (0, hd_1.generateDevXpub)();
        }
    }
    /** Get (or assign) the player's deposit address for an enabled network. */
    async forUser(userId, network) {
        const chain = chains_1.CHAINS[network];
        if (!chain.enabled)
            throw new errors_1.AppError('NETWORK_NOT_AVAILABLE', `${chain.name} deposits are coming soon`);
        if (chain.family !== 'evm')
            throw new errors_1.AppError('NETWORK_NOT_AVAILABLE', `${chain.name} is not supported yet`);
        const existing = await this.prisma.depositAddress.findUnique({
            where: { userId_network: { userId, network } },
        });
        if (existing)
            return this.view(existing);
        const row = await this.prisma.tx(async (tx) => {
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(${INDEX_LOCK})`;
            const again = await tx.depositAddress.findUnique({
                where: { userId_network: { userId, network } },
            });
            if (again)
                return again;
            const last = await tx.depositAddress.findFirst({
                where: { network, xpubFingerprint: this.fingerprint },
                orderBy: { derivationIndex: 'desc' },
                select: { derivationIndex: true },
            });
            const derived = (0, hd_1.deriveEvmAddress)(this.xpub, (last?.derivationIndex ?? -1) + 1);
            return tx.depositAddress.create({
                data: {
                    userId,
                    network,
                    address: derived.address.toLowerCase(),
                    addressChecksum: derived.address,
                    derivationIndex: derived.index,
                    derivationPath: derived.path,
                    xpubFingerprint: this.fingerprint,
                },
            });
        });
        return this.view(row);
    }
    view(row) {
        const chain = chains_1.CHAINS[row.network];
        return {
            network: row.network,
            networkName: chain.testnet.name,
            chainId: chain.testnet.chainId,
            token: chain.testnet.tokenLabel,
            tokenStandard: chain.usdtStandard,
            address: row.addressChecksum,
            minDeposit: chain.minDeposit,
            confirmations: this.config.env.DEPOSIT_CONFIRMATIONS_ARBITRUM,
            derivationIndex: row.derivationIndex,
            testnet: true,
            warning: `Send only ${chain.testnet.tokenLabel} on ${chain.testnet.name}. TESTNET / DEMO — never send real funds.`,
        };
    }
};
exports.DepositAddressService = DepositAddressService;
exports.DepositAddressService = DepositAddressService = DepositAddressService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_config_1.AppConfig])
], DepositAddressService);
//# sourceMappingURL=deposit-address.service.js.map