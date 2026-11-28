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
exports.AdminController = exports.AdminAuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const enums_1 = require("@gp/shared/enums");
const schemas_1 = require("@gp/shared/schemas");
const zod_1 = require("zod");
const request_1 = require("../../common/request");
const zod_2 = require("../../common/zod");
const audit_service_1 = require("../audit/audit.service");
const aml_service_1 = require("../aml/aml.service");
const affiliates_service_1 = require("../affiliates/affiliates.service");
const feature_flags_service_1 = require("../feature-flags/feature-flags.service");
const ledger_service_1 = require("../ledger/ledger.service");
const rounds_service_1 = require("../pool/rounds.service");
const reporting_service_1 = require("../reporting/reporting.service");
const admin_auth_service_1 = require("./admin-auth.service");
const admin_security_service_1 = require("./admin-security.service");
const admin_guards_1 = require("./admin.guards");
const admin_service_1 = require("./admin.service");
const sensitive = zod_1.z.object({
    reason: zod_1.z
        .string()
        .trim()
        .min(5, { error: 'A written reason (min. 5 characters) is required' })
        .max(500),
    mfaCode: schemas_1.totpCodeSchema,
});
class LoginDto extends (0, zod_2.createZodDto)(schemas_1.adminLoginSchema) {
}
class RefreshDto extends (0, zod_2.createZodDto)(zod_1.z.object({ refreshToken: zod_1.z.string().min(20).max(200) })) {
}
class SensitiveDto extends (0, zod_2.createZodDto)(sensitive) {
}
/** Restriction apply: withdrawal holds / suspensions become a four-eyes REQUEST (RESTRICTION_REQUIRES_FOUR_EYES). */
class RestrictionDto extends (0, zod_2.createZodDto)(schemas_1.adminRestrictionApplySchema) {
}
class RestrictionLiftDto extends (0, zod_2.createZodDto)(schemas_1.adminRestrictionLiftSchema) {
}
class AmlResolveDto extends (0, zod_2.createZodDto)(sensitive.extend({ resolution: zod_1.z.enum(['resolved', 'dismissed', 'escalated']) })) {
}
class UsersQueryDto extends (0, zod_2.createZodDto)(schemas_1.adminUsersQuerySchema) {
}
class WithdrawalQueueDto extends (0, zod_2.createZodDto)(schemas_1.paginationQuerySchema.extend({ status: zod_1.z.enum(enums_1.WITHDRAWAL_STATUSES).optional() })) {
}
class AuditQueryDto extends (0, zod_2.createZodDto)(schemas_1.paginationQuerySchema.extend({
    action: zod_1.z.string().max(80).optional(),
    actorId: zod_1.z.string().max(64).optional(),
    targetType: zod_1.z.string().max(40).optional(),
    targetId: zod_1.z.string().max(64).optional(),
})) {
}
class AmlQueryDto extends (0, zod_2.createZodDto)(schemas_1.paginationQuerySchema.extend({
    status: zod_1.z.enum(['open', 'under_review', 'resolved', 'dismissed', 'escalated']).optional(),
})) {
}
class PaginationDto extends (0, zod_2.createZodDto)(schemas_1.paginationQuerySchema) {
}
/** Per-IP limit on admin login / refresh attempts (env ADMIN_LOGIN_THROTTLE_LIMIT, default 10 per minute). */
const loginLimit = () => Number(process.env.ADMIN_LOGIN_THROTTLE_LIMIT ?? 10);
let AdminAuthController = class AdminAuthController {
    auth;
    constructor(auth) {
        this.auth = auth;
    }
    login(body, meta) {
        return this.auth.login(body, meta);
    }
    refresh(body, meta) {
        return this.auth.refresh(body.refreshToken, meta);
    }
    logout(admin) {
        return this.auth.logout(admin);
    }
    me(admin) {
        return this.auth.profile(admin.id);
    }
};
exports.AdminAuthController = AdminAuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(200),
    (0, throttler_1.Throttle)({ default: { limit: loginLimit, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Admin login: email + password (argon2id) + MANDATORY TOTP; lockout after repeated failures',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(200),
    (0, throttler_1.Throttle)({ default: { limit: () => loginLimit() * 3, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Rotate the refresh token (reuse of an old one revokes the whole session family)',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RefreshDto, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(200),
    (0, admin_guards_1.AdminAuth)(),
    __param(0, (0, request_1.CurrentAdmin)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminAuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, admin_guards_1.AdminAuth)(),
    __param(0, (0, request_1.CurrentAdmin)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminAuthController.prototype, "me", null);
exports.AdminAuthController = AdminAuthController = __decorate([
    (0, swagger_1.ApiTags)('admin · auth'),
    (0, common_1.Controller)('admin/auth'),
    __metadata("design:paramtypes", [admin_auth_service_1.AdminAuthService])
], AdminAuthController);
let AdminController = class AdminController {
    admin;
    reporting;
    audit;
    ledger;
    rounds;
    aml;
    security;
    flags;
    affiliates;
    constructor(admin, reporting, audit, ledger, rounds, aml, security, flags, affiliates) {
        this.admin = admin;
        this.reporting = reporting;
        this.audit = audit;
        this.ledger = ledger;
        this.rounds = rounds;
        this.aml = aml;
        this.security = security;
        this.flags = flags;
        this.affiliates = affiliates;
    }
    dashboard() {
        return this.reporting.kpis();
    }
    users(query) {
        return this.admin.listUsers(query);
    }
    user(id) {
        return this.admin.userDetail(id);
    }
    restrict(admin, id, body, meta) {
        return this.admin.applyRestriction(admin, id, body, meta);
    }
    lift(admin, id, restrictionId, body, meta) {
        return this.admin.liftRestriction(admin, id, restrictionId, body, meta);
    }
    withdrawals(query) {
        return this.admin.withdrawalQueue(query);
    }
    approve(admin, id, body, meta) {
        return this.admin.approveWithdrawal(admin, id, body, meta);
    }
    reject(admin, id, body, meta) {
        return this.admin.rejectWithdrawal(admin, id, body, meta);
    }
    approvals() {
        return this.admin.approvals('pending');
    }
    auditLogs(query) {
        return this.admin.auditLogs(query);
    }
    verifyAudit() {
        return this.audit.verify();
    }
    reconciliation() {
        return this.ledger.reconcile();
    }
    ledgerBalances() {
        return this.ledger.balancesByType();
    }
    roundList(query) {
        return this.rounds.history(query);
    }
    async round(number) {
        return this.rounds.view(await this.rounds.byNumber(number));
    }
    amlAlerts(query) {
        return this.aml.list(query);
    }
    async resolveAml(admin, id, body, meta) {
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
    featureFlags() {
        return this.flags.list();
    }
    affiliateList() {
        return this.affiliates.listAffiliates();
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, admin_guards_1.RequirePermissions)('dashboard.read'),
    (0, swagger_1.ApiOperation)({ summary: 'KPIs (30 d) computed from the ledger + reconciliation status' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, admin_guards_1.RequirePermissions)('users.read'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UsersQueryDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "users", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    (0, admin_guards_1.RequirePermissions)('users.read'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "user", null);
__decorate([
    (0, common_1.Post)('users/:id/restrictions'),
    (0, common_1.HttpCode)(201),
    (0, admin_guards_1.RequirePermissions)('users.restrict'),
    (0, swagger_1.ApiOperation)({
        summary: 'Apply a restriction (reason + MFA re-auth; audited). Withdrawal holds and suspensions need four eyes → returns a pending request',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, RestrictionDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "restrict", null);
__decorate([
    (0, common_1.Post)('users/:id/restrictions/:restrictionId/lift'),
    (0, common_1.HttpCode)(200),
    (0, admin_guards_1.RequirePermissions)('users.restrict'),
    (0, swagger_1.ApiOperation)({ summary: 'Lift a restriction (reason + MFA re-auth; audited)' }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('restrictionId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, RestrictionLiftDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "lift", null);
__decorate([
    (0, common_1.Get)('withdrawals'),
    (0, admin_guards_1.RequirePermissions)('withdrawals.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Withdrawal queue (default: open states) with four-eyes approval progress',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [WithdrawalQueueDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "withdrawals", null);
__decorate([
    (0, common_1.Post)('withdrawals/:id/approve'),
    (0, common_1.HttpCode)(200),
    (0, admin_guards_1.RequirePermissions)('withdrawals.approve'),
    (0, swagger_1.ApiOperation)({
        summary: 'Approve an under-review withdrawal (reason + MFA; flagged → second, different admin required)',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, SensitiveDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)('withdrawals/:id/reject'),
    (0, common_1.HttpCode)(200),
    (0, admin_guards_1.RequirePermissions)('withdrawals.reject'),
    (0, swagger_1.ApiOperation)({
        summary: 'Reject a withdrawal (reason + MFA; funds return to the player’s Available; audited)',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, SensitiveDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "reject", null);
__decorate([
    (0, common_1.Get)('approvals'),
    (0, admin_guards_1.RequirePermissions)('withdrawals.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Four-eyes approvals awaiting a second admin' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "approvals", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    (0, admin_guards_1.RequirePermissions)('audit.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Hash-chained audit log (newest first)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AuditQueryDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "auditLogs", null);
__decorate([
    (0, common_1.Get)('audit-logs/verify'),
    (0, admin_guards_1.RequirePermissions)('audit.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Recompute the audit hash chain end-to-end' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "verifyAudit", null);
__decorate([
    (0, common_1.Get)('ledger/reconciliation'),
    (0, admin_guards_1.RequirePermissions)('reconciliation.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Ledger invariants: total = 0, every posting balanced, pool accounts = projections',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "reconciliation", null);
__decorate([
    (0, common_1.Get)('ledger/balances'),
    (0, admin_guards_1.RequirePermissions)('ledger.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Balance per ledger account type (read-only — ledger rows can never be edited)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "ledgerBalances", null);
__decorate([
    (0, common_1.Get)('rounds'),
    (0, admin_guards_1.RequirePermissions)('rounds.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Rounds (read-only — results come only from verifiable randomness)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PaginationDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "roundList", null);
__decorate([
    (0, common_1.Get)('rounds/:number'),
    (0, admin_guards_1.RequirePermissions)('rounds.read'),
    __param(0, (0, common_1.Param)('number', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "round", null);
__decorate([
    (0, common_1.Get)('aml/alerts'),
    (0, admin_guards_1.RequirePermissions)('aml.read'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AmlQueryDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "amlAlerts", null);
__decorate([
    (0, common_1.Post)('aml/alerts/:id/resolve'),
    (0, common_1.HttpCode)(200),
    (0, admin_guards_1.RequirePermissions)('aml.resolve'),
    (0, swagger_1.ApiOperation)({ summary: 'Resolve / dismiss / escalate an AML alert (reason + MFA; audited)' }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, AmlResolveDto, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "resolveAml", null);
__decorate([
    (0, common_1.Get)('feature-flags'),
    (0, admin_guards_1.RequirePermissions)('system.read'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "featureFlags", null);
__decorate([
    (0, common_1.Get)('affiliates'),
    (0, admin_guards_1.RequirePermissions)('affiliates.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Affiliates (STUB)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "affiliateList", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, admin_guards_1.AdminAuth)(),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        reporting_service_1.ReportingService,
        audit_service_1.AuditService,
        ledger_service_1.LedgerService,
        rounds_service_1.RoundsService,
        aml_service_1.AmlService,
        admin_security_service_1.AdminSecurityService,
        feature_flags_service_1.FeatureFlagsService,
        affiliates_service_1.AffiliatesService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map