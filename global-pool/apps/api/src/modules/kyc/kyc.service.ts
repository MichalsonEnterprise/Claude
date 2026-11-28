import { Injectable } from '@nestjs/common';
import { KYC_LEVEL_LABEL, KYC_LEVEL_RANK, type KycLevel } from '@gp/shared/enums';
import { DAILY_WITHDRAWAL_LIMIT } from '@gp/shared/limits';

import { AppError } from '../../common/errors';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MockKycProvider, type KycProvider } from './kyc.provider';

@Injectable()
export class KycService {
  private readonly provider: KycProvider = new MockKycProvider();

  constructor(private readonly prisma: PrismaService) {}

  async status(userId: string) {
    const [profile, records] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId }, select: { kycLevel: true } }),
      this.prisma.kycRecord.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);
    const level = profile?.kycLevel ?? 'none';
    return {
      level,
      label: KYC_LEVEL_LABEL[level],
      status: records[0]?.status ?? 'not_started',
      dailyWithdrawalLimit: DAILY_WITHDRAWAL_LIMIT[level],
      provider: this.provider.name,
      records: records.map((r) => ({
        id: r.id,
        level: r.level,
        status: r.status,
        provider: r.provider,
        submittedAt: r.submittedAt?.toISOString() ?? null,
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
        rejectionReason: r.rejectionReason,
      })),
    };
  }

  async start(userId: string, level: Exclude<KycLevel, 'none'>) {
    const current =
      (await this.prisma.userProfile.findUnique({ where: { userId } }))?.kycLevel ?? 'none';
    if (KYC_LEVEL_RANK[current] >= KYC_LEVEL_RANK[level]) {
      throw new AppError('CONFLICT', `You are already verified at ${KYC_LEVEL_LABEL[current]}`);
    }
    const session = await this.provider.startVerification({ userId, level });
    const record = await this.prisma.kycRecord.create({
      data: {
        userId,
        level,
        status: 'pending',
        provider: session.provider,
        providerRef: session.providerRef,
        submittedAt: new Date(),
      },
    });
    return {
      recordId: record.id,
      status: record.status,
      level,
      redirectUrl: session.redirectUrl,
      provider: session.provider,
    };
  }

  /** Mock provider callback / DEMO approval: mark the latest pending record verified and raise the level. */
  async approve(userId: string, level: Exclude<KycLevel, 'none'>, isDemo = true) {
    const now = new Date();
    await this.prisma.tx(async (tx) => {
      const pending = await tx.kycRecord.findFirst({
        where: { userId, level, status: { in: ['pending', 'in_review'] } },
        orderBy: { createdAt: 'desc' },
      });
      if (pending) {
        await tx.kycRecord.update({
          where: { id: pending.id },
          data: { status: 'verified', reviewedAt: now },
        });
      } else {
        await tx.kycRecord.create({
          data: {
            userId,
            level,
            status: 'verified',
            provider: this.provider.name,
            submittedAt: now,
            reviewedAt: now,
            isDemo,
          },
        });
      }
      await tx.userProfile.update({ where: { userId }, data: { kycLevel: level } });
    });
    return this.status(userId);
  }
}
