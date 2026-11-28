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
import { ROUND_STATUSES } from '@gp/shared/enums';
import {
  adminAmlQuerySchema,
  adminDepositsQuerySchema,
  adminExportRequestSchema,
  adminKycQuerySchema,
  adminLedgerQuerySchema,
  adminParticipantsQuerySchema,
  adminReasonSchema,
  adminWithdrawalsQuerySchema,
  circuitBreakerDecisionSchema,
  circuitBreakerRequestSchema,
  kycDecisionSchema,
  paginationQuerySchema,
} from '@gp/shared/schemas';
import { z } from 'zod';

import { CurrentAdmin, ReqMeta, type AuthAdmin, type RequestMeta } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { AdminAuth, RequirePermissions } from '../admin/admin.guards';
import { AdminComplianceService } from './admin-compliance.service';
import { AdminExportsService } from './admin-exports.service';
import { AdminFinanceService } from './admin-finance.service';
import { AdminPoolService } from './admin-pool.service';

class DepositsQueryDto extends createZodDto(adminDepositsQuerySchema) {}
class WithdrawalsQueryDto extends createZodDto(adminWithdrawalsQuerySchema) {}
class LedgerQueryDto extends createZodDto(adminLedgerQuerySchema) {}
class ExportDto extends createZodDto(adminExportRequestSchema) {}
class RevenueQueryDto extends createZodDto(
  z.object({ days: z.coerce.number().int().min(1).max(366).default(30) }),
) {}
class PageDto extends createZodDto(paginationQuerySchema) {}
class RoundsQueryDto extends createZodDto(
  paginationQuerySchema.extend({ status: z.enum(ROUND_STATUSES).optional() }),
) {}
class ParticipantsQueryDto extends createZodDto(adminParticipantsQuerySchema) {}
class BreakerRequestDto extends createZodDto(circuitBreakerRequestSchema) {}
class BreakerDecisionDto extends createZodDto(circuitBreakerDecisionSchema) {}
class ReminderDto extends createZodDto(z.object({ reason: adminReasonSchema })) {}
class KycQueryDto extends createZodDto(adminKycQuerySchema) {}
class KycDecisionDto extends createZodDto(kycDecisionSchema) {}
class AmlQueryDto extends createZodDto(adminAmlQuerySchema) {}

/**
 * Finance back-office (ADM-F1…F9). Read endpoints are aggregates of the append-only ledger. Withdrawal decisions
 * stay on POST /admin/withdrawals/:id/approve|reject (reason + MFA + four-eyes). No endpoint edits amounts,
 * ledger rows or balances.
 */
@ApiTags('admin · finance')
@AdminAuth()
@Controller('admin/finance')
export class AdminFinanceController {
  constructor(
    private readonly finance: AdminFinanceService,
    private readonly exports: AdminExportsService,
    private readonly pool: AdminPoolService,
  ) {}

  @Get('deposits')
  @RequirePermissions('deposits.read')
  @ApiOperation({
    summary: 'Deposits with confirmations, KPIs and network watcher status (read-only)',
  })
  deposits(@Query() query: DepositsQueryDto) {
    return this.finance.deposits(query);
  }

  @Get('withdrawals')
  @RequirePermissions('withdrawals.read')
  @ApiOperation({ summary: 'Withdrawal queue with SLA, risk and four-eyes progress (FIFO)' })
  withdrawals(@CurrentAdmin() admin: AuthAdmin, @Query() query: WithdrawalsQueryDto) {
    return this.finance.withdrawalQueue(query, admin.id);
  }

  @Get('withdrawals/:id')
  @RequirePermissions('withdrawals.read')
  @ApiOperation({
    summary:
      'Withdrawal review detail: player, destination, AML, approvals, ledger postings, audit trail',
  })
  withdrawal(@CurrentAdmin() admin: AuthAdmin, @Param('id', ParseUUIDPipe) id: string) {
    return this.finance.withdrawalDetail(id, admin.id);
  }

