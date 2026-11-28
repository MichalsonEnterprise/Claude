import { Body, Controller, Get, HttpCode, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  loginHistoryQuerySchema,
  notificationPreferencesUpdateSchema,
  profileUpdateSchema,
  sessionsQuerySchema,
} from '@gp/shared/schemas';

import { CurrentUser, type AuthUser } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { AuditService } from '../audit/audit.service';
import { PlayerAuth, PlayerPolicy } from '../auth/guards';
import { AccountService } from './account.service';

class ProfileUpdateDto extends createZodDto(profileUpdateSchema) {}
class NotificationPrefsDto extends createZodDto(notificationPreferencesUpdateSchema) {}
class LoginHistoryQueryDto extends createZodDto(loginHistoryQuerySchema) {}
class SessionsQueryDto extends createZodDto(sessionsQuerySchema) {}

/**
 * Account & security (USR-A1…A10). Additive to UsersController (same `/me` prefix). Ending sessions is a
 * protective action and never asks for a 2FA code; changing security settings goes through the 2FA routes.
 */
@ApiTags('users')
@PlayerAuth({ onboarded: false })
@Controller('me')
export class AccountController {
  constructor(
    private readonly account: AccountService,
    private readonly audit: AuditService,
  ) {}

  @Get('preferences')
  @ApiOperation({
    summary: 'Language, time zone, notification channels (locked categories resolved)',
  })
  preferences(@CurrentUser() user: AuthUser) {
    return this.account.preferences(user.id);
  }

  @Patch('profile')
  @PlayerPolicy({ onboarded: true })
  @ApiOperation({
    summary: 'A1: update display name, language and time zone (verified identity is locked)',
  })
  async updateProfile(@CurrentUser() user: AuthUser, @Body() body: ProfileUpdateDto) {
    const result = await this.account.updateProfile(user.id, body);
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      actorLabel: user.handle,
      action: 'user.profile.updated',
      targetType: 'user',
      targetId: user.id,
      metadata: { fields: Object.keys(body) },
    });
    return result;
  }

  @Put('notification-preferences')
  @PlayerPolicy({ onboarded: true })
  @ApiOperation({
    summary:
      'A9: notification channels per category — security and RG messages stay on; marketing is opt-in only',
  })
  async updateNotifications(@CurrentUser() user: AuthUser, @Body() body: NotificationPrefsDto) {
    const result = await this.account.updateNotifications(user.id, body);
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      actorLabel: user.handle,
      action: 'user.notification_prefs.updated',
      targetType: 'user',
      targetId: user.id,
      metadata: { marketingOptIn: result.marketingOptIn },
    });
    return result;
  }

  @Get('devices')
  @ApiOperation({
    summary:
      'A7/A8: sessions as devices (masked IP, method, status) — ?include=all adds sessions ended in the last 90 days',
  })
  sessions(@CurrentUser() user: AuthUser, @Query() query: SessionsQueryDto) {
    return this.account.sessions(user, query.include);
  }

  @Post('sessions/revoke-others')
  @HttpCode(200)
  @ApiOperation({ summary: 'A8: end every other session (protective — no 2FA code needed)' })
  async revokeOthers(@CurrentUser() user: AuthUser) {
    const result = await this.account.revokeOtherSessions(user);
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      actorLabel: user.handle,
      action: 'user.sessions.revoked_others',
      targetType: 'user',
      targetId: user.id,
      metadata: { revoked: result.revoked },
    });
    return result;
  }

  @Get('login-history')
  @ApiOperation({
    summary: 'A6: sign-ins (one per Privy session), flagged / ended filters, counts',
  })
  loginHistory(@CurrentUser() user: AuthUser, @Query() query: LoginHistoryQueryDto) {
    return this.account.loginHistory(user, query);
  }

  @Get('security')
  @ApiOperation({
    summary: 'A2: security score from active protections + your own recent security events',
  })
  security(@CurrentUser() user: AuthUser) {
    return this.account.securityOverview(user);
  }
}
