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
exports.AdminConsoleController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const schemas_1 = require("@gp/shared/schemas");
const zod_1 = require("zod");
const request_1 = require("../../common/request");
const zod_2 = require("../../common/zod");
const admin_console_service_1 = require("./admin-console.service");
const admin_guards_1 = require("./admin.guards");
const four_eyes_service_1 = require("./four-eyes.service");
class ApprovalsQueryDto extends (0, zod_2.createZodDto)(schemas_1.adminApprovalsQuerySchema) {
}
class ApprovalDecisionDto extends (0, zod_2.createZodDto)(schemas_1.adminApprovalDecisionSchema) {
}
class ApprovalWithdrawDto extends (0, zod_2.createZodDto)(schemas_1.adminApprovalWithdrawSchema) {
}
class PiiRevealDto extends (0, zod_2.createZodDto)(schemas_1.adminPiiRevealSchema) {
}
class RoleChangeDto extends (0, zod_2.createZodDto)(schemas_1.adminRoleChangeSchema) {
}
class UserTxQueryDto extends (0, zod_2.createZodDto)(schemas_1.adminUserTransactionsQuerySchema) {
}
class AlertAckDto extends (0, zod_2.createZodDto)(schemas_1.adminAlertAckSchema) {
}
class AlertKeyDto extends (0, zod_2.createZodDto)(zod_1.z.object({ key: zod_1.z.string().regex(/^[a-z0-9_.-]{3,80}$/, { error: 'Unknown alert key' }) })) {
}
class RoleKeyDto extends (0, zod_2.createZodDto)(zod_1.z.object({ key: zod_1.z.string().regex(/^[a-z_]{3,40}$/, { error: 'Unknown role' }) })) {
}
/**
 * Admin console (admin-a): four-eyes inbox and decisions (ADM-X1, ADM-00 approvals), user-management tabs
 * (ADM-U1…U10), roles / permissions matrix (ADM-S1/S2), system health and live alerts (ADM-02, MOB-11).
 * Every write is a reviewed, audited workflow action; nothing here can alter results, winners, payouts, ledger rows
 * or balances.
 */
let AdminConsoleController = class AdminConsoleController {
    console;
    fourEyes;
    constructor(console, fourEyes) {
        this.console = console;
        this.fourEyes = fourEyes;
    }
    // ── four-eyes ────────────────────────────────────────────────────────────────────────────────
    approvalsInbox(admin, query) {
        return this.fourEyes.inbox(admin, query.view ?? 'open');
    }
    approval(admin, id) {
        return this.fourEyes.detail(admin, id);
    }
    approve(admin, id, body, meta) {
        return this.fourEyes.approve(admin, id, body, meta);
    }
    reject(admin, id, body, meta) {
        return this.fourEyes.reject(admin, id, body, meta);
    }
    withdraw(admin, id, body, meta) {
        return this.fourEyes.withdraw(admin, id, body, meta);
    }
    // ── users ────────────────────────────────────────────────────────────────────────────────────
    userStats() {
        return this.console.userStats();
    }
    userAccount(admin, id) {
        return this.console.userAccount(admin, id);
    }
    revealPii(admin, id, body, meta) {
        return this.console.revealPii(admin, id, body, meta);
    }
    userWallets(id) {
        return this.console.userWallets(id);
    }
    userKyc(id) {
        return this.console.userKyc(id);
    }
    userAml(id) {
        return this.console.userAml(id);
    }
    userTransactions(id, query) {
        return this.console.userTransactions(id, query);
    }
    userRg(id) {
        return this.console.userResponsibleGaming(id);
    }
    // ── system ───────────────────────────────────────────────────────────────────────────────────
    roles() {
        return this.console.roles();
    }
    permissions() {
        return this.console.permissions();
    }
    requestRoleChange(admin, params, body, meta) {
        return this.console.requestRoleChange(admin, params.key, body, meta);
    }
    systemHealth() {
        return this.console.systemHealth();
    }
    alerts(admin) {
        return this.console.alerts(admin);
    }
    ackAlert(admin, params, body, meta) {
        return this.console.acknowledgeAlert(admin, params.key, body.note, meta);
    }
};
exports.AdminConsoleController = AdminConsoleController;
__decorate([
    (0, common_1.Get)('approvals/inbox'),
    (0, admin_guards_1.RequirePermissions)('dashboard.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Four-eyes inbox: open / waiting for me / created by me / decided today / expired, with your role per request',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ApprovalsQueryDto]),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "approvalsInbox", null);
