import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../config/app-config';
import { PrismaService } from '../../infra/prisma/prisma.service';

/** Referral / affiliate STUB: read-only stats; commission accrual & payouts are a later batch. */
@Injectable()
export class AffiliatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  async myReferrals(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { handle: true, publicId: true } });
    const code = (user.handle ?? user.publicId).replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 10);
    const [signUps, qualified] = await Promise.all([
      this.prisma.referral.count({ where: { referrerUserId: userId } }),
      this.prisma.referral.count({ where: { referrerUserId: userId, qualifiedAt: { not: null } } }),
    ]);
    return {
      code,
      link: `${this.config.env.APP_URL}/r/${code}`,
      program: { commissionPercentOfPlatformFee: '20', durationMonths: 12, minimumPayout: '20.00' },
      stats: { signUps, qualified, earned: '0.00', available: '0.00', pending: '0.00' },
      stub: true,
    };
  }

  async listAffiliates() {
    const rows = await this.prisma.affiliate.findMany({ orderBy: { code: 'asc' } });
    return rows.map((a) => ({ id: a.id, code: a.code, name: a.name, plan: a.plan, status: a.status, isDemo: a.isDemo }));
  }
}