  @Get('fees')
  @RequirePermissions('ledger.read')
  @ApiOperation({ summary: 'Platform fees (0.05 per qualifying entry) from the fee sub-ledger' })
  fees() {
    return this.finance.fees();
  }

  @Get('pool-accounting')
  @RequirePermissions('ledger.read')
  @ApiOperation({ summary: 'Pool escrow, owed prizes and refunds outstanding (read-only)' })
  poolAccounting() {
    return this.finance.poolAccounting();
  }

  @Get('ledger')
  @RequirePermissions('ledger.read')
  @ApiOperation({ summary: 'Append-only journal (postings with their balanced lines) — read-only' })
  ledgerJournal(@Query() query: LedgerQueryDto) {
    return this.finance.ledgerJournal(query);
  }

  @Get('ledger/integrity')
  @RequirePermissions('ledger.read')
  @ApiOperation({
    summary: 'Append-only triggers, balance invariants, journal digest and audit hash chain',
  })
  ledgerIntegrity() {
    return this.finance.ledgerIntegrity();
  }

  @Get('reconciliation')
  @RequirePermissions('reconciliation.read')
  @ApiOperation({
    summary: 'Reconciliation scopes (match / mismatch / pending) — fixes are new reviewed postings',
  })
  reconciliation() {
    return this.finance.reconciliation();
  }

  @Get('refunds')
  @RequirePermissions('ledger.read')
  @ApiOperation({ summary: 'Cancelled-round refunds: refunded to Owed, claimed, outstanding' })
  refunds() {
    return this.finance.refunds();
  }

  @Post('refunds/:number/remind')
  @HttpCode(200)
  @RequirePermissions('notifications.send')
  @ApiOperation({
    summary:
      'Remind players with an unclaimed refund (in-app notice only; reason; audited; 1 per 24 h)',
  })
  remind(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('number', ParseIntPipe) number: number,
    @Body() body: ReminderDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.pool.remindRefunds(admin, number, body.reason, meta);
  }

  @Get('reports')
  @RequirePermissions('ledger.read')
  @ApiOperation({ summary: 'Revenue report (platform fees − rewards) tied to ledger sources' })
  reports(@Query() query: RevenueQueryDto) {
    return this.finance.revenue(query.days);
  }

  @Post('exports')
  @HttpCode(201)
  @RequirePermissions('reports.export')
  @ApiOperation({
    summary:
      'Export CSV (reason required; personal data masked unless users.pii.read; row limit; SHA-256; audited)',
  })
  export(@CurrentAdmin() admin: AuthAdmin, @Body() body: ExportDto, @ReqMeta() meta: RequestMeta) {
    return this.exports.export(admin, body, meta);
  }
}

/**
 * Global Pool monitoring (ADM-P1…P10) — read-only, plus the dual-approved circuit breaker for NEW entries.
 * Results, winners, prize splits, close times and payouts cannot be changed by any admin.
 */
@ApiTags('admin · pool')
@AdminAuth()
@Controller('admin/pool')
export class AdminPoolController {
  constructor(
    private readonly pool: AdminPoolService,
    private readonly finance: AdminFinanceService,
  ) {}

  @Get('overview')
  @RequirePermissions('rounds.read')
  @ApiOperation({ summary: 'Pool overview: current round, KPIs, pipeline health, recent rounds' })
  overview() {
    return this.pool.overview();
  }

  @Get('balance')
  @RequirePermissions('rounds.read')
  @ApiOperation({
    summary: 'Pool balance: ledger vs projection per active round, hourly growth, movements',
  })
  balance() {
    return this.pool.balance();
  }

  @Get('active-round')
  @RequirePermissions('rounds.read')
  @ApiOperation({ summary: 'Active round monitor: thresholds, purchase feed, concentration' })
  activeRound() {
    return this.pool.activeRound();
  }

  @Get('rounds')
  @RequirePermissions('rounds.read')
  @ApiOperation({ summary: 'Historical rounds with settlement / refund progress' })
  rounds(@Query() query: RoundsQueryDto) {
    return this.pool.history(query);
  }

