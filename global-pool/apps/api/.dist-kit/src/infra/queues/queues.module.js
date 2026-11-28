"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueuesModule = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const app_config_1 = require("../../config/app-config");
const redis_options_1 = require("../redis/redis-options");
const queues_1 = require("./queues");
/**
 * BullMQ scaffold: deposit watcher, withdrawal processing, round lifecycle/settlement. Workers are created with
 * autorun=false and only started when JOBS_ENABLED=true (see each processor's onApplicationBootstrap).
 */
let QueuesModule = class QueuesModule {
};
exports.QueuesModule = QueuesModule;
exports.QueuesModule = QueuesModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.forRootAsync({
                inject: [app_config_1.AppConfig],
                useFactory: (config) => ({
                    connection: (0, redis_options_1.redisOptionsFromUrl)(config.env.REDIS_URL),
                    prefix: config.env.BULLMQ_PREFIX,
                    defaultJobOptions: {
                        attempts: 5,
                        backoff: { type: 'exponential', delay: 2_000 },
                        removeOnComplete: { age: 3_600, count: 1_000 },
                        removeOnFail: { age: 7 * 86_400 },
                    },
                }),
            }),
            bullmq_1.BullModule.registerQueue({ name: queues_1.QUEUES.DEPOSITS }, { name: queues_1.QUEUES.WITHDRAWALS }, { name: queues_1.QUEUES.ROUNDS }, { name: queues_1.QUEUES.EMAILS }),
        ],
        exports: [bullmq_1.BullModule],
    })
], QueuesModule);
//# sourceMappingURL=queues.module.js.map