import { Injectable } from '@nestjs/common';
import { PERMISSION_POLICY, type Permission } from '@gp/shared/enums';

import { AppError } from '../../common/errors';
import type { AuthAdmin } from '../../common/request';
import { TotpService } from '../security/totp.service';

/**
 * Sensitive admin actions: RBAC permission (guard) + written reason + fresh MFA re-auth (TOTP, replay-protected)
 * according to PERMISSION_POLICY. Four-eyes is enforced by the action's own service (e.g. withdrawals).
 */
@Injectable()
export class AdminSecurityService {
  constructor(private readonly totp: TotpService) {}

  async assertSensitive(
    admin: AuthAdmin,
    permission: Permission,
    input: { reason?: string; mfaCode?: string },
  ) {
    if (!admin.permissions.includes(permission)) {
      throw new AppError('FORBIDDEN', 'Your role does not allow this action', {
        missingPermissions: [permission],
      });
    }
    const policy = PERMISSION_POLICY[permission];
    if (policy.requiresReason && (!input.reason || input.reason.trim().length < 5)) {
      throw new AppError('VALIDATION_FAILED', 'A written reason (min. 5 characters) is required', {
        field: 'reason',
      });
    }
    if (policy.requiresMfa) {
      if (!input.mfaCode) {
        throw new AppError('STEP_UP_REQUIRED', 'Confirm with your authenticator code', {
          reason: 'mfa_required',
        });
      }
      await this.totp.verifyActive({ adminUserId: admin.id }, input.mfaCode, {
        allowBackup: false,
      });
    }
    return policy;
  }
}
