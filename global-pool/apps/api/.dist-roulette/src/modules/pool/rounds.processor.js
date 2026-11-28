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
var RoundsProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoundsProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const app_config_1 = require("../../config/app-config");
const queues_1 = require("../../infra/queues/queues");
const round_lifecycle_service_1 = require("./round-lifecycle.service");
/** Round lifecycle + settlement queue: a repeating tick (every 30 s) and on-demand settle jobs. */
let RoundsProcessor = RoundsProcessor_1 = class RoundsProcessor extends bullmq_1.WorkerHost {
    lifecycle;
    config;
    queue;
    logger = new common_1.Logger(RoundsProcessor_1.name);
    constructor(lifecycle, config, queue) {
        super();
        this.lifecycle = lifecycle;
        this.config = config;
        this.queue = queue;
    }
    async onApplicationBootstrap() {
        if (!this.config.env.JOBS_ENABLED)
            return;
        await this.queue.upsertJobScheduler('round-tick', { every: 30_000 }, { name: queues_1.JOBS.ROUND_TICK, opts: { attempts: 1, removeOnComplete: true, removeOnFail: 100 } });
        void this.worker.run();
    }
    async process(job) {
        if (job.name === queues_1.JOBS.ROUND_TICK) {
            const report = await this.lifecycle.tick();
            const changed = report.opened.length +
                report.closed.length +
                report.settled.length +
                report.cancelled.length;
            if (changed || report.scheduled)
                this.logger.log(`Round tick: ${JSON.stringify(report)}`);
            return report;
        }
        if (job.name === queues_1.JOBS.ROUND_SETTLE && job.data.roundId) {
            return this.lifecycle.pollAndSettle(job.data.roundId);
        }
        return null;
    }
};
exports.RoundsProcessor = RoundsProcessor;
exports.RoundsProcessor = RoundsProcessor = RoundsProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queues_1.QUEUES.ROUNDS, { autorun: false, concurrency: 1 }),
    __param(2, (0, bullmq_1.InjectQueue)(queues_1.QUEUES.ROUNDS)),
    __metadata("design:paramtypes", [round_lifecycle_service_1.RoundLifecycleService,
        app_config_1.AppConfig, Function])
], RoundsProcessor);
//# sourceMappingURL=rounds.processor.js.map