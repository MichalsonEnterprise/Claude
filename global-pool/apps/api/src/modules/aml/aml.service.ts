import { Injectable } from '@nestjs/common';
import type { AmlAlertStatus, Prisma } from '@prisma/client';
import { paginate, type PaginationQuery } from '@gp/shared/schemas';

import { notFound } from '../../common/errors';
import { PrismaService, type Db } from '../../infra/prisma/prisma.service';
import {
  MockAmlProvider,
  type AmlProvider,
  type AmlScreeningInput,
  type AmlScreeningResult,
} from './aml.provider';

@Injectable()
export class AmlService {
  private readonly provider: AmlProvider = new MockAmlProvider();

  constructor(private readonly prisma: PrismaService) {}

  get providerName() {
    return this.provider.name;
  }

  /** Read-only screening preview (withdrawal pre-check before 2FA): no alert is written. */
  previewWithdrawal(input: AmlScreeningInput): Promise<AmlScreeningResult> {
    return this.provider.screenWithdrawal(input);
  }

  async screenWithdrawal(
    db: Db,
    input: AmlScreeningInput & { withdrawalId: string },
  ): Promise<AmlScreeningResult> {
    const started = performance.now();
    const result = await this.provider.screenWithdrawal(input);
    if (result.riskLevel !== 'low') {
      await db.amlAlert.create({
        data: {
          userId: input.userId,
          withdrawalId: input.withdrawalId,
          riskLevel: result.riskLevel,
          rule: result.flags.join(',') || 'manual_review',
          status: result.decision === 'reject' ? 'resolved' : 'open',
          resolution: result.decision === 'reject' ? 'auto_rejected' : null,
          resolvedAt: result.decision === 'reject' ? new Date() : null,
          details: {
            provider: result.provider,
            decision: result.decision,
            reason: result.reason,
            checks: result.checks as unknown as Prisma.InputJsonArray,
            durationMs: Math.round(performance.now() - started),
          },
        },
      });
    }
    return result;
  }

  async list(query: PaginationQuery & { status?: AmlAlertStatus }) {
    const where: Prisma.AmlAlertWhereInput = query.status ? { status: query.status } : {};
    const [rows, total] = await Promise.all([
      this.prisma.amlAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          user: { select: { publicId: true, handle: true } },
          withdrawal: { select: { number: true } },
        },
      }),
      this.prisma.amlAlert.count({ where }),
    ]);
    return paginate(
      rows.map((a) => ({
        id: a.id,
        riskLevel: a.riskLevel,
        rule: a.rule,
        status: a.status,
        user: a.user ? { publicId: a.user.publicId, handle: a.user.handle } : null,
        withdrawal: a.withdrawal ? `WD-${a.withdrawal.number}` : null,
        details: a.details,
        resolution: a.resolution,
        createdAt: a.createdAt.toISOString(),
        isDemo: a.isDemo,
      })),
      total,
      query,
    );
  }

  async resolve(
    id: string,
    adminId: string,
    resolution: 'resolved' | 'dismissed' | 'escalated',
    note: string,
    db: Db = this.prisma,
  ) {
    const alert = await db.amlAlert.findUnique({ where: { id } });
    if (!alert) throw notFound('AML alert');
    return db.amlAlert.update({
      where: { id },
      data: {
        status: resolution,
        resolution: note,
        resolvedAt: new Date(),
        resolvedByAdminId: adminId,
      },
    });
  }
}
