"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuthService = exports.hashAdminPassword = exports.ARGON2_OPTIONS = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const argon2 = __importStar(require("argon2"));
const node_crypto_1 = require("node:crypto");
const crypto_1 = require("../../common/crypto");
const errors_1 = require("../../common/errors");
const time_1 = require("../../common/time");
const app_config_1 = require("../../config/app-config");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const totp_service_1 = require("../security/totp.service");
/** argon2id parameters (OWASP 2024 baseline: m=19 MiB, t=2, p=1). */
exports.ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
};
const INVALID = 'Invalid email, password or authenticator code';
const hashAdminPassword = (password) => argon2.hash(password, exports.ARGON2_OPTIONS);
exports.hashAdminPassword = hashAdminPassword;
/**
 * Admin authentication — fully separate from players (no Privy): email + argon2id password + MANDATORY TOTP in one
 * step, lockout after ADMIN_LOGIN_MAX_ATTEMPTS failures, short-lived access JWT (ADMIN_JWT_ACCESS_SECRET) and an
 * opaque rotating refresh token whose family is revoked on reuse.
 */
let AdminAuthService = class AdminAuthService {
    prisma;
    jwt;
    config;
    totp;
    audit;
    dummyHash = null;
    constructor(prisma, jwt, config, totp, audit) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
        this.totp = totp;
        this.audit = audit;
    }
    async login(input, meta) {
        const admin = await this.prisma.adminUser.findUnique({ where: { email: input.email } });
        if (!admin || admin.status !== 'active') {
            // Equalise timing so responses do not reveal which emails exist.
            await argon2.verify(await this.getDummyHash(), input.password).catch(() => false);
            await this.audit.record({
                actorType: 'system',
                action: 'admin.login.failed',
                reason: 'unknown_or_disabled',
                ip: meta.ip,
                userAgent: meta.userAgent,
                requestId: meta.requestId,
                outcome: 'failure',
                metadata: { emailHash: (0, crypto_1.sha256Hex)(input.email) },
            });
            throw new errors_1.AppError('UNAUTHENTICATED', INVALID);
        }
        const now = new Date();
        if (admin.lockedUntil && admin.lockedUntil > now) {
            throw new errors_1.AppError('FORBIDDEN', 'This admin account is temporarily locked after failed sign-ins', {
                lockedUntil: admin.lockedUntil.toISOString(),
            });
        }
        const passwordOk = await argon2.verify(admin.passwordHash, input.password).catch(() => false);
        let totpOk = false;
        if (passwordOk) {
            const secret = await this.totp.find({ adminUserId: admin.id });
            if (secret?.status === 'active') {
                totpOk = (await this.totp.verifyRow(secret, input.totpCode, { allowBackup: false })).ok;
            }
        }
        if (!passwordOk || !totpOk) {
            const attempts = admin.failedLoginAttempts + 1;
            const lock = attempts >= this.config.env.ADMIN_LOGIN_MAX_ATTEMPTS;
            await this.prisma.adminUser.update({
                where: { id: admin.id },
                data: {
                    failedLoginAttempts: lock ? 0 : attempts,
                    lockedUntil: lock
                        ? (0, time_1.addMinutes)(now, this.config.env.ADMIN_LOCKOUT_MINUTES)
                        : admin.lockedUntil,
                },
            });
            await this.audit.record({
                actorType: 'admin',
                actorId: admin.id,
                actorLabel: admin.name,
                action: lock ? 'admin.login.locked' : 'admin.login.failed',
                reason: passwordOk ? 'invalid_totp' : 'invalid_password',
                outcome: 'failure',
                ip: meta.ip,
                userAgent: meta.userAgent,
                requestId: meta.requestId,
                metadata: { attempts },
            });
            throw new errors_1.AppError('UNAUTHENTICATED', INVALID, lock ? { locked: true } : undefined);
        }
        await this.prisma.adminUser.update({
            where: { id: admin.id },
            data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now },
        });
        const familyId = (0, node_crypto_1.randomUUID)();
        const tokens = await this.issue(admin.id, familyId, null, new Date(now.getTime() + this.config.env.ADMIN_SESSION_TTL * 1000), meta);
        await this.audit.record({
            actorType: 'admin',
            actorId: admin.id,
            actorLabel: admin.name,
            action: 'admin.login',
            ip: meta.ip,
            userAgent: meta.userAgent,
            requestId: meta.requestId,
            metadata: { familyId },
        });
        return { ...tokens, admin: await this.profile(admin.id) };
    }
    /** Rotate the refresh token. Re-using a rotated token revokes the whole family (token theft signal). */
    async refresh(refreshToken, meta) {
        const row = await this.prisma.session.findUnique({
            where: { refreshTokenHash: (0, crypto_1.sha256Hex)(refreshToken) },
        });
        if (!row || row.subject !== 'admin' || !row.adminUserId || !row.familyId) {
            throw new errors_1.AppError('UNAUTHENTICATED', 'Invalid refresh token');
        }
        if (row.rotatedAt) {
            await this.revokeFamily(row.familyId, 'refresh_token_reuse');
            await this.audit.record({
                actorType: 'admin',
                actorId: row.adminUserId,
                action: 'admin.session.reuse_detected',
                targetType: 'session',
                targetId: row.familyId,
                outcome: 'failure',
                ip: meta.ip,
                requestId: meta.requestId,
            });
            throw new errors_1.AppError('UNAUTHENTICATED', 'Session revoked — sign in again');
        }
        if (row.revokedAt || (row.expiresAt && row.expiresAt <= new Date())) {
            throw new errors_1.AppError('UNAUTHENTICATED', 'Session expired — sign in again');
        }
        const rotated = await this.prisma.session.updateMany({
            where: { id: row.id, rotatedAt: null },
            data: { rotatedAt: new Date() },
        });
        if (rotated.count !== 1)
            throw new errors_1.AppError('UNAUTHENTICATED', 'Session revoked — sign in again');
        return this.issue(row.adminUserId, row.familyId, row.id, row.expiresAt, meta);
    }
    async logout(admin) {
        await this.revokeFamily(admin.sessionFamilyId, 'logout');
        return { signedOut: true };
    }
    /** Verify an access token → admin with live roles/permissions (revocation takes effect immediately). */
    async authenticate(token) {
        let claims;
        try {
            claims = await this.jwt.verifyAsync(token, {
                secret: this.config.env.ADMIN_JWT_ACCESS_SECRET,
                algorithms: ['HS256'],
                issuer: 'globalpool-api',
                audience: 'admin',
            });
        }
        catch {
            throw new errors_1.AppError('UNAUTHENTICATED', 'Admin session expired — sign in again');
        }
        if (claims.typ !== 'admin_access')
            throw new errors_1.AppError('UNAUTHENTICATED', 'Invalid admin token');
        const live = await this.prisma.session.findFirst({
            where: {
                familyId: claims.sid,
                adminUserId: claims.sub,
                revokedAt: null,
                rotatedAt: null,
                expiresAt: { gt: new Date() },
            },
            select: { id: true },
        });
        if (!live)
            throw new errors_1.AppError('UNAUTHENTICATED', 'Admin session revoked — sign in again');
        const profile = await this.profile(claims.sub);
        if (profile.status !== 'active')
            throw new errors_1.AppError('UNAUTHENTICATED', 'Admin account disabled');
        return {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            roles: profile.roles,
            permissions: profile.permissions,
            sessionFamilyId: claims.sid,
        };
    }
    async profile(adminId) {
        const admin = await this.prisma.adminUser.findUniqueOrThrow({
            where: { id: adminId },
            include: {
                roles: {
                    include: { role: { include: { permissions: { include: { permission: true } } } } },
                },
            },
        });
        const permissions = [
            ...new Set(admin.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key))),
        ].sort();
        return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            title: admin.title,
            status: admin.status,
            roles: admin.roles.map((r) => r.role.key),
            permissions,
            lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
            isDemo: admin.isDemo,
        };
    }
    async issue(adminId, familyId, parentId, expiresAt, meta) {
        const refreshToken = (0, crypto_1.randomToken)(48);
        await this.prisma.session.create({
            data: {
                subject: 'admin',
                adminUserId: adminId,
                familyId,
                parentId,
                refreshTokenHash: (0, crypto_1.sha256Hex)(refreshToken),
                expiresAt,
                ip: meta.ip,
                userAgent: meta.userAgent?.slice(0, 512) ?? null,
            },
        });
        const ttl = Math.min(this.config.env.ADMIN_ACCESS_TTL, Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)));
        const claims = { sub: adminId, sid: familyId, typ: 'admin_access' };
        const accessToken = await this.jwt.signAsync(claims, {
            secret: this.config.env.ADMIN_JWT_ACCESS_SECRET,
            algorithm: 'HS256',
            issuer: 'globalpool-api',
            audience: 'admin',
            expiresIn: ttl,
        });
        return {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: ttl,
            sessionExpiresAt: expiresAt.toISOString(),
        };
    }
    async revokeFamily(familyId, reason) {
        await this.prisma.session.updateMany({
            where: { familyId, revokedAt: null },
            data: { revokedAt: new Date(), revokedReason: reason },
        });
    }
    getDummyHash() {
        this.dummyHash ??= argon2.hash((0, crypto_1.randomToken)(16), exports.ARGON2_OPTIONS);
        return this.dummyHash;
    }
};
exports.AdminAuthService = AdminAuthService;
exports.AdminAuthService = AdminAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        app_config_1.AppConfig,
        totp_service_1.TotpService,
        audit_service_1.AuditService])
], AdminAuthService);
//# sourceMappingURL=admin-auth.service.js.map