  @Get('rounds/:number/participants')
  @RequirePermissions('rounds.read')
  @ApiOperation({ summary: 'Participants of a round (grouped by player, read-only)' })
  participants(
    @Param('number', ParseIntPipe) number: number,
    @Query() query: ParticipantsQueryDto,
  ) {
    return this.pool.participants(number, query);
  }

  @Get('rounds/:number/prizes')
  @RequirePermissions('rounds.read')
  @ApiOperation({ summary: 'Prize distribution and settlement status of a round (read-only)' })
  prizes(@Param('number', ParseIntPipe) number: number) {
    return this.pool.prizes(number);
  }

  @Get('refunds')
  @RequirePermissions('rounds.read')
  @ApiOperation({
    summary:
      'Refund status of cancelled rounds (ADM-P9, read-only): refunded to Owed, claimed, outstanding per round',
  })
  async refunds() {
    // The pool view of GET /admin/finance/refunds for every role that monitors rounds (rounds.read). The finance-only
    // part — returned withdrawals ("not refunds") — stays behind ledger.read.
    const { rounds, totals, policy, generatedAt } = await this.finance.refunds();
    return { rounds, totals, policy, generatedAt };
  }

  @Get('vrf')
  @RequirePermissions('rounds.read')
  @ApiOperation({ summary: 'Verifiable randomness requests (Chainlink VRF v2.5 / mock in dev)' })
  vrf(@Query() query: PageDto) {
    return this.pool.vrf(query);
  }

  @Get('circuit-breaker')
  @RequirePermissions('rounds.read')
  @ApiOperation({ summary: 'Circuit breaker for NEW entries: state, pending request, history' })
  breaker(@CurrentAdmin() admin: AuthAdmin) {
    return this.pool.breakerState(admin.id);
  }

  @Post('circuit-breaker')
  @HttpCode(201)
  @RequirePermissions('rounds.read')
  @ApiOperation({
    summary:
      'Request to pause / resume NEW entries (reason + MFA; needs a second, different approver)',
  })
  requestBreaker(
    @CurrentAdmin() admin: AuthAdmin,
    @Body() body: BreakerRequestDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.pool.requestBreaker(admin, body, meta);
  }

  @Post('circuit-breaker/:id/decision')
  @HttpCode(200)
  @RequirePermissions('rounds.read')
  @ApiOperation({
    summary:
      'Second approval (or decline) of a circuit-breaker request — different admin, reason + MFA; audited',
  })
  decideBreaker(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: BreakerDecisionDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.pool.decideBreaker(admin, id, body, meta);
  }
}

/** Compliance (ADM-C1 KYC queue + review, ADM-C2 AML alerts). AML resolution: POST /admin/aml/alerts/:id/resolve. */
@ApiTags('admin · compliance')
@AdminAuth()
@Controller('admin/compliance')
export class AdminComplianceController {
  constructor(private readonly compliance: AdminComplianceService) {}

  @Get('kyc')
  @RequirePermissions('kyc.read')
  @ApiOperation({ summary: 'KYC review queue (oldest first) with SLA' })
  kycQueue(@Query() query: KycQueryDto) {
    return this.compliance.kycQueue(query);
  }

  @Get('kyc/:id')
  @RequirePermissions('kyc.read')
  @ApiOperation({ summary: 'KYC review detail (PII masked; provider result; history; risk)' })
  kycDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.compliance.kycDetail(id);
  }

  @Post('kyc/:id/decision')
  @HttpCode(200)
  @RequirePermissions('kyc.review')
  @ApiOperation({
    summary: 'Approve / reject / request information (reason + MFA; audited; player notified)',
  })
  kycDecision(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: KycDecisionDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.compliance.kycDecision(admin, id, body, meta);
  }

  @Get('aml')
  @RequirePermissions('aml.read')
  @ApiOperation({ summary: 'AML alerts with risk summary and the subject withdrawal / deposit' })
  aml(@Query() query: AmlQueryDto) {
    return this.compliance.amlAlerts(query);
  }
}
