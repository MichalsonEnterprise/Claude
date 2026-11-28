"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisabledEmailTransport = exports.SmtpEmailTransport = exports.ConsoleEmailTransport = void 0;
exports.maskEmail = maskEmail;
const common_1 = require("@nestjs/common");
const nodemailer_1 = __importDefault(require("nodemailer"));
const node_crypto_1 = require("node:crypto");
/** j***@example.com — logs never contain full addresses. */
function maskEmail(address) {
    const [user, domain] = address.split('@');
    if (!user || !domain)
        return '***';
    return `${user.slice(0, 1)}***@${domain}`;
}
/** DEV: logs a redacted preview and keeps the last messages in memory (dev / tests). Nothing leaves the process. */
class ConsoleEmailTransport {
    kind = 'console';
    logger = new common_1.Logger('Email');
    outbox = [];
    send(_from, message) {
        const sent = {
            ...message,
            id: `console-${(0, node_crypto_1.randomUUID)()}`,
            at: new Date().toISOString(),
            transport: 'console',
        };
        this.outbox.push(sent);
        if (this.outbox.length > 200)
            this.outbox.shift();
        this.logger.log(`[console email] to ${maskEmail(message.to)} · ${message.subject}`);
        return Promise.resolve(sent);
    }
}
exports.ConsoleEmailTransport = ConsoleEmailTransport;
/** SMTP via nodemailer (SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASSWORD). */
class SmtpEmailTransport {
    kind = 'smtp';
    transporter;
    constructor(cfg) {
        this.transporter = nodemailer_1.default.createTransport({
            host: cfg.host,
            port: cfg.port,
            secure: cfg.secure,
            requireTLS: !cfg.secure && cfg.port === 587,
            ...(cfg.user ? { auth: { user: cfg.user, pass: cfg.password ?? '' } } : {}),
        });
    }
    async send(from, message) {
        const info = (await this.transporter.sendMail({ from, ...message }));
        return {
            ...message,
            id: info.messageId ?? `smtp-${(0, node_crypto_1.randomUUID)()}`,
            at: new Date().toISOString(),
            transport: 'smtp',
        };
    }
}
exports.SmtpEmailTransport = SmtpEmailTransport;
class DisabledEmailTransport {
    kind = 'disabled';
    send() {
        return Promise.resolve(null);
    }
}
exports.DisabledEmailTransport = DisabledEmailTransport;
//# sourceMappingURL=email.transport.js.map