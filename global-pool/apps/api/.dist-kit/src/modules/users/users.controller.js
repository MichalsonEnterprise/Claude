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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const schemas_1 = require("@gp/shared/schemas");
const zod_1 = require("zod");
const request_1 = require("../../common/request");
const zod_2 = require("../../common/zod");
const audit_service_1 = require("../audit/audit.service");
const guards_1 = require("../auth/guards");
const step_up_service_1 = require("../security/step-up.service");
const users_service_1 = require("./users.service");
class UpdateProfileDto extends (0, zod_2.createZodDto)(zod_1.z
    .object({
    displayName: zod_1.z.string().trim().min(1).max(40).optional(),
    marketingOptIn: zod_1.z.boolean().optional(),
})
    .strict()) {
}
class WhitelistDto extends (0, zod_2.createZodDto)(schemas_1.whitelistAddressSchema) {
}
class StepUpBodyDto extends (0, zod_2.createZodDto)(zod_1.z.object({ totpCode: schemas_1.totpCodeSchema.optional() })) {
}
let UsersController = class UsersController {
    users;
    stepUp;
    audit;
    constructor(users, stepUp, audit) {
        this.users = users;
        this.stepUp = stepUp;
        this.audit = audit;
    }
    me(user) {
        return this.users.me(user.id);
    }
    update(user, body) {
        return this.users.updateProfile(user.id, body);
    }
    sessions(user) {
        return this.users.sessions(user);
    }
    async revoke(user, id) {
        const result = await this.users.revokeSession(user, id);
        await this.audit.record({
            actorType: 'user',
            actorId: user.id,
            action: 'user.session.revoked',
            targetType: 'session',
            targetId: id,
        });
        return result;
    }
    wallets(user) {
        return this.users.wallets(user.id);
    }
    async whitelist(user, body, stepUpToken) {
        await this.stepUp.assert(user, 'whitelist_change', { totpCode: body.totpCode, stepUpToken });
        const wallet = await this.users.whitelist(user.id, body);
        await this.audit.record({
            actorType: 'user',
            actorId: user.id,
            action: 'user.whitelist.added',
            targetType: 'user_wallet',
            targetId: wallet.id,
            metadata: { network: body.network, address: wallet.address },
        });
        return wallet;
    }
    async unwhitelist(user, id, body, stepUpToken) {
        await this.stepUp.assert(user, 'whitelist_change', { totpCode: body.totpCode, stepUpToken });
        const result = await this.users.removeFromWhitelist(user.id, id);
        await this.audit.record({
            actorType: 'user',
            actorId: user.id,
            action: 'user.whitelist.removed',
            targetType: 'user_wallet',
            targetId: id,
        });
        return result;
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Current player profile (onboardingRequired = consents still missing)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "me", null);
__decorate([
    (0, common_1.Patch)(),
    (0, guards_1.PlayerPolicy)({ onboarded: true }),
    (0, swagger_1.ApiOperation)({ summary: 'Update display name / marketing opt-in' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateProfileDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "update", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, swagger_1.ApiOperation)({ summary: 'Signed-in devices / sessions' }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "sessions", null);
__decorate([
    (0, common_1.Delete)('sessions/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Sign a device out (revokes that Privy session for this API)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "revoke", null);
__decorate([
    (0, common_1.Get)('wallets'),
    (0, swagger_1.ApiOperation)({ summary: 'Linked wallets (Privy) and whitelisted withdrawal addresses' }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "wallets", null);
__decorate([
    (0, common_1.Post)('wallets/whitelist'),
    (0, guards_1.PlayerPolicy)({ onboarded: true }),
    (0, swagger_1.ApiHeader)({ name: step_up_service_1.STEP_UP_HEADER, required: false }),
    (0, swagger_1.ApiOperation)({
        summary: 'Whitelist a withdrawal address (step-up: whitelist_change; 24 h cool-down)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)(step_up_service_1.STEP_UP_HEADER)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, WhitelistDto, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "whitelist", null);
__decorate([
    (0, common_1.Delete)('wallets/:id/whitelist'),
    (0, swagger_1.ApiHeader)({ name: step_up_service_1.STEP_UP_HEADER, required: false }),
    (0, swagger_1.ApiOperation)({ summary: 'Remove an address from the whitelist (step-up: whitelist_change)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Headers)(step_up_service_1.STEP_UP_HEADER)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, StepUpBodyDto, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "unwhitelist", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('users'),
    (0, guards_1.PlayerAuth)({ onboarded: false }),
    (0, common_1.Controller)('me'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        step_up_service_1.StepUpService,
        audit_service_1.AuditService])
], UsersController);
//# sourceMappingURL=users.controller.js.map