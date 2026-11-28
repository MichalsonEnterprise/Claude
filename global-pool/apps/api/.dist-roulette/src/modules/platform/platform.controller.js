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
exports.PlatformController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const chains_1 = require("@gp/shared/chains");
const fees_1 = require("@gp/shared/fees");
const limits_1 = require("@gp/shared/limits");
const pool_1 = require("@gp/shared/pool");
const app_config_1 = require("../../config/app-config");
const blockchain_service_1 = require("../blockchain/blockchain.service");
const privy_service_1 = require("../auth/privy.service");
const randomness_service_1 = require("../randomness/randomness.service");
let PlatformController = class PlatformController {
    config;
    blockchain;
    privy;
    randomness;
    constructor(config, blockchain, privy, randomness) {
        this.config = config;
        this.blockchain = blockchain;
        this.privy = privy;
        this.randomness = randomness;
    }
    publicConfig() {
        return {
            demoMode: this.config.env.DEMO_MODE,
            realMoneyEnabled: this.config.env.REAL_MONEY_ENABLED,
            chainEnv: this.config.env.CHAIN_ENV,
            mvpChainId: chains_1.MVP_CHAIN_ID,
            playerAuth: this.privy.mode,
            randomnessProvider: this.randomness.provider.kind,
            chains: chains_1.CHAIN_DISPLAY_ORDER.map((k) => chains_1.CHAINS[k]),
            fees: {
                entryPrice: fees_1.ENTRY_PRICE,
                platformFeePerEntry: fees_1.PLATFORM_FEE_PER_ENTRY,
                entryNetworkFee: fees_1.ENTRY_NETWORK_FEE,
                platformWithdrawalFee: fees_1.PLATFORM_WITHDRAWAL_FEE,
                maxEntriesPerPurchase: fees_1.MAX_ENTRIES_PER_PURCHASE,
            },
            limits: {
                minAge: limits_1.MIN_AGE,
                minDeposit: limits_1.MIN_DEPOSIT,
                minWithdrawal: limits_1.MIN_WITHDRAWAL,
                dailyWithdrawalLimit: limits_1.DAILY_WITHDRAWAL_LIMIT,
                newAddressCooldownHours: limits_1.NEW_ADDRESS_COOLDOWN_HOURS,
                rgLimitIncreaseCooldownHours: limits_1.RG_LIMIT_INCREASE_COOLDOWN_HOURS,
            },
            round: {
                thresholds: pool_1.ROUND_THRESHOLDS,
                prizeDistribution: pool_1.PRIZE_DISTRIBUTION,
                schedule: 'daily 08:00–20:00 UTC',
            },
        };
    }
    chains() {
        return this.blockchain.status();
    }
};
exports.PlatformController = PlatformController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Public platform configuration: DEMO flags, chains, fees, limits, round rules',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PlatformController.prototype, "publicConfig", null);
__decorate([
    (0, common_1.Get)('chains'),
    (0, swagger_1.ApiOperation)({ summary: 'Chain configuration status (testnets only; no secrets)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PlatformController.prototype, "chains", null);
exports.PlatformController = PlatformController = __decorate([
    (0, swagger_1.ApiTags)('platform'),
    (0, common_1.Controller)('config'),
    __metadata("design:paramtypes", [app_config_1.AppConfig,
        blockchain_service_1.BlockchainService,
        privy_service_1.PrivyService,
        randomness_service_1.RandomnessService])
], PlatformController);
//# sourceMappingURL=platform.controller.js.map