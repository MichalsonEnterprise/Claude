import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { NOTIFICATION_CATEGORIES, type NotificationCategory } from '@gp/shared/schemas';
import type { Queue } from 'bullmq';

import { AppConfig } from '../../config/app-config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { JOBS, QUEUES } from '../../infra/queues/queues';
import { renderNotificationEmail } from './email-templates';
import {
  ConsoleEmailTransport,
  DisabledEmailTransport,
  SmtpEmailTransport,
  maskEmail,
  type EmailMessage,
  type EmailTransport,
  type SentEmail,
} from './email.transport';

/** Which notification types are also emailed, and under which preference category (A9 matrix). */
export const EMAIL_NOTIFICATION_CATEGORY: Record<string, NotificationCategory> = {
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

export type EmailOutcome =
  { status: 'sent'; email: SentEmail } | { status: 'skipped'; reason: string };

/**
 * Outbound email (MAIL_TRANSPORT: log in dev, smtp via SMTP_*, or disabled). Notification emails are queued
 * (BullMQ `emails`) after the in-app notification row is written and delivered by the worker, honouring the
 * player's channel preferences (locked security categories always send). Every email shows the anti-phishing code.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  readonly transport: EmailTransport;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    @InjectQueue(QUEUES.EMAILS) private readonly queue: Queue,
  ) {
    const env = config.env;
    this.transport =
      env.MAIL_TRANSPORT === 'smtp' && env.SMTP_HOST
        ? new SmtpEmailTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            user: env.SMTP_USER,
            password: env.SMTP_PASSWORD,
          })
        : env.MAIL_TRANSPORT === 'disabled'
          ? new DisabledEmailTransport()
          : new ConsoleEmailTransport();
  }

  /** Messages the console transport kept (dev / tests); empty for SMTP. */
  get consoleOutbox(): SentEmail[] {
    return this.transport instanceof ConsoleEmailTransport ? this.transport.outbox : [];
  }

  send(message: EmailMessage): Promise<SentEmail | null> {
    return this.transport.send(this.config.env.MAIL_FROM, message);
  }

  /** Queue the email for a freshly written notification (no-op for types that are in-app only). */
  async enqueueForNotification(notificationId: string, type: string): Promise<void> {
    if (!EMAIL_NOTIFICATION_CATEGORY[type] || this.transport.kind === 'disabled') return;
    try {
      // Delayed so the notification's DB transaction has committed; retried if it is not visible yet.
      await this.queue.add(
        JOBS.EMAIL_NOTIFICATION,
        { notificationId },
        { jobId: `email-${notificationId}`, delay: 2_000, attempts: 4 },
      );
    } catch (err) {
      this.logger.warn(`Could not queue email for notification ${notificationId}: ${String(err)}`);
    }
  }

  /** Render and send the email for one notification (worker; idempotent per job id). */
  async sendNotification(notificationId: string): Promise<EmailOutcome> {
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
    if (!n) throw new Error(`notification ${notificationId} not visible yet`);
    const category = EMAIL_NOTIFICATION_CATEGORY[n.type];
    if (!category) return { status: 'skipped', reason: 'in-app only type' };
    if (!n.user.email) return { status: 'skipped', reason: 'no email address' };
    if (!this.wantsEmail(category, n.user.profile?.preferences ?? null)) {
      return { status: 'skipped', reason: `email off for ${category}` };
    }
    const content = renderNotificationEmail({
      title: n.title,
      body: n.body,
      antiPhishingCode: n.user.profile?.antiPhishingCode ?? null,
      appUrl: this.config.env.APP_URL,
    });
    const sent = await this.send({ to: n.user.email, ...content });
    if (!sent) return { status: 'skipped', reason: 'email transport disabled' };
    this.logger.log(`email ${n.type} → ${maskEmail(n.user.email)} (${sent.transport})`);
    return { status: 'sent', email: sent };
  }

  /** Locked categories always email; others follow the player's A9 choice (default from the category spec). */
  private wantsEmail(
    category: NotificationCategory,
    preferences: Prisma.JsonValue | null,
  ): boolean {
    const spec = NOTIFICATION_CATEGORIES[category];
    if (spec.channels.email === null) return false;
    if (spec.locked) return spec.channels.email;
    const saved = (
      preferences as {
        notifications?: { categories?: Record<string, { email?: boolean }> };
      } | null
    )?.notifications?.categories?.[category]?.email;
    return saved ?? spec.channels.email;
  }
}
