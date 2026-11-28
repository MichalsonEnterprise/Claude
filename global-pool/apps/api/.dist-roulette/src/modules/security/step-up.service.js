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
exports.StepUpService = exports.STEP_UP_HEADER = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const node_crypto_1 = require("node:crypto");
const errors_1 = require("../../common/errors");
const app_config_1 = require("../../config/app-config");
const redis_module_1 = require("../../infra/redis/redis.module");
const totp_service_1 = require("./totp.service");
exports.STEP_UP_HEADER = 'x-step-up-token';
/**
 * Step-up 2FA for withdrawals, whitelist changes and security settings: either a fresh TOTP / backup code in the
 * request, or a single-use step-up token (5 min, bound to user + session + purpose) from POST /auth/2fa/challenge.
 */
let StepUpService = class StepUpService {
    totp;
    jwt;
    config;
    redis;
    constructor(totp, jwt, config, redis) {
        this.totp = totp;
        this.jwt = jwt;
        this.config = config;
        this.redis = redis;
    }
    async challenge(user, purpose, code) {
        const outcome = await this.totp.verifyActive({ userId: user.id }, code);
        const ttl = this.config.env.STEP_UP_TOKEN_TTL;
        const claims = {
            sub: user.id,
            sid: user.sessionId,
            purpose,
            typ: 'step_up',
            jti: (0, node_crypto_1.randomUUID)(),
        };
        const token = await this.jwt.signAsync(claims, {
            secret: this.config.env.JWT_ACCESS_SECRET,
            algorithm: 'HS256',
            expiresIn: ttl,
            issuer: 'globalpool-api',
            audience: 'step-up',
        });
        return {
            stepUpToken: token,
            purpose,
            method: outcome.method,
            expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
        };
    }
    /** Throws STEP_UP_REQUIRED / STEP_UP_LOCKED unless the request carries valid step-up proof. */
    async assert(user, purpose, proof) {
        if (proof.stepUpToken) {
            let claims;
            try {
                claims = await this.jwt.verifyAsync(proof.stepUpToken, {
                    secret: this.config.env.JWT_ACCESS_SECRET,
                    algorithms: ['HS256'],
                    issuer: 'globalpool-api',
                    audience: 'step-up',
                });
            }
            catch {
                throw new errors_1.AppError('STEP_UP_REQUIRED', 'Your security confirmation expired — confirm again', {
                    reason: 'invalid_token',
                    purpose,
                });
            }
            if (claims.typ !== 'step_up' ||
                claims.sub !== user.id ||
                claims.sid !== user.sessionId ||
                claims.purpose !== purpose) {
                throw new errors_1.AppError('STEP_UP_REQUIRED', 'Security confirmation does not match this action', {
                    reason: 'invalid_token',
                    purpose,
                });
            }
            const fresh = await this.redis.set(`gp:stepup:used:${claims.jti}`, '1', 'EX', this.config.env.STEP_UP_TOKEN_TTL + 60, 'NX');
            if (fresh !== 'OK') {
                throw new errors_1.AppError('STEP_UP_REQUIRED', 'This security confirmation was already used', {
                    reason: 'token_reused',
                    purpose,
                });
            }
            return { method: 'step_up_token' };
        }
        if (proof.totpCode) {
            const outcome = await this.totp.verifyActive({ userId: user.id }, proof.totpCode);
            return { method: outcome.method ?? 'totp' };
        }
        const status = await this.totp.status({ userId: user.id });
        throw new errors_1.AppError('STEP_UP_REQUIRED', status.enabled
            ? 'Confirm this action with your authenticator code'
            : 'Set up two-factor authentication first', { reason: status.enabled ? 'code_required' : 'enroll_2fa', purpose });
    }
};
exports.StepUpService = StepUpService;
exports.StepUpService = StepUpService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, redis_module_1.InjectRedis)()),
    __metadata("design:paramtypes", [totp_service_1.TotpService,
        jwt_1.JwtService,
        app_config_1.AppConfig, Function])
], StepUpService);
//# sourceMappingURL=step-up.service.js.map