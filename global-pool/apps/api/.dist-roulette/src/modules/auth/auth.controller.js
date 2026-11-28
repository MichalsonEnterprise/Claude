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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const schemas_1 = require("@gp/shared/schemas");
const zod_1 = require("zod");
const errors_1 = require("../../common/errors");
const request_1 = require("../../common/request");
const zod_2 = require("../../common/zod");
const app_config_1 = require("../../config/app-config");
const users_service_1 = require("../users/users.service");
const auth_service_1 = require("./auth.service");
const guards_1 = require("./guards");
const player_identity_service_1 = require("./player-identity.service");
const privy_service_1 = require("./privy.service");
class OnboardingDto extends (0, zod_2.createZodDto)(schemas_1.onboardingSchema) {
}
class DevTokenDto extends (0, zod_2.createZodDto)(zod_1.z.object({
    did: zod_1.z
        .string()
        .regex(/^did:privy:[A-Za-z0-9:_-]{3,120}$/)
        .optional(),
    email: schemas_1.emailSchema.optional(),
    wallet: zod_1.z
        .string()
        .regex(/^0x[0-9a-fA-F]{40}$/)
        .optional(),
    ttlSeconds: zod_1.z.number().int().min(60).max(86_400).optional(),
})) {
}
let AuthController = class AuthController {
    identity;
    privy;
    auth;
    users;
    config;
    constructor(identity, privy, auth, users, config) {
        this.identity = identity;
        this.privy = privy;
        this.auth = auth;
        this.users = users;
        this.config = config;
    }
    authConfig() {
        return {
            mode: this.privy.mode,
            privyAppId: this.privy.mode === 'privy' ? this.config.env.PRIVY_APP_ID : null,
            devTokenEndpoint: this.privy.mode === 'mock' ? '/auth/dev/token' : null,
        };
    }
    async session(req, meta) {
        const token = (0, guards_1.extractBearer)(req);
        if (!token)
            throw new errors_1.AppError('UNAUTHENTICATED', 'Sign in to continue');
        const { user, created } = await this.identity.authenticate(token, meta, { forceSync: true });
        return {
            created,
            onboardingRequired: !user.onboarded,
            sessionId: user.sessionId,
            user: await this.users.me(user.id),
        };
    }
    async onboarding(user, body, req) {
        await this.auth.onboard(user, body, req);
        return this.users.me(user.id);
    }
    logout(user) {
        return this.users.revokeSession(user, user.sessionId, 'logout');
    }
    devToken(body) {
        if (this.privy.mode !== 'mock')
            throw new errors_1.AppError('NOT_FOUND', 'Cannot POST /auth/dev/token');
        return this.privy.issueMockToken({
            did: body.did,
            email: body.email,
            wallets: body.wallet ? [{ address: body.wallet, chainType: 'ethereum' }] : undefined,
            ttlSeconds: body.ttlSeconds,
        });
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('config'),
    (0, swagger_1.ApiOperation)({ summary: 'Player auth mode: privy | mock (DEV MOCK, offline) | disabled' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "authConfig", null);
__decorate([
    (0, common_1.Post)('session'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiBearerAuth)('player'),
    (0, swagger_1.ApiOperation)({
        summary: 'Call after Privy login: verifies the token, upserts the user (privy_user_id), syncs linked email/wallets',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, request_1.ReqMeta)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "session", null);
__decorate([
    (0, common_1.Post)('onboarding'),
    (0, common_1.HttpCode)(200),
    (0, guards_1.PlayerAuth)({ onboarded: false }),
    (0, swagger_1.ApiOperation)({
        summary: 'First-login onboarding: consents (never pre-checked) + country + handle',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, OnboardingDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "onboarding", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(200),
    (0, guards_1.PlayerAuth)({ onboarded: false }),
    (0, swagger_1.ApiOperation)({
        summary: 'Revoke the current session for this API (call Privy logout on the client too)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('dev/token'),
    (0, common_1.HttpCode)(200),
    (0, throttler_1.Throttle)({
        default: { limit: () => Number(process.env.DEV_TOKEN_THROTTLE_LIMIT ?? 30), ttl: 60_000 },
    }),
    (0, swagger_1.ApiOperation)({
        summary: 'DEV MOCK only (never in production): issue a locally signed player token. DEMO user: did:privy:demo-nova-k',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [DevTokenDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "devToken", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [player_identity_service_1.PlayerIdentityService,
        privy_service_1.PrivyService,
        auth_service_1.AuthService,
        users_service_1.UsersService,
        app_config_1.AppConfig])
], AuthController);
//# sourceMappingURL=auth.controller.js.map