__decorate([
    (0, common_1.Get)('approvals/:id'),
    (0, admin_guards_1.RequirePermissions)('dashboard.read'),
    (0, swagger_1.ApiOperation)({ summary: 'One four-eyes request with eligible approvers and its audit trail' }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "approval", null);
__decorate([
    (0, common_1.Post)('approvals/:id/approve'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Second approver: approve a request (different admin, own reason + fresh MFA); the requested action runs in the same transaction',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, ApprovalDecisionDto, Object]),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)('approvals/:id/reject'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Second approver: reject a request (reason + MFA). Nothing changes (a flagged withdrawal is rejected and its funds return to Available).',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, ApprovalDecisionDto, Object]),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)('approvals/:id/withdraw'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Requester withdraws their own pending request (reason; audited; nothing changes)',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, ApprovalWithdrawDto, Object]),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "withdraw", null);
__decorate([
    (0, common_1.Get)('user-stats'),
    (0, admin_guards_1.RequirePermissions)('users.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'User KPIs for the users list (totals, active 30 d, KYC verified, restricted)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "userStats", null);
__decorate([
    (0, common_1.Get)('users/:id/account'),
    (0, admin_guards_1.RequirePermissions)('users.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Account details: masked PII, consents (read-only), security, devices & sessions',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "userAccount", null);
__decorate([
    (0, common_1.Post)('users/:id/pii/reveal'),
    (0, common_1.HttpCode)(200),
    (0, admin_guards_1.RequirePermissions)('users.read', 'users.pii.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Reveal ONE personal-data field (reason required; audit-logged; read-only)',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, PiiRevealDto, Object]),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "revealPii", null);
__decorate([
    (0, common_1.Get)('users/:id/wallets'),
    (0, admin_guards_1.RequirePermissions)('users.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Linked wallets, whitelist and deposit addresses (read-only: admins cannot add or redirect addresses)',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "userWallets", null);
__decorate([
    (0, common_1.Get)('users/:id/kyc'),
    (0, admin_guards_1.RequirePermissions)('users.read', 'kyc.read'),
    (0, swagger_1.ApiOperation)({ summary: 'KYC level, records and limits by level' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "userKyc", null);
__decorate([
    (0, common_1.Get)('users/:id/aml'),
    (0, admin_guards_1.RequirePermissions)('users.read', 'aml.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'AML alerts and the rule-based risk score with its breakdown (read-only, no override)',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "userAml", null);
__decorate([
    (0, common_1.Get)('users/:id/transactions'),
    (0, admin_guards_1.RequirePermissions)('users.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Transaction history (paginated) + lifetime flows + ledger balances (read-only)',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UserTxQueryDto]),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "userTransactions", null);
__decorate([
    (0, common_1.Get)('users/:id/responsible-gaming'),
    (0, admin_guards_1.RequirePermissions)('users.read', 'rg.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Player-set RG limits, usage, self-exclusion history (admins cannot loosen limits)',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "userRg", null);
__decorate([
    (0, common_1.Get)('roles'),
    (0, admin_guards_1.RequirePermissions)('system.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Admin roles with their permissions, members and pending (four-eyes) changes',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "roles", null);
__decorate([
    (0, common_1.Get)('permissions'),
    (0, admin_guards_1.RequirePermissions)('system.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Permission catalogue with its policy (reason / MFA / four-eyes)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "permissions", null);
__decorate([
    (0, common_1.Post)('roles/:key/change-requests'),
    (0, common_1.HttpCode)(202),
    (0, admin_guards_1.RequirePermissions)('admins.manage'),
    (0, swagger_1.ApiOperation)({
        summary: 'REQUEST a role-permission change (reason + MFA); applied only after a second admin approves',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, RoleKeyDto,
        RoleChangeDto, Object]),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "requestRoleChange", null);
__decorate([
    (0, common_1.Get)('system/health'),
    (0, admin_guards_1.RequirePermissions)('dashboard.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'System health: DB, Redis, queues, randomness, chains, kill switches, ledger invariants',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "systemHealth", null);
__decorate([
    (0, common_1.Get)('alerts'),
    (0, admin_guards_1.RequirePermissions)('dashboard.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Live operational / compliance alerts computed from real state (role-filtered)',
    }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "alerts", null);
__decorate([
    (0, common_1.Post)('alerts/:key/ack'),
    (0, common_1.HttpCode)(200),
    (0, admin_guards_1.RequirePermissions)('dashboard.read'),
    (0, swagger_1.ApiOperation)({ summary: 'Acknowledge an alert (audit-logged; changes nothing else)' }),
    __param(0, (0, request_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, AlertKeyDto,
        AlertAckDto, Object]),
    __metadata("design:returntype", void 0)
], AdminConsoleController.prototype, "ackAlert", null);
exports.AdminConsoleController = AdminConsoleController = __decorate([
    (0, swagger_1.ApiTags)('admin · console'),
    (0, admin_guards_1.AdminAuth)(),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_console_service_1.AdminConsoleService,
        four_eyes_service_1.FourEyesService])
], AdminConsoleController);
//# sourceMappingURL=admin-console.controller.js.map