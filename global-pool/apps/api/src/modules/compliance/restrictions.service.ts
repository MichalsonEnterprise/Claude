import { Injectable } from '@nestjs/common';
import type { RestrictionType } from '@prisma/client';

import { PrismaService, type Db } from '../../infra/prisma/prisma.service';

/** Admin-applied account restrictions (applied / lifted with reason + MFA; always audited). */
@Injectable()
export class RestrictionsService {
  constructor(private readonly prisma: PrismaService) {}

  async active(userId: string, db: Db = this.prisma): Promise<RestrictionType[]> {
    const rows = await db.userRestriction.findMany({
      where: { userId, liftedAt: null },
      select: { type: true },
    });
    return [...new Set(rows.map((r) => r.type))];
  }
}
