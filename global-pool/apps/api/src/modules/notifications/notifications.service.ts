import { Injectable, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { paginate, type PaginationQuery } from '@gp/shared/schemas';

import { notFound } from '../../common/errors';
import { PrismaService, type Db } from '../../infra/prisma/prisma.service';
import { EmailService } from '../email/email.service';

export type NotificationType =
  | 'deposit.detected'
  | 'deposit.credited'
  | 'deposit.held'
  | 'deposit.reversed'
  | 'withdrawal.requested'
  | 'withdrawal.under_review'
  | 'withdrawal.queued'
  | 'withdrawal.confirmed'
  | 'withdrawal.rejected'
  | 'withdrawal.failed'
  | 'round.entries_confirmed'
  | 'round.settled'
  | 'round.prize_won'
  | 'round.cancelled'
  | 'security.2fa'
  | 'kyc.submitted'
  | 'kyc.approved'
  | 'kyc.resubmission_required'
  | 'account.restriction';

export const NOTIFICATION_CATEGORY_FILTERS = [
  'security',
  'transactions',
  'rounds',
  'promotions',
  'account',
] as const;
export type NotificationCategoryFilter = (typeof NOTIFICATION_CATEGORY_FILTERS)[number];

const CATEGORY_PREFIXES: Record<NotificationCategoryFilter, string[]> = {
  security: ['security.'],
  transactions: ['deposit.', 'withdrawal.'],
  rounds: ['round.'],
  promotions: ['promo.', 'vip.', 'reward.'],
  account: ['account.', 'kyc.'],
};

/** Category of a notification type (prefix before the first dot). */
export function categoryOf(type: string): NotificationCategoryFilter {
  for (const [cat, prefixes] of Object.entries(CATEGORY_PREFIXES) as [
    NotificationCategoryFilter,
    string[],
  ][]) {
    if (prefixes.some((p) => type.startsWith(p))) return cat;
  }
  return 'account';
}

function categoryWhere(category: NotificationCategoryFilter): Prisma.NotificationWhereInput {
  return { OR: CATEGORY_PREFIXES[category].map((p) => ({ type: { startsWith: p } })) };
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly email?: EmailService,
  ) {}

  /** In-app notification (inside the caller's DB transaction) + queued email for email-worthy types. */
  async notify(
    db: Db,
    input: {
      userId: string;
      type: NotificationType;
      title: string;
      body: string;
      data?: Prisma.InputJsonObject;
      isDemo?: boolean;
    },
  ) {
    const row = await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ?? {},
        isDemo: input.isDemo ?? false,
      },
    });
    // Never blocks or fails the business transaction; the worker retries until the row is committed.
    void this.email?.enqueueForNotification(row.id, row.type);
    return row;
  }

  async list(
    userId: string,
    query: PaginationQuery & { unread?: boolean; category?: NotificationCategoryFilter },
  ) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.unread ? { readAt: null } : {}),
      ...(query.category ? categoryWhere(query.category) : {}),
    };
    const [rows, total, unread, counts] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
      this.categoryCounts(userId),
    ]);
    return {
      ...paginate(
        rows.map((n) => ({
          id: n.id,
          type: n.type,
          category: categoryOf(n.type),
          title: n.title,
          body: n.body,
          data: n.data,
          read: n.readAt !== null,
          createdAt: n.createdAt.toISOString(),
          isDemo: n.isDemo,
        })),
        total,
        query,
      ),
      unread,
      counts,
    };
  }

  /** Per-category totals for the USR-02 filter chips (All / Unread / Security / Transactions / Rounds / Promotions). */
  private async categoryCounts(userId: string) {
    const rows = await this.prisma.notification.groupBy({
      by: ['type'],
      where: { userId },
      _count: { _all: true },
    });
    const counts: Record<NotificationCategoryFilter | 'all', number> = {
      all: 0,
      security: 0,
      transactions: 0,
      rounds: 0,
      promotions: 0,
      account: 0,
    };
    for (const r of rows) {
      counts.all += r._count._all;
      counts[categoryOf(r.type)] += r._count._all;
    }
    return counts;
  }

  async markRead(userId: string, id: string) {
    const res = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (res.count === 0 && !(await this.prisma.notification.findFirst({ where: { id, userId } }))) {
      throw notFound('Notification');
    }
    return { read: true };
  }

  async markAllRead(userId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: res.count };
  }
}
