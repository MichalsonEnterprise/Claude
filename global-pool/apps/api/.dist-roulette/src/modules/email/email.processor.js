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
var EmailProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const app_config_1 = require("../../config/app-config");
const queues_1 = require("../../infra/queues/queues");
const email_service_1 = require("./email.service");
/** Email delivery worker (queue `emails`); runs only with JOBS_ENABLED=true. */
let EmailProcessor = EmailProcessor_1 = class EmailProcessor extends bullmq_1.WorkerHost {
    email;
    config;
    logger = new common_1.Logger(EmailProcessor_1.name);
    constructor(email, config) {
        super();
        this.email = email;
        this.config = config;
    }
    onApplicationBootstrap() {
        if (this.config.env.JOBS_ENABLED)
            void this.worker.run();
    }
    async process(job) {
        if (job.name !== queues_1.JOBS.EMAIL_NOTIFICATION) {
            this.logger.warn(`Unknown job ${job.name}`);
            return null;
        }
        return this.email.sendNotification(job.data.notificationId);
    }
};
exports.EmailProcessor = EmailProcessor;
exports.EmailProcessor = EmailProcessor = EmailProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queues_1.QUEUES.EMAILS, { autorun: false, concurrency: 2 }),
    __metadata("design:paramtypes", [email_service_1.EmailService,
        app_config_1.AppConfig])
], EmailProcessor);
//# sourceMappingURL=email.processor.js.map