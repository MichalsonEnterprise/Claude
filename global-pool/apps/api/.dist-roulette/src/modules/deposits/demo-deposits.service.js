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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoDepositsService = void 0;
const common_1 = require("@nestjs/common");
const money_1 = require("@gp/shared/money");
const node_crypto_1 = require("node:crypto");
const errors_1 = require("../../common/errors");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const blockchain_service_1 = require("../blockchain/blockchain.service");
const responsible_gaming_service_1 = require("../compliance/responsible-gaming.service");
const feature_flags_service_1 = require("../feature-flags/feature-flags.service");
const idempotency_service_1 = require("../idempotency/idempotency.service");
const deposit_address_service_1 = require("./deposit-address.service");
const deposits_service_1 = require("./deposits.service");
const DEFAULT_STEP = 4;
/**
 * DEMO-only progressive deposits (wallet deposit flow QA): a simulated test-USDT transfer is recorded as DETECTED with
 * 0 confirmations (posting CHAIN_CLEARING → PENDING, exactly like the watcher), then simulated blocks are added until
 * the required confirmations are reached and it is credited (PENDING → AVAILABLE) with the regular credit path.
 * Never available outside DEMO mode (the controller is @DemoOnly()).
 */
let DemoDepositsService = class DemoDepositsService {
    prisma;
    deposits;
    addresses;
    blockchain;
    rg;
    idempotency;
    flags;
    constructor(prisma, deposits, addresses, blockchain, rg, idempotency, flags) {
        this.prisma = prisma;
        this.deposits = deposits;
        this.addresses = addresses;
        this.blockchain = blockchain;
        this.rg = rg;
        this.idempotency = idempotency;
        this.flags = flags;
    }
    async simulateDetected(userId, input) {
        await this.flags.assertEnabled('deposits.enabled', 'Deposits');
        return this.idempotency.run({ scope: 'deposit.simulate', ownerId: userId, key: input.idempotencyKey, request: input }, async (tx) => {
            await this.rg.assertCanDeposit(userId, input.amount, tx);
            const address = await this.addresses.forUser(userId, input.network);
            const deposit = await this.deposits.recordDetected(tx, {
                network: input.network,
                userId,
                txHash: `0x${(0, node_crypto_1.randomBytes)(32).toString('hex')}`,
                logIndex: 0,
                blockNumber: null,
                from: null,
                to: address.address.toLowerCase(),
                tokenAddress: null,
                amount: (0, money_1.toUSDTString)(input.amount),
                isDemo: true,
            });
            return { ...this.deposits.view(deposit), simulated: true, mode: 'progressive' };
        });
    }
    /** Add simulated confirmations to the player's own DEMO deposit; credits it once the requirement is met. */
    async advance(userId, reference, step = DEFAULT_STEP) {
        const number = parseReference(reference);
        const result = await this.prisma.tx(async (tx) => {
            const found = await tx.deposit.findFirst({ where: { userId, number }, select: { id: true } });
            if (!found)
                throw (0, errors_1.notFound)('Deposit');
            await tx.$queryRaw `SELECT id FROM deposits WHERE id = ${found.id}::uuid FOR UPDATE`;
            const d = await tx.deposit.findUniqueOrThrow({ where: { id: found.id } });
            if (!d.isDemo || d.blockNumber !== null)
                throw new errors_1.AppError('CONFLICT', 'Only simulated DEMO deposits can be advanced');
            if (d.status !== 'detected' && d.status !== 'confirming')
                throw new errors_1.AppError('CONFLICT', `Deposit is ${d.status}`);
            const next = Math.min(d.requiredConfirmations, d.confirmations + step);
            if (next >= d.requiredConfirmations) {
                await this.deposits.credit(tx, d, next);
            }
            else {
                await tx.deposit.update({ where: { id: d.id }, data: { confirmations: next } });
                await tx.transaction.updateMany({
                    where: { depositId: d.id },
                    data: {
                        metadata: { statusDetail: `${next} / ${d.requiredConfirmations} confirmations` },
                    },
                });
            }
            return tx.deposit.findUniqueOrThrow({ where: { id: d.id } });
        });
        return this.deposits.view(result);
    }
    /** One deposit by its public reference (DP-77412), for the pending / confirmation screens. */
    async byReference(userId, reference) {
        const d = await this.prisma.deposit.findFirst({
            where: { userId, number: parseReference(reference) },
        });
        if (!d)
            throw (0, errors_1.notFound)('Deposit');
        return {
            ...this.deposits.view(d),
            requiredConfirmations: this.blockchain.requiredConfirmations(d.network),
        };
    }
};
exports.DemoDepositsService = DemoDepositsService;
exports.DemoDepositsService = DemoDepositsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        deposits_service_1.DepositsService,
        deposit_address_service_1.DepositAddressService,
        blockchain_service_1.BlockchainService,
        responsible_gaming_service_1.ResponsibleGamingService,
        idempotency_service_1.IdempotencyService,
        feature_flags_service_1.FeatureFlagsService])
], DemoDepositsService);
function parseReference(reference) {
    const match = /^DP-(\d{1,12})$/i.exec(reference.trim());
    if (!match)
        throw (0, errors_1.notFound)('Deposit');
    return Number(match[1]);
}
//# sourceMappingURL=demo-deposits.service.js.map