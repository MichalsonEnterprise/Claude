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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuthService = exports.sessionRef = exports.hashAdminPassword = exports.ARGON2_OPTIONS = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const argon2 = __importStar(require("argon2"));
const node_crypto_1 = require("node:crypto");
const crypto_1 = require("../../common/crypto");
const errors_1 = require("../../common/errors");
const time_1 = require("../../common/time");
const app_config_1 = require("../../config/app-config");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const redis_module_1 = require("../../infra/redis/redis.module");
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
/** Audit-safe reference for a refresh-token family (the raw id is the `sid` of admin access tokens). */
const sessionRef = (familyId) => `as_${(0, crypto_1.sha256Hex)(familyId).slice(0, 16)}`;
exports.sessionRef = sessionRef;
/** `sessions.last_seen_at` is written at most once a minute per admin session. */
const LAST_SEEN_WRITE_MS = 60_000;
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
    redis;
    dummyHash = null;
    constructor(prisma, jwt, config, totp, audit, redis) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
        this.totp = totp;
        this.audit = audit;
        this.redis = redis;
    }
    async login(input, meta) {
        const emailHash = (0, crypto_1.sha256Hex)(input.email);
        const admin = await this.prisma.adminUser.findUnique({ where: { email: input.email } });
        const now = new Date();
        if (!admin || admin.status !== 'active') {
            // Unknown / disabled emails get exactly the responses a real account gets (same lockout after the same
            // number of attempts, counted per email hash), so neither the 401 nor the 403 reveals which emails exist.
            const slot = await this.reserveUnknownEmailAttempt(emailHash, now);
            // Equalise timing so responses do not reveal which emails exist.
            await argon2.verify(await this.getDummyHash(), input.password).catch(() => false);
            if (slot.lockedUntil && !slot.lockedNow)
                throw this.lockedError(slot.lockedUntil);
            await this.audit.record({
                actorType: 'system',
                action: 'admin.login.failed',
                reason: 'unknown_or_disabled',
                ip: meta.ip,
                userAgent: meta.userAgent,
                requestId: meta.requestId,
                outcome: 'failure',
                metadata: { emailHash },
            });
            throw new errors_1.AppError('UNAUTHENTICATED', INVALID, slot.lockedNow ? { locked: true } : undefined);
        }
        // Count the attempt BEFORE checking anything (row lock on the fresh row): parallel guesses cannot share one
        // stale counter, the lock lands on the last allowed attempt and a slow request can never clear it.
        const slot = await this.reserveAdminAttempt(admin.id, now);
        if (slot.lockedUntil && !slot.lockedNow) {
            await argon2.verify(await this.getDummyHash(), input.password).catch(() => false);
            throw this.lockedError(slot.lockedUntil);
        }
        const passwordOk = await argon2.verify(admin.passwordHash, input.password).catch(() => false);
        let totpOk = false;
        if (passwordOk) {
            const secret = await this.totp.find({ adminUserId: admin.id });
            if (secret?.status === 'active') {
                // A locked TOTP factor is a plain failure here (generic 401), never a 423 that would confirm the password.
                totpOk = (await this.totp.verifyRow(secret, input.totpCode, { allowBackup: false })).ok;
            }
        }
        if (!passwordOk || !totpOk) {
            await this.audit.record({
                actorType: 'admin',
                actorId: admin.id,
                actorLabel: admin.name,
                action: slot.lockedNow ? 'admin.login.locked' : 'admin.login.failed',
                reason: passwordOk ? 'invalid_totp' : 'invalid_password',
                outcome: 'failure',
                ip: meta.ip,
                userAgent: meta.userAgent,
                requestId: meta.requestId,
                metadata: { attempts: slot.attempts },
            });
            throw new errors_1.AppError('UNAUTHENTICATED', INVALID, slot.lockedNow ? { locked: true } : undefined);
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
            // Never the raw family id: it is the `sid` of the admin access token (audit readers must not learn it).
            metadata: { sessionRef: (0, exports.sessionRef)(familyId) },
        });
        return { ...tokens, admin: await this.profile(admin.id) };
    }
    lockedError(lockedUntil) {
        return new errors_1.AppError('FORBIDDEN', 'This admin account is temporarily locked after failed sign-ins', {
            lockedUntil: lockedUntil.toISOString(),
        });
    }
    /** One login attempt against an admin row (see login). The 5th attempt sets the lock and still gets checked. */
    reserveAdminAttempt(adminId, now) {
        const { ADMIN_LOGIN_MAX_ATTEMPTS: max, ADMIN_LOCKOUT_MINUTES: minutes } = this.config.env;
        return this.prisma.tx(async (tx) => {
            await tx.$queryRaw `SELECT id FROM admin_users WHERE id = ${adminId}::uuid FOR UPDATE`;
            const fresh = await tx.adminUser.findUniqueOrThrow({
                where: { id: adminId },
                select: { failedLoginAttempts: true, lockedUntil: true },
            });
            if (fresh.lockedUntil && fresh.lockedUntil > now) {
                return { attempts: 0, lockedUntil: fresh.lockedUntil, lockedNow: false };
            }
            const attempts = fresh.failedLoginAttempts + 1;
            const lockedUntil = attempts >= max ? (0, time_1.addMinutes)(now, minutes) : null;
            await tx.adminUser.update({
                where: { id: adminId },
                data: lockedUntil
                    ? { failedLoginAttempts: 0, lockedUntil }
                    : { failedLoginAttempts: attempts, lockedUntil: null },
            });
            return { attempts, lockedUntil, lockedNow: lockedUntil !== null };
        });
    }
    /** Same bookkeeping for an email with no active admin, kept in Redis per email hash (atomic INCR). */
    async reserveUnknownEmailAttempt(emailHash, now) {
        const { ADMIN_LOGIN_MAX_ATTEMPTS: max, ADMIN_LOCKOUT_MINUTES: minutes } = this.config.env;
        const key = `gp:admin-login:unknown:${emailHash}`;
        const lockKey = `${key}:locked-until`;
        const locked = await this.redis.get(lockKey);
        if (locked && new Date(locked) > now)
            return { lockedUntil: new Date(locked), lockedNow: false };
        const attempts = await this.redis.incr(key);
        if (attempts === 1)
            await this.redis.expire(key, 86_400);
        if (attempts < max)
            return { lockedUntil: null, lockedNow: false };
        const until = (0, time_1.addMinutes)(now, minutes);
        await this.redis.set(lockKey, until.toISOString(), 'EX', minutes * 60);
        await this.redis.del(key);
        return { lockedUntil: until, lockedNow: true };
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
                targetId: (0, exports.sessionRef)(row.familyId),
                outcome: 'failure',
                ip: meta.ip,
                requestId: meta.requestId,
            });
            throw new errors_1.AppError('UNAUTHENTICATED', 'Session revoked — sign in again');
        }
        if (row.revokedAt || (row.expiresAt && row.expiresAt <= new Date())) {
            throw new errors_1.AppError('UNAUTHENTICATED', 'Session expired — sign in again');
        }
        // Server-side idle timeout (ADM-01: 15 min) — a closed / restored tab cannot revive an idle session.
        await this.assertNotIdle(row.familyId, row.adminUserId, row.lastSeenAt, meta);
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
        const now = new Date();
        const live = await this.prisma.session.findFirst({
            where: {
                familyId: claims.sid,
                adminUserId: claims.sub,
                revokedAt: null,
                rotatedAt: null,
                expiresAt: { gt: now },
            },
            select: { id: true, lastSeenAt: true },
        });
        if (!live)
            throw new errors_1.AppError('UNAUTHENTICATED', 'Admin session revoked — sign in again');
        await this.assertNotIdle(claims.sid, claims.sub, live.lastSeenAt);
        // Activity = authenticated admin requests (throttled write). Refresh rotation starts a new row at "now".
        if (now.getTime() - live.lastSeenAt.getTime() > LAST_SEEN_WRITE_MS) {
            await this.prisma.session.updateMany({
                where: { id: live.id, lastSeenAt: { lt: now } },
                data: { lastSeenAt: now },
            });
        }
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
    /** Revoke the family and refuse when the session saw no admin request for ADMIN_IDLE_TIMEOUT. */
    async assertNotIdle(familyId, adminId, lastSeenAt, meta) {
        const idleMs = this.config.env.ADMIN_IDLE_TIMEOUT * 1000;
        if (Date.now() - lastSeenAt.getTime() <= idleMs)
            return;
        await this.revokeFamily(familyId, 'idle_timeout');
        await this.audit.record({
            actorType: 'system',
            action: 'admin.session.idle_timeout',
            targetType: 'session',
            targetId: (0, exports.sessionRef)(familyId),
            outcome: 'failure',
            ip: meta?.ip ?? null,
            requestId: meta?.requestId ?? null,
            metadata: { adminId, lastSeenAt: lastSeenAt.toISOString() },
        });
        throw new errors_1.AppError('UNAUTHENTICATED', 'Admin session ended after inactivity — sign in again', {
            reason: 'idle_timeout',
        });
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
    __param(5, (0, redis_module_1.InjectRedis)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        app_config_1.AppConfig,
        totp_service_1.TotpService,
        audit_service_1.AuditService, Function])
], AdminAuthService);
//# sourceMappingURL=admin-auth.service.js.map