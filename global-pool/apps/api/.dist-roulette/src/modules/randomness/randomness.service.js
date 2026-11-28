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
var RandomnessService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomnessService = void 0;
const common_1 = require("@nestjs/common");
const money_1 = require("../../common/money");
const app_config_1 = require("../../config/app-config");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const blockchain_service_1 = require("../blockchain/blockchain.service");
const chainlink_vrf_provider_1 = require("./chainlink-vrf.provider");
const mock_vrf_provider_1 = require("./mock-vrf.provider");
let RandomnessService = RandomnessService_1 = class RandomnessService {
    prisma;
    logger = new common_1.Logger(RandomnessService_1.name);
    provider;
    constructor(prisma, config, blockchain) {
        this.prisma = prisma;
        if (config.env.RANDOMNESS_PROVIDER === 'chainlink') {
            this.provider = new chainlink_vrf_provider_1.ChainlinkVrfProvider({
                // eth_chainId is verified before every first read (never a mainnet RPC)
                client: blockchain.client('arbitrum') ? () => blockchain.verifiedClient('arbitrum') : null,
                poolContract: config.env.POOL_CONTRACT_ADDRESS ?? null,
                fromBlock: config.env.POOL_CONTRACT_START_BLOCK,
                requestConfirmations: config.env.VRF_FULFILLMENT_CONFIRMATIONS,
            });
        }
        else {
            if (config.isProduction)
                throw new Error('RANDOMNESS_PROVIDER=mock is not allowed in production');
            this.provider = new mock_vrf_provider_1.MockVrfProvider();
        }
    }
    info(round) {
        return {
            roundId: round.id,
            roundNumber: round.number,
            onchainRoundId: round.onchainRoundId ?? BigInt(round.number),
            totalEntries: round.entriesCount,
        };
    }
    /** Create the request (or return the open one). */
    async request(round) {
        const open = await this.prisma.randomnessRequest.findFirst({
            where: { roundId: round.id, status: { in: ['requested', 'fulfilled'] } },
            orderBy: { createdAt: 'desc' },
        });
        if (open)
            return open;
        const attempts = await this.prisma.randomnessRequest.count({ where: { roundId: round.id } });
        const res = await this.provider.request(this.info(round));
        return this.prisma.randomnessRequest.create({
            data: {
                roundId: round.id,
                provider: this.provider.kind,
                status: 'requested',
                requestId: res.requestId,
                attempt: attempts + 1,
                network: res.network,
                requestTxHash: res.requestTxHash,
                requestedAt: new Date(),
                metadata: (0, money_1.toJson)(res.metadata),
                isDemo: round.isDemo,
            },
        });
    }
    /** Poll the provider; persists the word once fulfilled. */
    async poll(round, request) {
        if (request.status !== 'requested')
            return request;
        const f = await this.provider.fulfillment({
            requestId: request.requestId,
            round: this.info(round),
            requestedAt: request.requestedAt,
        });
        if (!f)
            return request;
        this.logger.log(`Round #${round.number}: randomness fulfilled (${this.provider.kind})`);
        if (f.requestId && f.requestId !== request.requestId) {
            // The contract stored the word of another request of this round (the contract's fulfilledRequestId is final).
            const earlier = await this.prisma.randomnessRequest.findFirst({
                where: { roundId: round.id, requestId: f.requestId },
            });
            await this.prisma.randomnessRequest.update({
                where: { id: request.id },
                data: {
                    status: 'failed',
                    failureReason: `superseded: request ${f.requestId} was fulfilled first`,
                },
            });
            if (!earlier)
                throw new Error(`Fulfilled VRF request ${f.requestId} is unknown to the database`);
            request = earlier;
        }
        return this.prisma.randomnessRequest.update({
            where: { id: request.id },
            data: {
                status: 'fulfilled',
                randomWord: f.randomWord,
                fulfilledAt: f.fulfilledAt,
                fulfillTxHash: f.fulfillTxHash,
                blockNumber: f.blockNumber,
                confirmations: f.confirmations,
            },
        });
    }
    fulfilledFor(roundId) {
        return this.prisma.randomnessRequest.findFirst({
            where: { roundId, status: 'fulfilled', randomWord: { not: null } },
            orderBy: { fulfilledAt: 'asc' },
        });
    }
};
exports.RandomnessService = RandomnessService;
exports.RandomnessService = RandomnessService = RandomnessService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_config_1.AppConfig,
        blockchain_service_1.BlockchainService])
], RandomnessService);
//# sourceMappingURL=randomness.service.js.map