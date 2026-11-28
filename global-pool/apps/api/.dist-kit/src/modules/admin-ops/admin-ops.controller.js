"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminComplianceController = exports.AdminPoolController = exports.AdminFinanceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const enums_1 = require("@gp/shared/enums");
const schemas_1 = require("@gp/shared/schemas");
const zod_1 = require("zod");
const request_1 = require("../../common/request");
const zod_2 = require("../../common/zod");
const admin_guards_1 = require("../admin/admin.guards");
const admin_compliance_service_1 = require("./admin-compliance.service");
const admin_exports_service_1 = require("./admin-exports.service");
const admin_finance_service_1 = require("./admin-finance.service");
const admin_pool_service_1 = require("./admin-pool.service");
class DepositsQueryDto extends (0, zod_2.createZodDto)(schemas_1.adminDepositsQuerySchema) {
}
class WithdrawalsQueryDto extends (0, zod_2.createZodDto)(schemas_1.adminWithdrawalsQuerySchema) {
}
class LedgerQueryDto extends (0, zod_2.createZodDto)(schemas_1.adminLedgerQuerySchema) {
}
class ExportDto extends (0, zod_2.createZodDto)(schemas_1.adminExportRequestSchema) {
}
class RevenueQueryDto extends (0, zod_2.createZodDto)(zod_1.z.object({ days: zod_1.z.coerce.number().int().min(1).max(366).default(30) })) {
}
class PageDto extends (0, zod_2.createZodDto)(schemas_1.paginationQuerySchema) {
}
class RoundsQueryDto extends (0, zod_2.createZodDto)(schemas_1.paginationQuerySchema.extend({ status: zod_1.z.enum(enums_1.ROUND_STATUSES).optional() })) {
}
class ParticipantsQueryDto extends (0, zod_2.createZodDto)(schemas_1.adminParticipantsQuerySchema) {
}
class BreakerRequestDto extends (0, zod_2.createZodDto)(schemas_1.circuitBreakerRequestSchema) {
}
class BreakerDecisionDto extends (0, zod_2.createZodDto)(schemas_1.circuitBreakerDecisionSchema) {
}
class ReminderDto extends (0, zod_2.createZodDto)(zod_1.z.object({ reason: schemas_1.adminReasonSchema })) {
}
class KycQueryDto extends (0, zod_2.createZodDto)(schemas_1.adminKycQuerySchema) {
}
class KycDecisionDto extends (0, zod_2.createZodDto)(schemas_1.kycDecisionSchema) {
}
class AmlQueryDto extends (0, zod_2.createZodDto)(schemas_1.adminAmlQuerySchema) {
}
/**
 * Finance back-office (ADM-F1…F9). Read endpoints are aggregates of the append-only ledger. Withdrawal decisions
 * stay on POST /admin/withdrawals/:id/approve|reject (reason + MFA + four-eyes). No endpoint edits amounts,
 * ledger rows or balances.
 */
