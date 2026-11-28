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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisModule = exports.InjectRedis = exports.REDIS = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const app_config_1 = require("../../config/app-config");
exports.REDIS = Symbol('REDIS');
const InjectRedis = () => (0, common_1.Inject)(exports.REDIS);
exports.InjectRedis = InjectRedis;
let RedisCloser = class RedisCloser {
    redis;
    logger = new common_1.Logger('Redis');
    constructor(redis) {
        this.redis = redis;
    }
    async onModuleDestroy() {
        try {
            await this.redis.quit();
        }
        catch (err) {
            this.logger.warn(`Redis quit failed: ${String(err)}`);
        }
    }
};
RedisCloser = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(exports.REDIS)),
    __metadata("design:paramtypes", [Function])
], RedisCloser);
/** Shared ioredis connection (health checks, rate limits, short-lived security state). */
let RedisModule = class RedisModule {
};
exports.RedisModule = RedisModule;
exports.RedisModule = RedisModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            {
                provide: exports.REDIS,
                inject: [app_config_1.AppConfig],
                useFactory: (config) => new ioredis_1.default(config.env.REDIS_URL, {
                    maxRetriesPerRequest: 3,
                    lazyConnect: false,
                    enableOfflineQueue: true,
                }),
            },
            RedisCloser,
        ],
        exports: [exports.REDIS],
    })
], RedisModule);
//# sourceMappingURL=redis.module.js.map