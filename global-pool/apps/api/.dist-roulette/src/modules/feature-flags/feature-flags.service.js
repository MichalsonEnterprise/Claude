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
exports.FeatureFlagsService = exports.DEFAULT_FLAGS = void 0;
const common_1 = require("@nestjs/common");
const errors_1 = require("../../common/errors");
const app_config_1 = require("../../config/app-config");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
/** Default flags (seeded). `real_money.enabled` is informational: REAL_MONEY_ENABLED is a hard env kill switch. */
exports.DEFAULT_FLAGS = [
    {
        key: 'pool.entries.enabled',
        enabled: true,
        description: 'Players can buy Global Pool entries',
    },
    { key: 'deposits.enabled', enabled: true, description: 'Deposit addresses + watcher (testnet)' },
    { key: 'withdrawals.enabled', enabled: true, description: 'Withdrawal requests (testnet)' },
    {
        key: 'games.simulation.enabled',
        enabled: true,
        description: 'Games run as non-monetary simulations',
    },
    {
        key: 'real_money.enabled',
        enabled: false,
        description: 'Locked off — mirrors REAL_MONEY_ENABLED=false',
    },
];
let FeatureFlagsService = class FeatureFlagsService {
    prisma;
    config;
    cache = null;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async isEnabled(key) {
        if (key === 'real_money.enabled')
            return this.config.env.REAL_MONEY_ENABLED;
        const flags = await this.flags();
        return flags.get(key) ?? exports.DEFAULT_FLAGS.find((f) => f.key === key)?.enabled ?? false;
    }
    /** Throws SERVICE_UNAVAILABLE when an operational kill switch is off. */
    async assertEnabled(key, what) {
        if (!(await this.isEnabled(key))) {
            throw new errors_1.AppError('SERVICE_UNAVAILABLE', `${what} is temporarily paused`, { flag: key });
        }
    }
    async list() {
        const rows = await this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
        const keys = new Set(rows.map((r) => r.key));
        return [
            ...rows.map((r) => ({
                key: r.key,
                enabled: r.key === 'real_money.enabled' ? false : r.enabled,
                description: r.description,
            })),
            ...exports.DEFAULT_FLAGS.filter((f) => !keys.has(f.key)),
        ];
    }
    /** Drop the 15 s cache so a flag change (e.g. the dual-approved circuit breaker) applies at once. */
    invalidate() {
        this.cache = null;
    }
    async flags() {
        if (this.cache && Date.now() - this.cache.at < 15_000)
            return this.cache.flags;
        const rows = await this.prisma.featureFlag.findMany();
        const flags = new Map(rows.map((r) => [r.key, r.enabled]));
        this.cache = { at: Date.now(), flags };
        return flags;
    }
};
exports.FeatureFlagsService = FeatureFlagsService;
exports.FeatureFlagsService = FeatureFlagsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_config_1.AppConfig])
], FeatureFlagsService);
//# sourceMappingURL=feature-flags.service.js.map