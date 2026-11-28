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
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = exports.EMAIL_NOTIFICATION_CATEGORY = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const schemas_1 = require("@gp/shared/schemas");
const app_config_1 = require("../../config/app-config");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const queues_1 = require("../../infra/queues/queues");
const email_templates_1 = require("./email-templates");
const email_transport_1 = require("./email.transport");
/** Which notification types are also emailed, and under which preference category (A9 matrix). */
exports.EMAIL_NOTIFICATION_CATEGORY = {
    'deposit.credited': 'wallet_deposits',
    'deposit.reversed': 'wallet_deposits',
    'withdrawal.requested': 'wallet_withdrawals',
    'withdrawal.under_review': 'wallet_withdrawals',
    'withdrawal.confirmed': 'wallet_withdrawals',
    'withdrawal.rejected': 'wallet_withdrawals',
    'withdrawal.failed': 'wallet_withdrawals',
    'round.prize_won': 'pool_results',
    'round.cancelled': 'pool_results',
    'security.2fa': 'security_changes',
    'kyc.approved': 'security_changes',
    'kyc.resubmission_required': 'security_changes',
    'account.restriction': 'security_changes',
};
/**
 * Outbound email (MAIL_TRANSPORT: log in dev, smtp via SMTP_*, or disabled). Notification emails are queued
 * (BullMQ `emails`) after the in-app notification row is written and delivered by the worker, honouring the
 * player's channel preferences (locked security categories always send). Every email shows the anti-phishing code.
 */
let EmailService = EmailService_1 = class EmailService {
    prisma;
    config;
    queue;
    logger = new common_1.Logger(EmailService_1.name);
    transport;
    constructor(prisma, config, queue) {
        this.prisma = prisma;
        this.config = config;
        this.queue = queue;
        const env = config.env;
        this.transport =
            env.MAIL_TRANSPORT === 'smtp' && env.SMTP_HOST
                ? new email_transport_1.SmtpEmailTransport({
                    host: env.SMTP_HOST,
                    port: env.SMTP_PORT,
                    secure: env.SMTP_SECURE,
                    user: env.SMTP_USER,
                    password: env.SMTP_PASSWORD,
                })
                : env.MAIL_TRANSPORT === 'disabled'
                    ? new email_transport_1.DisabledEmailTransport()
                    : new email_transport_1.ConsoleEmailTransport();
    }
    /** Messages the console transport kept (dev / tests); empty for SMTP. */
    get consoleOutbox() {
        return this.transport instanceof email_transport_1.ConsoleEmailTransport ? this.transport.outbox : [];
    }
    send(message) {
        return this.transport.send(this.config.env.MAIL_FROM, message);
    }
    /** Queue the email for a freshly written notification (no-op for types that are in-app only). */
    async enqueueForNotification(notificationId, type) {
        if (!exports.EMAIL_NOTIFICATION_CATEGORY[type] || this.transport.kind === 'disabled')
            return;
        try {
            // Delayed so the notification's DB transaction has committed; retried if it is not visible yet.
            await this.queue.add(queues_1.JOBS.EMAIL_NOTIFICATION, { notificationId }, { jobId: `email-${notificationId}`, delay: 2_000, attempts: 4 });
        }
        catch (err) {
            this.logger.warn(`Could not queue email for notification ${notificationId}: ${String(err)}`);
        }
    }
    /** Render and send the email for one notification (worker; idempotent per job id). */
    async sendNotification(notificationId) {
        const n = await this.prisma.notification.findUnique({
            where: { id: notificationId },
            include: {
                user: {
                    select: {
                        email: true,
                        emailVerified: true,
                        profile: { select: { antiPhishingCode: true, preferences: true } },
                    },
                },
            },
        });
        if (!n)
            throw new Error(`notification ${notificationId} not visible yet`);
        const category = exports.EMAIL_NOTIFICATION_CATEGORY[n.type];
        if (!category)
            return { status: 'skipped', reason: 'in-app only type' };
        if (!n.user.email)
            return { status: 'skipped', reason: 'no email address' };
        if (!this.wantsEmail(category, n.user.profile?.preferences ?? null)) {
            return { status: 'skipped', reason: `email off for ${category}` };
        }
        const content = (0, email_templates_1.renderNotificationEmail)({
            title: n.title,
            body: n.body,
            antiPhishingCode: n.user.profile?.antiPhishingCode ?? null,
            appUrl: this.config.env.APP_URL,
        });
        const sent = await this.send({ to: n.user.email, ...content });
        if (!sent)
            return { status: 'skipped', reason: 'email transport disabled' };
        this.logger.log(`email ${n.type} → ${(0, email_transport_1.maskEmail)(n.user.email)} (${sent.transport})`);
        return { status: 'sent', email: sent };
    }
    /** Locked categories always email; others follow the player's A9 choice (default from the category spec). */
    wantsEmail(category, preferences) {
        const spec = schemas_1.NOTIFICATION_CATEGORIES[category];
        if (spec.channels.email === null)
            return false;
        if (spec.locked)
            return spec.channels.email;
        const saved = preferences?.notifications?.categories?.[category]?.email;
        return saved ?? spec.channels.email;
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bullmq_1.InjectQueue)(queues_1.QUEUES.EMAILS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_config_1.AppConfig, Function])
], EmailService);
//# sourceMappingURL=email.service.js.map