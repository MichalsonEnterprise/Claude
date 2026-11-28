import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { paginate, type PaginationQuery } from '@gp/shared/schemas';

import { notFound } from '../../common/errors';
import { PrismaService, type Db } from '../../infra/prisma/prisma.service';

export type NotificationType =
  | 'deposit.detected'
  | 'deposit.credited'
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
  | 'account.restriction';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  notify(
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
    return db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ?? {},
        isDemo: input.isDemo ?? false,
      },
    });
  }

  async list(userId: string, query: PaginationQuery & { unread?: boolean }) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.unread ? { readAt: null } : {}),
    };
    const [rows, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return {
      ...paginate(
        rows.map((n) => ({
          id: n.id,
          type: n.type,
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
    };
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
