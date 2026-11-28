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
exports.AccountController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const schemas_1 = require("@gp/shared/schemas");
const request_1 = require("../../common/request");
const zod_1 = require("../../common/zod");
const audit_service_1 = require("../audit/audit.service");
const guards_1 = require("../auth/guards");
const account_service_1 = require("./account.service");
class ProfileUpdateDto extends (0, zod_1.createZodDto)(schemas_1.profileUpdateSchema) {
}
class NotificationPrefsDto extends (0, zod_1.createZodDto)(schemas_1.notificationPreferencesUpdateSchema) {
}
class LoginHistoryQueryDto extends (0, zod_1.createZodDto)(schemas_1.loginHistoryQuerySchema) {
}
class SessionsQueryDto extends (0, zod_1.createZodDto)(schemas_1.sessionsQuerySchema) {
}
/**
 * Account & security (USR-A1…A10). Additive to UsersController (same `/me` prefix). Ending sessions is a
 * protective action and never asks for a 2FA code; changing security settings goes through the 2FA routes.
 */
let AccountController = class AccountController {
    account;
    audit;
    constructor(account, audit) {
        this.account = account;
        this.audit = audit;
    }
    preferences(user) {
        return this.account.preferences(user.id);
    }
    async updateProfile(user, body) {
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
    async updateNotifications(user, body) {
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
    sessions(user, query) {
        return this.account.sessions(user, query.include);
    }
    async revokeOthers(user) {
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
    loginHistory(user, query) {
        return this.account.loginHistory(user, query);
    }
    security(user) {
        return this.account.securityOverview(user);
    }
};
exports.AccountController = AccountController;
__decorate([
    (0, common_1.Get)('preferences'),
    (0, swagger_1.ApiOperation)({
        summary: 'Language, time zone, notification channels (locked categories resolved)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountController.prototype, "preferences", null);
__decorate([
    (0, common_1.Patch)('profile'),
    (0, guards_1.PlayerPolicy)({ onboarded: true }),
    (0, swagger_1.ApiOperation)({
        summary: 'A1: update display name, language and time zone (verified identity is locked)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ProfileUpdateDto]),
    __metadata("design:returntype", Promise)
], AccountController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Put)('notification-preferences'),
    (0, guards_1.PlayerPolicy)({ onboarded: true }),
    (0, swagger_1.ApiOperation)({
        summary: 'A9: notification channels per category — security and RG messages stay on; marketing is opt-in only',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, NotificationPrefsDto]),
    __metadata("design:returntype", Promise)
], AccountController.prototype, "updateNotifications", null);
__decorate([
    (0, common_1.Get)('devices'),
    (0, swagger_1.ApiOperation)({
        summary: 'A7/A8: sessions as devices (masked IP, method, status) — ?include=all adds sessions ended in the last 90 days',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, SessionsQueryDto]),
    __metadata("design:returntype", void 0)
], AccountController.prototype, "sessions", null);
__decorate([
    (0, common_1.Post)('sessions/revoke-others'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'A8: end every other session (protective — no 2FA code needed)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AccountController.prototype, "revokeOthers", null);
__decorate([
    (0, common_1.Get)('login-history'),
    (0, swagger_1.ApiOperation)({
        summary: 'A6: sign-ins (one per Privy session), flagged / ended filters, counts',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, LoginHistoryQueryDto]),
    __metadata("design:returntype", void 0)
], AccountController.prototype, "loginHistory", null);
__decorate([
    (0, common_1.Get)('security'),
    (0, swagger_1.ApiOperation)({
        summary: 'A2: security score from active protections + your own recent security events',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountController.prototype, "security", null);
exports.AccountController = AccountController = __decorate([
    (0, swagger_1.ApiTags)('users'),
    (0, guards_1.PlayerAuth)({ onboarded: false }),
    (0, common_1.Controller)('me'),
    __metadata("design:paramtypes", [account_service_1.AccountService,
        audit_service_1.AuditService])
], AccountController);
//# sourceMappingURL=account.controller.js.map