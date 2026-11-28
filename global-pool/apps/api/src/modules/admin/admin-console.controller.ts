import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  adminAlertAckSchema,
  adminApprovalDecisionSchema,
  adminApprovalWithdrawSchema,
  adminApprovalsQuerySchema,
  adminPiiRevealSchema,
  adminRoleChangeSchema,
  adminUserTransactionsQuerySchema,
} from '@gp/shared/schemas';
import { z } from 'zod';

import { CurrentAdmin, ReqMeta, type AuthAdmin, type RequestMeta } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { AdminConsoleService } from './admin-console.service';
import { AdminAuth, RequirePermissions } from './admin.guards';
import { FourEyesService } from './four-eyes.service';

class ApprovalsQueryDto extends createZodDto(adminApprovalsQuerySchema) {}
class ApprovalDecisionDto extends createZodDto(adminApprovalDecisionSchema) {}
class ApprovalWithdrawDto extends createZodDto(adminApprovalWithdrawSchema) {}
class PiiRevealDto extends createZodDto(adminPiiRevealSchema) {}
class RoleChangeDto extends createZodDto(adminRoleChangeSchema) {}
class UserTxQueryDto extends createZodDto(adminUserTransactionsQuerySchema) {}
class AlertAckDto extends createZodDto(adminAlertAckSchema) {}
class AlertKeyDto extends createZodDto(
  z.object({ key: z.string().regex(/^[a-z0-9_.-]{3,80}$/, { error: 'Unknown alert key' }) }),
) {}
class RoleKeyDto extends createZodDto(
  z.object({ key: z.string().regex(/^[a-z_]{3,40}$/, { error: 'Unknown role' }) }),
) {}

/**
 * Admin console (admin-a): four-eyes inbox and decisions (ADM-X1, ADM-00 approvals), user-management tabs
 * (ADM-U1…U10), roles / permissions matrix (ADM-S1/S2), system health and live alerts (ADM-02, MOB-11).
 * Every write is a reviewed, audited workflow action; nothing here can alter results, winners, payouts, ledger rows
 * or balances.
 */
@ApiTags('admin · console')
@AdminAuth()
@Controller('admin')
export class AdminConsoleController {
  constructor(
    private readonly console: AdminConsoleService,
    private readonly fourEyes: FourEyesService,
  ) {}

  // ── four-eyes ────────────────────────────────────────────────────────────────────────────────

  @Get('approvals/inbox')
  @RequirePermissions('dashboard.read')
  @ApiOperation({
    summary:
      'Four-eyes inbox: open / waiting for me / created by me / decided today / expired, with your role per request',
  })
  approvalsInbox(@CurrentAdmin() admin: AuthAdmin, @Query() query: ApprovalsQueryDto) {
    return this.fourEyes.inbox(admin, query.view ?? 'open');
  }

  @Get('approvals/:id')
  @RequirePermissions('dashboard.read')
  @ApiOperation({ summary: 'One four-eyes request with eligible approvers and its audit trail' })
  approval(@CurrentAdmin() admin: AuthAdmin, @Param('id', ParseUUIDPipe) id: string) {
    return this.fourEyes.detail(admin, id);
  }

