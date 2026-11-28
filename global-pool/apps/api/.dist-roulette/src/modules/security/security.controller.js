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
exports.SecurityController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const schemas_1 = require("@gp/shared/schemas");
const zod_1 = require("zod");
const request_1 = require("../../common/request");
const zod_2 = require("../../common/zod");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const guards_1 = require("../auth/guards");
const step_up_service_1 = require("./step-up.service");
const totp_service_1 = require("./totp.service");
class ConfirmTotpDto extends (0, zod_2.createZodDto)(schemas_1.totpEnrollConfirmSchema) {
}
class ChallengeDto extends (0, zod_2.createZodDto)(schemas_1.totpChallengeSchema) {
}
const stepUpCode = zod_1.z.object({ code: zod_1.z.union([schemas_1.totpCodeSchema, schemas_1.backupCodeSchema]).optional() });
class StepUpCodeDto extends (0, zod_2.createZodDto)(stepUpCode) {
}
class AntiPhishingDto extends (0, zod_2.createZodDto)(stepUpCode.extend({ antiPhishingCode: schemas_1.antiPhishingCodeSchema })) {
}
let SecurityController = class SecurityController {
    totp;
    stepUp;
    prisma;
    audit;
    constructor(totp, stepUp, prisma, audit) {
        this.totp = totp;
        this.stepUp = stepUp;
        this.prisma = prisma;
        this.audit = audit;
    }
    async status(user) {
        const profile = await this.prisma.userProfile.findUnique({ where: { userId: user.id } });
        return {
            ...(await this.totp.status({ userId: user.id })),
            antiPhishingCodeSet: Boolean(profile?.antiPhishingCode),
        };
    }
    enroll(user) {
        return this.totp.enroll({ userId: user.id }, user.handle ? `@${user.handle}` : user.publicId);
    }
    async confirm(user, body) {
        const result = await this.totp.confirm({ userId: user.id }, body.code);
        await this.audit.record({
            actorType: 'user',
            actorId: user.id,
            actorLabel: user.handle,
            action: 'user.2fa.enabled',
            targetType: 'user',
            targetId: user.id,
        });
        return { enabled: true, ...result };
    }
    challenge(user, body) {
        return this.stepUp.challenge(user, body.purpose, body.code);
    }
    async regenerate(user, body, stepUpToken) {
        await this.stepUp.assert(user, 'security_settings', { totpCode: body.code, stepUpToken });
        const row = await this.totp.find({ userId: user.id });
        const backupCodes = await this.totp.regenerateBackupCodes(row.id);
        await this.audit.record({
            actorType: 'user',
            actorId: user.id,
            action: 'user.2fa.backup_codes_regenerated',
            targetType: 'user',
            targetId: user.id,
        });
        return { backupCodes };
    }
    async disable(user, body, stepUpToken) {
        await this.stepUp.assert(user, 'security_settings', { totpCode: body.code, stepUpToken });
        await this.totp.disable({ userId: user.id });
        await this.audit.record({
            actorType: 'user',
            actorId: user.id,
            action: 'user.2fa.disabled',
            targetType: 'user',
            targetId: user.id,
        });
        return { enabled: false };
    }
    async antiPhishing(user, body, stepUpToken) {
        await this.stepUp.assert(user, 'security_settings', { totpCode: body.code, stepUpToken });
        await this.prisma.userProfile.update({
            where: { userId: user.id },
            data: { antiPhishingCode: body.antiPhishingCode },
        });
        await this.audit.record({
            actorType: 'user',
            actorId: user.id,
            action: 'user.anti_phishing.updated',
            targetType: 'user',
            targetId: user.id,
        });
        return { antiPhishingCode: body.antiPhishingCode };
    }
};
exports.SecurityController = SecurityController;
__decorate([
    (0, common_1.Get)('2fa'),
    (0, swagger_1.ApiOperation)({ summary: 'Two-factor status (+ whether an anti-phishing code is set)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "status", null);
__decorate([
    (0, common_1.Post)('2fa/enroll'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Start TOTP enrolment — returns the secret + otpauth:// URI for the QR code',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SecurityController.prototype, "enroll", null);
__decorate([
    (0, common_1.Post)('2fa/confirm'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Confirm enrolment with the first code — returns 10 single-use backup codes (once)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ConfirmTotpDto]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "confirm", null);
__decorate([
    (0, common_1.Post)('2fa/challenge'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Step-up challenge: verify a TOTP / backup code for a purpose → single-use step-up token (5 min)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ChallengeDto]),
    __metadata("design:returntype", void 0)
], SecurityController.prototype, "challenge", null);
__decorate([
    (0, common_1.Post)('2fa/backup-codes'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiHeader)({ name: step_up_service_1.STEP_UP_HEADER, required: false }),
    (0, swagger_1.ApiOperation)({ summary: 'Regenerate backup codes (step-up: security_settings)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)(step_up_service_1.STEP_UP_HEADER)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, StepUpCodeDto, String]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "regenerate", null);
__decorate([
    (0, common_1.Post)('2fa/disable'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiHeader)({ name: step_up_service_1.STEP_UP_HEADER, required: false }),
    (0, swagger_1.ApiOperation)({ summary: 'Disable 2FA (step-up: security_settings)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)(step_up_service_1.STEP_UP_HEADER)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, StepUpCodeDto, String]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "disable", null);
__decorate([
    (0, common_1.Put)('anti-phishing'),
    (0, swagger_1.ApiHeader)({ name: step_up_service_1.STEP_UP_HEADER, required: false }),
    (0, swagger_1.ApiOperation)({
        summary: 'Set the anti-phishing code shown in every email (step-up: security_settings)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)(step_up_service_1.STEP_UP_HEADER)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, AntiPhishingDto, String]),
    __metadata("design:returntype", Promise)
], SecurityController.prototype, "antiPhishing", null);
exports.SecurityController = SecurityController = __decorate([
    (0, swagger_1.ApiTags)('auth · 2FA'),
    (0, guards_1.PlayerAuth)({ onboarded: false }),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [totp_service_1.TotpService,
        step_up_service_1.StepUpService,
        prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], SecurityController);
//# sourceMappingURL=security.controller.js.map