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
var DepositWatcherProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepositWatcherProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const app_config_1 = require("../../config/app-config");
const queues_1 = require("../../infra/queues/queues");
const deposit_chain_watcher_service_1 = require("./deposit-chain-watcher.service");
/** Repeating deposit-watcher job (every DEPOSIT_WATCHER_POLL_SECONDS). Skips gracefully without RPC / token. */
let DepositWatcherProcessor = DepositWatcherProcessor_1 = class DepositWatcherProcessor extends bullmq_1.WorkerHost {
    watcher;
    config;
    queue;
    logger = new common_1.Logger(DepositWatcherProcessor_1.name);
    warned = false;
    constructor(watcher, config, queue) {
        super();
        this.watcher = watcher;
        this.config = config;
        this.queue = queue;
    }
    async onApplicationBootstrap() {
        if (!this.config.env.JOBS_ENABLED)
            return;
        await this.queue.upsertJobScheduler('deposit-watcher', { every: this.config.env.DEPOSIT_WATCHER_POLL_SECONDS * 1000 }, {
            name: queues_1.JOBS.DEPOSIT_WATCH,
            opts: { attempts: 1, removeOnComplete: true, removeOnFail: 100 },
        });
        void this.worker.run();
    }
    async process(job) {
        if (job.name !== queues_1.JOBS.DEPOSIT_WATCH)
            return null;
        const result = await this.watcher.watch('arbitrum');
        if (result.status === 'skipped') {
            if (!this.warned)
                this.logger.warn(`Deposit watcher skipped: ${result.reason}`);
            this.warned = true;
        }
        else if (result.detected || result.credited || result.reorged || result.reversed) {
            this.logger.log(`Deposit watcher: +${result.detected} detected, ${result.credited} credited, ${result.reorged} re-org pending, ${result.reversed} reversed`);
        }
        return result;
    }
};
exports.DepositWatcherProcessor = DepositWatcherProcessor;
exports.DepositWatcherProcessor = DepositWatcherProcessor = DepositWatcherProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queues_1.QUEUES.DEPOSITS, { autorun: false, concurrency: 1 }),
    __param(2, (0, bullmq_1.InjectQueue)(queues_1.QUEUES.DEPOSITS)),
    __metadata("design:paramtypes", [deposit_chain_watcher_service_1.DepositChainWatcherService,
        app_config_1.AppConfig, Function])
], DepositWatcherProcessor);
//# sourceMappingURL=deposit-watcher.processor.js.map