let AdminFinanceController = class AdminFinanceController {
    finance;
    exports;
    pool;
    constructor(finance, exports, pool) {
        this.finance = finance;
        this.exports = exports;
        this.pool = pool;
    }
    deposits(query) {
        return this.finance.deposits(query);
    }
    withdrawals(admin, query) {
        return this.finance.withdrawalQueue(query, admin.id);
    }
    withdrawal(admin, id) {
        return this.finance.withdrawalDetail(id, admin.id);
    }
    fees() {
        return this.finance.fees();
    }
    poolAccounting() {
        return this.finance.poolAccounting();
    }
    ledgerJournal(query) {
        return this.finance.ledgerJournal(query);
    }
    ledgerIntegrity() {
        return this.finance.ledgerIntegrity();
    }
    reconciliation() {
        return this.finance.reconciliation();
    }
    refunds() {
        return this.finance.refunds();
    }
    remind(admin, number, body, meta) {
        return this.pool.remindRefunds(admin, number, body.reason, meta);
    }
    reports(query) {
        return this.finance.revenue(query.days);
    }
    export(admin, body, meta) {
        return this.exports.export(admin, body, meta);
    }
};
exports.AdminFinanceController = AdminFinanceController;
__decorate([
    (0, common_1.Get)('deposits'),
    (0, admin_guards_1.RequirePermissions)('deposits.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Deposits with confirmations, KPIs and network watcher status (read-only)',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [DepositsQueryDto]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "deposits", null);
__decorate([
    (0, common_1.Get)('withdrawals'),
    (0, admin_guards_1.RequirePermissions)('withdrawals.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Withdrawal queue with SLA, risk and four-eyes progress (FIFO)' }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, WithdrawalsQueryDto]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "withdrawals", null);
__decorate([
    (0, common_1.Get)('withdrawals/:id'),
    (0, admin_guards_1.RequirePermissions)('withdrawals.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Withdrawal review detail: player, destination, AML, approvals, ledger postings, audit trail',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "withdrawal", null);
__decorate([
    (0, common_1.Get)('fees'),
    (0, admin_guards_1.RequirePermissions)('ledger.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Platform fees (0.05 per qualifying entry) from the fee sub-ledger' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "fees", null);
__decorate([
    (0, common_1.Get)('pool-accounting'),
    (0, admin_guards_1.RequirePermissions)('ledger.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Pool escrow, owed prizes and refunds outstanding (read-only)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "poolAccounting", null);
__decorate([
    (0, common_1.Get)('ledger'),
    (0, admin_guards_1.RequirePermissions)('ledger.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Append-only journal (postings with their balanced lines) — read-only' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LedgerQueryDto]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "ledgerJournal", null);
__decorate([
    (0, common_1.Get)('ledger/integrity'),
    (0, admin_guards_1.RequirePermissions)('ledger.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Append-only triggers, balance invariants, journal digest and audit hash chain',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "ledgerIntegrity", null);
__decorate([
    (0, common_1.Get)('reconciliation'),
    (0, admin_guards_1.RequirePermissions)('reconciliation.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Reconciliation scopes (match / mismatch / pending) — fixes are new reviewed postings',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "reconciliation", null);
__decorate([
    (0, common_1.Get)('refunds'),
    (0, admin_guards_1.RequirePermissions)('ledger.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancelled-round refunds: refunded to Owed, claimed, outstanding' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "refunds", null);
__decorate([
    (0, common_1.Post)('refunds/:number/remind'),
    (0, common_1.HttpCode)(200),
    (0, admin_guards_1.RequirePermissions)('notifications.send'),
    (0, swagger_1.ApiOperation)({
        summary: 'Remind players with an unclaimed refund (in-app notice only; reason; audited; 1 per 24 h)',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('number', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, ReminderDto, Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "remind", null);
__decorate([
    (0, common_1.Get)('reports'),
    (0, admin_guards_1.RequirePermissions)('ledger.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Revenue report (platform fees − rewards) tied to ledger sources' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RevenueQueryDto]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "reports", null);
__decorate([
    (0, common_1.Post)('exports'),
    (0, common_1.HttpCode)(201),
    (0, admin_guards_1.RequirePermissions)('reports.export'),
    (0, swagger_1.ApiOperation)({
        summary: 'Export CSV (reason required; personal data masked unless users.pii.read; row limit; SHA-256; audited)',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ExportDto, Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "export", null);
exports.AdminFinanceController = AdminFinanceController = __decorate([
    (0, swagger_1.ApiTags)('admin · finance'),
    (0, admin_guards_1.AdminAuth)(),
    (0, common_1.Controller)('admin/finance'),
    __metadata("design:paramtypes", [admin_finance_service_1.AdminFinanceService,
        admin_exports_service_1.AdminExportsService,
        admin_pool_service_1.AdminPoolService])
], AdminFinanceController);
/**
 * Global Pool monitoring (ADM-P1…P10) — read-only, plus the dual-approved circuit breaker for NEW entries.
 * Results, winners, prize splits, close times and payouts cannot be changed by any admin.
 */
let AdminPoolController = class AdminPoolController {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    overview() {
        return this.pool.overview();
    }
    balance() {
        return this.pool.balance();
    }
    activeRound() {
        return this.pool.activeRound();
    }
    rounds(query) {
        return this.pool.history(query);
    }
    participants(number, query) {
        return this.pool.participants(number, query);
    }
    prizes(number) {
        return this.pool.prizes(number);
    }
    vrf(query) {
        return this.pool.vrf(query);
    }
    breaker(admin) {
        return this.pool.breakerState(admin.id);
    }
    requestBreaker(admin, body, meta) {
        return this.pool.requestBreaker(admin, body, meta);
    }
    decideBreaker(admin, id, body, meta) {
        return this.pool.decideBreaker(admin, id, body, meta);
    }
};
exports.AdminPoolController = AdminPoolController;
__decorate([
    (0, common_1.Get)('overview'),
    (0, admin_guards_1.RequirePermissions)('rounds.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Pool overview: current round, KPIs, pipeline health, recent rounds' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminPoolController.prototype, "overview", null);
__decorate([
    (0, common_1.Get)('balance'),
    (0, admin_guards_1.RequirePermissions)('rounds.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Pool balance: ledger vs projection per active round, hourly growth, movements',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminPoolController.prototype, "balance", null);
__decorate([
    (0, common_1.Get)('active-round'),
    (0, admin_guards_1.RequirePermissions)('rounds.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Active round monitor: thresholds, purchase feed, concentration' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminPoolController.prototype, "activeRound", null);
__decorate([
    (0, common_1.Get)('rounds'),
    (0, admin_guards_1.RequirePermissions)('rounds.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Historical rounds with settlement / refund progress' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RoundsQueryDto]),
    __metadata("design:returntype", void 0)
], AdminPoolController.prototype, "rounds", null);
__decorate([
    (0, common_1.Get)('rounds/:number/participants'),
    (0, admin_guards_1.RequirePermissions)('rounds.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Participants of a round (grouped by player, read-only)' }),
    __param(0, (0, common_1.Param)('number', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, ParticipantsQueryDto]),
    __metadata("design:returntype", void 0)
], AdminPoolController.prototype, "participants", null);
__decorate([
    (0, common_1.Get)('rounds/:number/prizes'),
    (0, admin_guards_1.RequirePermissions)('rounds.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Prize distribution and settlement status of a round (read-only)' }),
    __param(0, (0, common_1.Param)('number', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AdminPoolController.prototype, "prizes", null);
__decorate([
    (0, common_1.Get)('vrf'),
    (0, admin_guards_1.RequirePermissions)('rounds.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Verifiable randomness requests (Chainlink VRF v2.5 / mock in dev)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PageDto]),
    __metadata("design:returntype", void 0)
], AdminPoolController.prototype, "vrf", null);
__decorate([
    (0, common_1.Get)('circuit-breaker'),
    (0, admin_guards_1.RequirePermissions)('rounds.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Circuit breaker for NEW entries: state, pending request, history' }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminPoolController.prototype, "breaker", null);
__decorate([
    (0, common_1.Post)('circuit-breaker'),
    (0, common_1.HttpCode)(201),
    (0, admin_guards_1.RequirePermissions)('rounds.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Request to pause / resume NEW entries (reason + MFA; needs a second, different approver)',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, BreakerRequestDto, Object]),
    __metadata("design:returntype", void 0)
], AdminPoolController.prototype, "requestBreaker", null);
__decorate([
    (0, common_1.Post)('circuit-breaker/:id/decision'),
    (0, common_1.HttpCode)(200),
    (0, admin_guards_1.RequirePermissions)('rounds.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Second approval (or decline) of a circuit-breaker request — different admin, reason + MFA; audited',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, BreakerDecisionDto, Object]),
    __metadata("design:returntype", void 0)
], AdminPoolController.prototype, "decideBreaker", null);
exports.AdminPoolController = AdminPoolController = __decorate([
    (0, swagger_1.ApiTags)('admin · pool'),
    (0, admin_guards_1.AdminAuth)(),
    (0, common_1.Controller)('admin/pool'),
    __metadata("design:paramtypes", [admin_pool_service_1.AdminPoolService])
], AdminPoolController);
/** Compliance (ADM-C1 KYC queue + review, ADM-C2 AML alerts). AML resolution: POST /admin/aml/alerts/:id/resolve. */
let AdminComplianceController = class AdminComplianceController {
    compliance;
    constructor(compliance) {
        this.compliance = compliance;
    }
    kycQueue(query) {
        return this.compliance.kycQueue(query);
    }
    kycDetail(id) {
        return this.compliance.kycDetail(id);
    }
    kycDecision(admin, id, body, meta) {
        return this.compliance.kycDecision(admin, id, body, meta);
    }
    aml(query) {
        return this.compliance.amlAlerts(query);
    }
};
exports.AdminComplianceController = AdminComplianceController;
__decorate([
    (0, common_1.Get)('kyc'),
    (0, admin_guards_1.RequirePermissions)('kyc.read'),
    (0, swagger_1.ApiOperation)({ summary: 'KYC review queue (oldest first) with SLA' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [KycQueryDto]),
    __metadata("design:returntype", void 0)
], AdminComplianceController.prototype, "kycQueue", null);
__decorate([
    (0, common_1.Get)('kyc/:id'),
    (0, admin_guards_1.RequirePermissions)('kyc.read'),
    (0, swagger_1.ApiOperation)({ summary: 'KYC review detail (PII masked; provider result; history; risk)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminComplianceController.prototype, "kycDetail", null);
__decorate([
    (0, common_1.Post)('kyc/:id/decision'),
    (0, common_1.HttpCode)(200),
    (0, admin_guards_1.RequirePermissions)('kyc.review'),
    (0, swagger_1.ApiOperation)({
        summary: 'Approve / reject / request information (reason + MFA; audited; player notified)',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, KycDecisionDto, Object]),
    __metadata("design:returntype", void 0)
], AdminComplianceController.prototype, "kycDecision", null);
__decorate([
    (0, common_1.Get)('aml'),
    (0, admin_guards_1.RequirePermissions)('aml.read'),
    (0, swagger_1.ApiOperation)({ summary: 'AML alerts with risk summary and the subject withdrawal / deposit' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AmlQueryDto]),
    __metadata("design:returntype", void 0)
], AdminComplianceController.prototype, "aml", null);
exports.AdminComplianceController = AdminComplianceController = __decorate([
    (0, swagger_1.ApiTags)('admin · compliance'),
    (0, admin_guards_1.AdminAuth)(),
    (0, common_1.Controller)('admin/compliance'),
    __metadata("design:paramtypes", [admin_compliance_service_1.AdminComplianceService])
], AdminComplianceController);
//# sourceMappingURL=admin-ops.controller.js.map