  @Post('approvals/:id/approve')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Second approver: approve a request (different admin, own reason + fresh MFA); the requested action runs in the same transaction',
  })
  approve(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ApprovalDecisionDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.fourEyes.approve(admin, id, body, meta);
  }

  @Post('approvals/:id/reject')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Second approver: reject a request (reason + MFA). Nothing changes (a flagged withdrawal is rejected and its funds return to Available).',
  })
  reject(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ApprovalDecisionDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.fourEyes.reject(admin, id, body, meta);
  }

  @Post('approvals/:id/withdraw')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Requester withdraws their own pending request (reason; audited; nothing changes)',
  })
  withdraw(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ApprovalWithdrawDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.fourEyes.withdraw(admin, id, body, meta);
  }

  // ── users ────────────────────────────────────────────────────────────────────────────────────

  @Get('user-stats')
  @RequirePermissions('users.read')
  @ApiOperation({
    summary: 'User KPIs for the users list (totals, active 30 d, KYC verified, restricted)',
  })
  userStats() {
    return this.console.userStats();
  }

  @Get('users/:id/account')
  @RequirePermissions('users.read')
  @ApiOperation({
    summary: 'Account details: masked PII, consents (read-only), security, devices & sessions',
  })
  userAccount(@CurrentAdmin() admin: AuthAdmin, @Param('id', ParseUUIDPipe) id: string) {
    return this.console.userAccount(admin, id);
  }

  @Post('users/:id/pii/reveal')
  @HttpCode(200)
  @RequirePermissions('users.read', 'users.pii.read')
  @ApiOperation({
    summary: 'Reveal ONE personal-data field (reason required; audit-logged; read-only)',
  })
  revealPii(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PiiRevealDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.console.revealPii(admin, id, body, meta);
  }

  @Get('users/:id/wallets')
  @RequirePermissions('users.read')
  @ApiOperation({
    summary:
      'Linked wallets, whitelist and deposit addresses (read-only: admins cannot add or redirect addresses)',
  })
  userWallets(@Param('id', ParseUUIDPipe) id: string) {
    return this.console.userWallets(id);
  }

  @Get('users/:id/kyc')
  @RequirePermissions('users.read', 'kyc.read')
  @ApiOperation({ summary: 'KYC level, records and limits by level' })
  userKyc(@Param('id', ParseUUIDPipe) id: string) {
    return this.console.userKyc(id);
  }

  @Get('users/:id/aml')
  @RequirePermissions('users.read', 'aml.read')
  @ApiOperation({
    summary: 'AML alerts and the rule-based risk score with its breakdown (read-only, no override)',
  })
  userAml(@Param('id', ParseUUIDPipe) id: string) {
    return this.console.userAml(id);
  }

  @Get('users/:id/transactions')
  @RequirePermissions('users.read')
  @ApiOperation({
    summary: 'Transaction history (paginated) + lifetime flows + ledger balances (read-only)',
  })
  userTransactions(@Param('id', ParseUUIDPipe) id: string, @Query() query: UserTxQueryDto) {
    return this.console.userTransactions(id, query);
  }

  @Get('users/:id/responsible-gaming')
  @RequirePermissions('users.read', 'rg.read')
  @ApiOperation({
    summary: 'Player-set RG limits, usage, self-exclusion history (admins cannot loosen limits)',
  })
  userRg(@Param('id', ParseUUIDPipe) id: string) {
    return this.console.userResponsibleGaming(id);
  }

  // ── system ───────────────────────────────────────────────────────────────────────────────────

  @Get('roles')
  @RequirePermissions('system.read')
  @ApiOperation({
    summary: 'Admin roles with their permissions, members and pending (four-eyes) changes',
  })
  roles() {
    return this.console.roles();
  }

  @Get('permissions')
  @RequirePermissions('system.read')
  @ApiOperation({ summary: 'Permission catalogue with its policy (reason / MFA / four-eyes)' })
  permissions() {
    return this.console.permissions();
  }

  @Post('roles/:key/change-requests')
  @HttpCode(202)
  @RequirePermissions('admins.manage')
  @ApiOperation({
    summary:
      'REQUEST a role-permission change (reason + MFA); applied only after a second admin approves',
  })
  requestRoleChange(
    @CurrentAdmin() admin: AuthAdmin,
    @Param() params: RoleKeyDto,
    @Body() body: RoleChangeDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.console.requestRoleChange(admin, params.key, body, meta);
  }

  @Get('system/health')
  @RequirePermissions('dashboard.read')
  @ApiOperation({
    summary:
      'System health: DB, Redis, queues, randomness, chains, kill switches, ledger invariants',
  })
  systemHealth() {
    return this.console.systemHealth();
  }

  @Get('alerts')
  @RequirePermissions('dashboard.read')
  @ApiOperation({
    summary: 'Live operational / compliance alerts computed from real state (role-filtered)',
  })
  alerts(@CurrentAdmin() admin: AuthAdmin) {
    return this.console.alerts(admin);
  }

  @Post('alerts/:key/ack')
  @HttpCode(200)
  @RequirePermissions('dashboard.read')
  @ApiOperation({ summary: 'Acknowledge an alert (audit-logged; changes nothing else)' })
  ackAlert(
    @CurrentAdmin() admin: AuthAdmin,
    @Param() params: AlertKeyDto,
    @Body() body: AlertAckDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.console.acknowledgeAlert(admin, params.key, body.note, meta);
  }
}
