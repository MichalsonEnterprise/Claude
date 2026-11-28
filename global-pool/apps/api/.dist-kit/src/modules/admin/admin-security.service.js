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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSecurityService = void 0;
const common_1 = require("@nestjs/common");
const enums_1 = require("@gp/shared/enums");
const errors_1 = require("../../common/errors");
const totp_service_1 = require("../security/totp.service");
/**
 * Sensitive admin actions: RBAC permission (guard) + written reason + fresh MFA re-auth (TOTP, replay-protected)
 * according to PERMISSION_POLICY. Four-eyes is enforced by the action's own service (e.g. withdrawals).
 */
let AdminSecurityService = class AdminSecurityService {
    totp;
    constructor(totp) {
        this.totp = totp;
    }
    async assertSensitive(admin, permission, input) {
        if (!admin.permissions.includes(permission)) {
            throw new errors_1.AppError('FORBIDDEN', 'Your role does not allow this action', {
                missingPermissions: [permission],
            });
        }
        const policy = enums_1.PERMISSION_POLICY[permission];
        if (policy.requiresReason && (!input.reason || input.reason.trim().length < 5)) {
            throw new errors_1.AppError('VALIDATION_FAILED', 'A written reason (min. 5 characters) is required', {
                field: 'reason',
            });
        }
        if (policy.requiresMfa) {
            if (!input.mfaCode) {
                throw new errors_1.AppError('STEP_UP_REQUIRED', 'Confirm with your authenticator code', {
                    reason: 'mfa_required',
                });
            }
            await this.totp.verifyActive({ adminUserId: admin.id }, input.mfaCode, {
                allowBackup: false,
            });
        }
        return policy;
    }
};
exports.AdminSecurityService = AdminSecurityService;
exports.AdminSecurityService = AdminSecurityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [totp_service_1.TotpService])
], AdminSecurityService);
//# sourceMappingURL=admin-security.service.js.map