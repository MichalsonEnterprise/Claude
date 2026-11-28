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
exports.PlayerAuth = exports.PlayerPolicy = exports.PlayerPolicyGuard = exports.PrivyAuthGuard = exports.WITHDRAWAL_POLICY = exports.DEPOSIT_POLICY = exports.GAMING_POLICY = exports.PLAYER_POLICY = void 0;
exports.extractBearer = extractBearer;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const errors_1 = require("../../common/errors");
const request_1 = require("../../common/request");
const geo_service_1 = require("../compliance/geo.service");
const responsible_gaming_service_1 = require("../compliance/responsible-gaming.service");
const restrictions_service_1 = require("../compliance/restrictions.service");
const player_identity_service_1 = require("./player-identity.service");
exports.PLAYER_POLICY = 'gp:player-policy';
/** Gaming routes (entries, game sessions). */
exports.GAMING_POLICY = {
    onboarded: true,
    region: true,
    notSelfExcluded: true,
    blockedBy: ['account_suspended', 'gaming_blocked'],
};
/** Deposit routes. */
exports.DEPOSIT_POLICY = {
    onboarded: true,
    region: true,
    notSelfExcluded: true,
    blockedBy: ['account_suspended', 'deposits_blocked'],
};
/** Withdrawals stay available while self-excluded or travelling (no obstruction); AML freezes still apply. */
exports.WITHDRAWAL_POLICY = {
    onboarded: true,
    blockedBy: ['withdrawals_frozen'],
};
function extractBearer(req) {
    const header = req.get('authorization');
    if (header?.startsWith('Bearer '))
        return header.slice(7).trim() || null;
    const cookie = req.headers.cookie
        ?.split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('privy-token='));
    return cookie ? decodeURIComponent(cookie.slice('privy-token='.length)) : null;
}
/** Verifies the Privy access token (or DEV MOCK token) and attaches `req.user`. */
let PrivyAuthGuard = class PrivyAuthGuard {
    identity;
    constructor(identity) {
        this.identity = identity;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const token = extractBearer(req);
        if (!token)
            throw new errors_1.AppError('UNAUTHENTICATED', 'Sign in to continue');
        const { user } = await this.identity.authenticate(token, {
            ip: req.ip ?? null,
            userAgent: req.get('user-agent') ?? null,
            requestId: (0, request_1.requestIdOf)(req),
        });
        req.user = user;
        return true;
    }
};
exports.PrivyAuthGuard = PrivyAuthGuard;
exports.PrivyAuthGuard = PrivyAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [player_identity_service_1.PlayerIdentityService])
], PrivyAuthGuard);
/** Enforces onboarding, geo, self-exclusion and admin restrictions per route policy. */
let PlayerPolicyGuard = class PlayerPolicyGuard {
    reflector;
    geo;
    rg;
    restrictions;
    constructor(reflector, geo, rg, restrictions) {
        this.reflector = reflector;
        this.geo = geo;
        this.rg = rg;
        this.restrictions = restrictions;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        if (!user)
            throw new errors_1.AppError('UNAUTHENTICATED', 'Sign in to continue');
        const policy = this.reflector.getAllAndOverride(exports.PLAYER_POLICY, [
            context.getHandler(),
            context.getClass(),
        ]) ?? {};
        if ((policy.onboarded ?? true) && !user.onboarded) {
            throw new errors_1.AppError('ONBOARDING_REQUIRED', 'Finish setting up your account first');
        }
        if (policy.blockedBy?.length) {
            const active = await this.restrictions.active(user.id);
            const hit = active.find((r) => policy.blockedBy.includes(r));
            if (hit) {
                throw new errors_1.AppError('FORBIDDEN', 'This action is restricted on your account — contact support', {
                    restriction: hit,
                });
            }
        }
        if (policy.region)
            await this.geo.assertPermitted(req, user.country);
        if (policy.notSelfExcluded)
            await this.rg.assertNotSelfExcluded(user.id);
        return true;
    }
};
exports.PlayerPolicyGuard = PlayerPolicyGuard;
exports.PlayerPolicyGuard = PlayerPolicyGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        geo_service_1.GeoService,
        responsible_gaming_service_1.ResponsibleGamingService,
        restrictions_service_1.RestrictionsService])
], PlayerPolicyGuard);
/** Route/class metadata only (use on methods to override the class policy). */
const PlayerPolicy = (policy) => (0, common_1.SetMetadata)(exports.PLAYER_POLICY, policy);
exports.PlayerPolicy = PlayerPolicy;
/** Player-authenticated controller/route: Privy (or DEV MOCK) bearer token + policy checks. */
const PlayerAuth = (policy = {}) => (0, common_1.applyDecorators)((0, common_1.SetMetadata)(exports.PLAYER_POLICY, policy), (0, common_1.UseGuards)(PrivyAuthGuard, PlayerPolicyGuard), (0, swagger_1.ApiBearerAuth)('player'));
exports.PlayerAuth = PlayerAuth;
//# sourceMappingURL=guards.js.map