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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const app_config_1 = require("../../config/app-config");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const redis_module_1 = require("../../infra/redis/redis.module");
async function timed(fn) {
    const started = performance.now();
    try {
        await Promise.race([
            fn(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2_000)),
        ]);
        return { status: 'up', latencyMs: Math.round(performance.now() - started) };
    }
    catch (err) {
        return {
            status: 'down',
            latencyMs: Math.round(performance.now() - started),
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
let HealthController = class HealthController {
    prisma;
    config;
    redis;
    startedAt = Date.now();
    constructor(prisma, config, redis) {
        this.prisma = prisma;
        this.config = config;
        this.redis = redis;
    }
    async health(res) {
        const [database, redis] = await Promise.all([
            timed(() => this.prisma.$queryRaw `SELECT 1`),
            timed(() => this.redis.ping()),
        ]);
        const ok = database.status === 'up' && redis.status === 'up';
        res.status(ok ? 200 : 503);
        return {
            status: ok ? 'ok' : 'degraded',
            service: '@gp/api',
            version: process.env.npm_package_version ?? '0.1.0',
            environment: this.config.env.NODE_ENV,
            demoMode: this.config.env.DEMO_MODE,
            realMoneyEnabled: this.config.env.REAL_MONEY_ENABLED,
            chainEnv: this.config.env.CHAIN_ENV,
            uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
            checks: { database, redis },
            time: new Date().toISOString(),
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Liveness + readiness: PostgreSQL and Redis checks (503 when a dependency is down)',
    }),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "health", null);
exports.HealthController = HealthController = __decorate([
    (0, swagger_1.ApiTags)('health'),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Controller)('health'),
    __param(2, (0, redis_module_1.InjectRedis)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_config_1.AppConfig, Function])
], HealthController);
//# sourceMappingURL=health.controller.js.map