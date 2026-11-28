import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { WITHDRAWAL_STATUSES } from '@gp/shared/enums';
import {
  adminLoginSchema,
  adminRestrictionApplySchema,
  adminRestrictionLiftSchema,
  adminUsersQuerySchema,
  paginationQuerySchema,
  totpCodeSchema,
} from '@gp/shared/schemas';
import { z } from 'zod';

import { CurrentAdmin, ReqMeta, type AuthAdmin, type RequestMeta } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { AuditService } from '../audit/audit.service';
import { AmlService } from '../aml/aml.service';
import { AffiliatesService } from '../affiliates/affiliates.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { LedgerService } from '../ledger/ledger.service';
import { RoundsService } from '../pool/rounds.service';
import { ReportingService } from '../reporting/reporting.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminSecurityService } from './admin-security.service';
import { AdminAuth, RequirePermissions } from './admin.guards';
import { AdminService } from './admin.service';

const sensitive = z.object({
  reason: z
    .string()
    .trim()
    .min(5, { error: 'A written reason (min. 5 characters) is required' })
    .max(500),
  mfaCode: totpCodeSchema,
});
class LoginDto extends createZodDto(adminLoginSchema) {}
class RefreshDto extends createZodDto(z.object({ refreshToken: z.string().min(20).max(200) })) {}
class SensitiveDto extends createZodDto(sensitive) {}
/** Restriction apply: withdrawal holds / suspensions become a four-eyes REQUEST (RESTRICTION_REQUIRES_FOUR_EYES). */
class RestrictionDto extends createZodDto(adminRestrictionApplySchema) {}
class RestrictionLiftDto extends createZodDto(adminRestrictionLiftSchema) {}
class AmlResolveDto extends createZodDto(
  sensitive.extend({ resolution: z.enum(['resolved', 'dismissed', 'escalated']) }),
) {}
class UsersQueryDto extends createZodDto(adminUsersQuerySchema) {}
class WithdrawalQueueDto extends createZodDto(
  paginationQuerySchema.extend({ status: z.enum(WITHDRAWAL_STATUSES).optional() }),
) {}
class AuditQueryDto extends createZodDto(
  paginationQuerySchema.extend({
    action: z.string().max(80).optional(),
    actorId: z.string().max(64).optional(),
    targetType: z.string().max(40).optional(),
    targetId: z.string().max(64).optional(),
  }),
) {}
class AmlQueryDto extends createZodDto(
  paginationQuerySchema.extend({
    status: z.enum(['open', 'under_review', 'resolved', 'dismissed', 'escalated']).optional(),
  }),
) {}
class PaginationDto extends createZodDto(paginationQuerySchema) {}

/** Per-IP limit on admin login / refresh attempts (env ADMIN_LOGIN_THROTTLE_LIMIT, default 10 per minute). */
const loginLimit = () => Number(process.env.ADMIN_LOGIN_THROTTLE_LIMIT ?? 10);

@ApiTags('admin · auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: loginLimit, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Admin login: email + password (argon2id) + MANDATORY TOTP; lockout after repeated failures',
  })
  login(@Body() body: LoginDto, @ReqMeta() meta: RequestMeta) {
    return this.auth.login(body, meta);
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: () => loginLimit() * 3, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Rotate the refresh token (reuse of an old one revokes the whole session family)',
  })
  refresh(@Body() body: RefreshDto, @ReqMeta() meta: RequestMeta) {
    return this.auth.refresh(body.refreshToken, meta);
  }

  @Post('logout')
  @HttpCode(200)
  @AdminAuth()
  logout(@CurrentAdmin() admin: AuthAdmin) {
    return this.auth.logout(admin);
  }

  @Get('me')
  @AdminAuth()
  me(@CurrentAdmin() admin: AuthAdmin) {
    return this.auth.profile(admin.id);
  }
}

