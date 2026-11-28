import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Onboarding } from '@gp/shared/schemas';
import type { Request } from 'express';

import { AppError } from '../../common/errors';
import type { AuthUser } from '../../common/request';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GeoService } from '../compliance/geo.service';

/** Versions of the legal documents accepted during onboarding (placeholder DEMO documents). */
export const TERMS_VERSION = '2026-11-demo';
export const PRIVACY_VERSION = '2026-11-demo';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly audit: AuditService,
  ) {}

  /**
   * First-login onboarding: explicit consents (18+, permitted jurisdiction, terms, privacy — never pre-checked;
   * marketing separate) + country of residence + public handle. Required before any gaming or financial action.
   */
  async onboard(user: AuthUser, input: Onboarding, req: Request): Promise<void> {
    if (user.onboarded) throw new AppError('CONFLICT', 'Onboarding is already complete');
    if (!(await this.geo.isPermitted(input.country))) {
      throw new AppError(
        'GEO_RESTRICTED',
        'GLOBAL POOL is not available in your country of residence',
        {
          country: input.country,
        },
      );
    }
    const region = await this.geo.checkRequest(req);
    if (!region.permitted) {
      throw new AppError('GEO_RESTRICTED', 'GLOBAL POOL is not available in your region', {
        country: region.country,
      });
    }
    const now = new Date();
    try {
      await this.prisma.tx(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { handle: input.handle, onboardedAt: now },
        });
        await tx.userProfile.update({
          where: { userId: user.id },
          data: {
            country: input.country,
            dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00Z`) : null,
            ageConfirmedAt: now,
            jurisdictionConfirmedAt: now,
            termsAcceptedAt: now,
            termsVersion: TERMS_VERSION,
            privacyAcceptedAt: now,
            privacyVersion: PRIVACY_VERSION,
            marketingOptIn: input.consents.marketingOptIn,
            marketingOptInAt: input.consents.marketingOptIn ? now : null,
          },
        });
        await this.audit.record(
          {
            actorType: 'user',
            actorId: user.id,
            actorLabel: input.handle,
            action: 'user.onboarding.completed',
            targetType: 'user',
            targetId: user.id,
            metadata: {
              country: input.country,
              termsVersion: TERMS_VERSION,
              privacyVersion: PRIVACY_VERSION,
              consents: input.consents,
            },
          },
          tx,
        );
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError('CONFLICT', 'This handle is already taken', { field: 'handle' });
      }
      throw err;
    }
  }
}
