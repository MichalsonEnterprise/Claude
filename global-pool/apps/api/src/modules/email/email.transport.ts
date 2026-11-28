import { Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { randomUUID } from 'node:crypto';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SentEmail extends EmailMessage {
  id: string;
  at: string;
  transport: 'console' | 'smtp';
}

export interface EmailTransport {
  readonly kind: 'console' | 'smtp' | 'disabled';
  send(from: string, message: EmailMessage): Promise<SentEmail | null>;
}

/** j***@example.com — logs never contain full addresses. */
export function maskEmail(address: string): string {
  const [user, domain] = address.split('@');
  if (!user || !domain) return '***';
  return `${user.slice(0, 1)}***@${domain}`;
}

/** DEV: logs a redacted preview and keeps the last messages in memory (dev / tests). Nothing leaves the process. */
export class ConsoleEmailTransport implements EmailTransport {
  readonly kind = 'console' as const;
  private readonly logger = new Logger('Email');
  readonly outbox: SentEmail[] = [];

  send(_from: string, message: EmailMessage): Promise<SentEmail> {
    const sent: SentEmail = {
      ...message,
      id: `console-${randomUUID()}`,
      at: new Date().toISOString(),
      transport: 'console',
    };
    this.outbox.push(sent);
    if (this.outbox.length > 200) this.outbox.shift();
    this.logger.log(`[console email] to ${maskEmail(message.to)} · ${message.subject}`);
    return Promise.resolve(sent);
  }
}

/** SMTP via nodemailer (SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASSWORD). */
export class SmtpEmailTransport implements EmailTransport {
  readonly kind = 'smtp' as const;
  private readonly transporter: Transporter;

  constructor(cfg: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    password?: string;
  }) {
    this.transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      requireTLS: !cfg.secure && cfg.port === 587,
      ...(cfg.user ? { auth: { user: cfg.user, pass: cfg.password ?? '' } } : {}),
    });
  }

  async send(from: string, message: EmailMessage): Promise<SentEmail> {
    const info = (await this.transporter.sendMail({ from, ...message })) as { messageId?: string };
    return {
      ...message,
      id: info.messageId ?? `smtp-${randomUUID()}`,
      at: new Date().toISOString(),
      transport: 'smtp',
    };
  }
}

export class DisabledEmailTransport implements EmailTransport {
  readonly kind = 'disabled' as const;
  send(): Promise<null> {
    return Promise.resolve(null);
  }
}
