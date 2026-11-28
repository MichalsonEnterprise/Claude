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
var WithdrawalsProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalsProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const app_config_1 = require("../../config/app-config");
const queues_1 = require("../../infra/queues/queues");
const withdrawal_broadcaster_service_1 = require("./withdrawal-broadcaster.service");
const withdrawals_service_1 = require("./withdrawals.service");
/**
 * Withdrawal processing queue: risk-check retries, the broadcast step and (with the testnet broadcaster on) a
 * repeating tracker that settles confirmed transfers and returns the funds of failed ones.
 */
let WithdrawalsProcessor = WithdrawalsProcessor_1 = class WithdrawalsProcessor extends bullmq_1.WorkerHost {
    withdrawals;
    broadcaster;
    config;
    queue;
    logger = new common_1.Logger(WithdrawalsProcessor_1.name);
    constructor(withdrawals, broadcaster, config, queue) {
        super();
        this.withdrawals = withdrawals;
        this.broadcaster = broadcaster;
        this.config = config;
        this.queue = queue;
    }
    async onApplicationBootstrap() {
        if (!this.config.env.JOBS_ENABLED)
            return;
        if (this.broadcaster.enabled) {
            await this.queue.upsertJobScheduler('withdrawal-tracker', { every: this.config.env.WITHDRAWAL_TRACK_POLL_SECONDS * 1000 }, {
                name: queues_1.JOBS.WITHDRAWAL_TRACK,
                opts: { attempts: 1, removeOnComplete: true, removeOnFail: 100 },
            });
        }
        void this.worker.run();
    }
    async process(job) {
        switch (job.name) {
            case queues_1.JOBS.WITHDRAWAL_RISK_CHECK:
                return this.withdrawals.runRiskCheck(job.data.withdrawalId);
            case queues_1.JOBS.WITHDRAWAL_BROADCAST:
                return this.broadcaster.broadcast(job.data.withdrawalId);
            case queues_1.JOBS.WITHDRAWAL_TRACK: {
                const summary = await this.broadcaster.trackAll();
                if (summary.confirmed || summary.failed || summary.broadcast) {
                    this.logger.log(`Withdrawal tracker: ${JSON.stringify(summary)}`);
                }
                return summary;
            }
            default:
                this.logger.warn(`Unknown job ${job.name}`);
                return null;
        }
    }
};
exports.WithdrawalsProcessor = WithdrawalsProcessor;
exports.WithdrawalsProcessor = WithdrawalsProcessor = WithdrawalsProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queues_1.QUEUES.WITHDRAWALS, { autorun: false, concurrency: 4 }),
    __param(3, (0, bullmq_1.InjectQueue)(queues_1.QUEUES.WITHDRAWALS)),
    __metadata("design:paramtypes", [withdrawals_service_1.WithdrawalsService,
        withdrawal_broadcaster_service_1.WithdrawalBroadcasterService,
        app_config_1.AppConfig, Function])
], WithdrawalsProcessor);
//# sourceMappingURL=withdrawals.processor.js.map