@ApiTags('admin')
@AdminAuth()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly reporting: ReportingService,
    private readonly audit: AuditService,
    private readonly ledger: LedgerService,
    private readonly rounds: RoundsService,
    private readonly aml: AmlService,
    private readonly security: AdminSecurityService,
    private readonly flags: FeatureFlagsService,
    private readonly affiliates: AffiliatesService,
  ) {}

  @Get('dashboard')
  @RequirePermissions('dashboard.read')
  @ApiOperation({ summary: 'KPIs (30 d) computed from the ledger + reconciliation status' })
  dashboard() {
    return this.reporting.kpis();
  }

  @Get('users')
  @RequirePermissions('users.read')
  users(@Query() query: UsersQueryDto) {
    return this.admin.listUsers(query);
  }

  @Get('users/:id')
  @RequirePermissions('users.read')
  user(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.userDetail(id);
  }

  @Post('users/:id/restrictions')
  @HttpCode(201)
  @RequirePermissions('users.restrict')
  @ApiOperation({
    summary:
      'Apply a restriction (reason + MFA re-auth; audited). Withdrawal holds and suspensions need four eyes → returns a pending request',
  })
  restrict(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RestrictionDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.admin.applyRestriction(admin, id, body, meta);
  }

  @Post('users/:id/restrictions/:restrictionId/lift')
  @HttpCode(200)
  @RequirePermissions('users.restrict')
  @ApiOperation({ summary: 'Lift a restriction (reason + MFA re-auth; audited)' })
  lift(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('restrictionId', ParseUUIDPipe) restrictionId: string,
    @Body() body: RestrictionLiftDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.admin.liftRestriction(admin, id, restrictionId, body, meta);
  }

  @Get('withdrawals')
  @RequirePermissions('withdrawals.read')
  @ApiOperation({
    summary: 'Withdrawal queue (default: open states) with four-eyes approval progress',
  })
  withdrawals(@Query() query: WithdrawalQueueDto) {
    return this.admin.withdrawalQueue(query);
  }

  @Post('withdrawals/:id/approve')
  @HttpCode(200)
  @RequirePermissions('withdrawals.approve')
  @ApiOperation({
    summary:
      'Approve an under-review withdrawal (reason + MFA; flagged → second, different admin required)',
  })
  approve(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SensitiveDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.admin.approveWithdrawal(admin, id, body, meta);
  }

  @Post('withdrawals/:id/reject')
  @HttpCode(200)
  @RequirePermissions('withdrawals.reject')
  @ApiOperation({
    summary: 'Reject a withdrawal (reason + MFA; funds return to the player’s Available; audited)',
  })
  reject(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SensitiveDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.admin.rejectWithdrawal(admin, id, body, meta);
  }

  @Get('approvals')
  @RequirePermissions('withdrawals.read')
  @ApiOperation({ summary: 'Four-eyes approvals awaiting a second admin' })
  approvals() {
    return this.admin.approvals('pending');
  }

  @Get('audit-logs')
  @RequirePermissions('audit.read')
  @ApiOperation({ summary: 'Hash-chained audit log (newest first)' })
  auditLogs(@Query() query: AuditQueryDto) {
    return this.admin.auditLogs(query);
  }

  @Get('audit-logs/verify')
  @RequirePermissions('audit.read')
  @ApiOperation({ summary: 'Recompute the audit hash chain end-to-end' })
  verifyAudit() {
    return this.audit.verify();
  }

  @Get('ledger/reconciliation')
  @RequirePermissions('reconciliation.read')
  @ApiOperation({
    summary: 'Ledger invariants: total = 0, every posting balanced, pool accounts = projections',
  })
  reconciliation() {
    return this.ledger.reconcile();
  }

  @Get('ledger/balances')
  @RequirePermissions('ledger.read')
  @ApiOperation({
    summary: 'Balance per ledger account type (read-only — ledger rows can never be edited)',
  })
  ledgerBalances() {
    return this.ledger.balancesByType();
  }

  @Get('rounds')
  @RequirePermissions('rounds.read')
  @ApiOperation({ summary: 'Rounds (read-only — results come only from verifiable randomness)' })
  roundList(@Query() query: PaginationDto) {
    return this.rounds.history(query);
  }

  @Get('rounds/:number')
  @RequirePermissions('rounds.read')
  async round(@Param('number', ParseIntPipe) number: number) {
    return this.rounds.view(await this.rounds.byNumber(number));
  }

  @Get('aml/alerts')
  @RequirePermissions('aml.read')
  amlAlerts(@Query() query: AmlQueryDto) {
    return this.aml.list(query);
  }

  @Post('aml/alerts/:id/resolve')
  @HttpCode(200)
  @RequirePermissions('aml.resolve')
  @ApiOperation({ summary: 'Resolve / dismiss / escalate an AML alert (reason + MFA; audited)' })
  async resolveAml(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AmlResolveDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    await this.security.assertSensitive(admin, 'aml.resolve', body);
    const alert = await this.aml.resolve(id, admin.id, body.resolution, body.reason);
    await this.audit.record({
      actorType: 'admin',
      actorId: admin.id,
      actorLabel: admin.name,
      action: 'aml.alert.resolved',
      targetType: 'aml_alert',
      targetId: id,
      reason: body.reason,
      ip: meta.ip,
      requestId: meta.requestId,
      metadata: { resolution: body.resolution },
    });
    return { id: alert.id, status: alert.status };
  }

  @Get('feature-flags')
  @RequirePermissions('system.read')
  featureFlags() {
    return this.flags.list();
  }

  @Get('affiliates')
  @RequirePermissions('affiliates.read')
  @ApiOperation({ summary: 'Affiliates (STUB)' })
  affiliateList() {
    return this.affiliates.listAffiliates();
  }
}
