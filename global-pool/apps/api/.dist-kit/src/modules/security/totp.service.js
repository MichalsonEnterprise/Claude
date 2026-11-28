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
exports.TotpService = exports.BACKUP_CODE_COUNT = void 0;
const common_1 = require("@nestjs/common");
const otplib_1 = require("otplib");
const node_crypto_1 = require("node:crypto");
const crypto_1 = require("../../common/crypto");
const errors_1 = require("../../common/errors");
const time_1 = require("../../common/time");
const app_config_1 = require("../../config/app-config");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const BACKUP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
exports.BACKUP_CODE_COUNT = 10;
/** ±30 s clock-drift tolerance (one step either side). */
const EPOCH_TOLERANCE_SECONDS = 30;
const normalizeBackup = (code) => code.trim().toUpperCase().replace(/-/g, '');
/**
 * RFC 6238 TOTP (otplib) for player step-up 2FA and mandatory admin MFA. Seeds are AES-256-GCM encrypted at rest;
 * each accepted time step is remembered (`last_used_step`) so a code can never be replayed; repeated failures lock
 * the factor for STEP_UP_LOCK_MINUTES.
 */
let TotpService = class TotpService {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    /** Start (or restart) enrolment: a new pending secret. An ACTIVE factor must be disabled first. */
    async enroll(owner, label) {
        const existing = await this.find(owner);
        if (existing?.status === 'active') {
            throw new errors_1.AppError('CONFLICT', 'Two-factor authentication is already enabled');
        }
        const secret = (0, otplib_1.generateSecret)();
        const secretEnc = (0, crypto_1.encryptSecret)(secret, this.config.totpKey);
        if (existing) {
            await this.prisma.totpSecret.update({
                where: { id: existing.id },
                data: {
                    secretEnc,
                    status: 'pending',
                    failedAttempts: 0,
                    lockedUntil: null,
                    lastUsedStep: null,
                },
            });
        }
        else {
            await this.prisma.totpSecret.create({ data: { ...owner, secretEnc, status: 'pending' } });
        }
        const issuer = this.config.env.TOTP_ISSUER;
        return { secret, otpauthUrl: (0, otplib_1.generateURI)({ issuer, label, secret }), issuer };
    }
    /** Confirm enrolment with the first code → active + fresh backup codes (shown once). */
    async confirm(owner, code) {
        const row = await this.find(owner);
        if (!row)
            throw new errors_1.AppError('BAD_REQUEST', 'Start two-factor enrolment first');
        if (row.status === 'active')
            throw new errors_1.AppError('CONFLICT', 'Two-factor authentication is already enabled');
        const outcome = await this.verifyRow(row, code, { allowBackup: false });
        if (!outcome.ok)
            this.throwInvalid(outcome);
        await this.prisma.totpSecret.update({
            where: { id: row.id },
            data: { status: 'active', confirmedAt: new Date() },
        });
        return { backupCodes: await this.regenerateBackupCodes(row.id) };
    }
    async regenerateBackupCodes(totpSecretId) {
        const codes = Array.from({ length: exports.BACKUP_CODE_COUNT }, () => {
            const raw = Array.from({ length: 8 }, () => BACKUP_ALPHABET[(0, node_crypto_1.randomInt)(BACKUP_ALPHABET.length)]).join('');
            return `${raw.slice(0, 4)}-${raw.slice(4)}`;
        });
        await this.prisma.$transaction([
            this.prisma.backupCode.deleteMany({ where: { totpSecretId } }),
            this.prisma.backupCode.createMany({
                data: codes.map((c) => ({ totpSecretId, codeHash: (0, crypto_1.sha256Hex)(normalizeBackup(c)) })),
            }),
        ]);
        return codes;
    }
    async disable(owner) {
        const row = await this.find(owner);
        if (row)
            await this.prisma.totpSecret.delete({ where: { id: row.id } });
    }
    async status(owner) {
        const row = await this.find(owner);
        const remaining = row
            ? await this.prisma.backupCode.count({ where: { totpSecretId: row.id, usedAt: null } })
            : 0;
        return {
            enabled: row?.status === 'active',
            pending: row?.status === 'pending',
            method: row?.status === 'active' ? 'authenticator_app' : null,
            backupCodesRemaining: remaining,
            lockedUntil: row?.lockedUntil && row.lockedUntil > new Date() ? row.lockedUntil.toISOString() : null,
        };
    }
    find(owner) {
        return this.prisma.totpSecret.findUnique({
            where: 'userId' in owner ? { userId: owner.userId } : { adminUserId: owner.adminUserId },
        });
    }
    /** Verify a code for an ACTIVE factor (TOTP, or a single-use backup code when allowed). Throws on failure. */
    async verifyActive(owner, code, options = {}) {
        const row = await this.find(owner);
        if (!row || row.status !== 'active') {
            throw new errors_1.AppError('STEP_UP_REQUIRED', 'Set up two-factor authentication first', {
                reason: 'enroll_2fa',
            });
        }
        const outcome = await this.verifyRow(row, code, { allowBackup: options.allowBackup ?? true });
        if (!outcome.ok)
            this.throwInvalid(outcome);
        return outcome;
    }
    /** Low-level check with replay protection + lockout bookkeeping. Never throws for a wrong code. */
    async verifyRow(row, code, options) {
        const { STEP_UP_MAX_ATTEMPTS: max, STEP_UP_LOCK_MINUTES: lockMinutes } = this.config.env;
        const now = new Date();
        if (row.lockedUntil && row.lockedUntil > now) {
            throw new errors_1.AppError('STEP_UP_LOCKED', 'Too many incorrect codes — try again later', {
                lockedUntil: row.lockedUntil.toISOString(),
            });
        }
        const trimmed = code.trim();
        let method = null;
        if (/^\d{6}$/.test(trimmed)) {
            const secret = (0, crypto_1.decryptSecret)(row.secretEnc, this.config.totpKey);
            const result = await (0, otplib_1.verify)({
                secret,
                token: trimmed,
                epochTolerance: EPOCH_TOLERANCE_SECONDS,
                ...(row.lastUsedStep !== null ? { afterTimeStep: row.lastUsedStep } : {}),
            });
            const step = result.valid && 'timeStep' in result ? result.timeStep : null;
            if (step !== null) {
                // Conditional update = atomic replay protection under concurrency.
                const claimed = await this.prisma.totpSecret.updateMany({
                    where: {
                        id: row.id,
                        OR: [{ lastUsedStep: null }, { lastUsedStep: { lt: step } }],
                    },
                    data: { lastUsedStep: step, failedAttempts: 0, lockedUntil: null },
                });
                if (claimed.count === 1)
                    method = 'totp';
            }
        }
        else if (options.allowBackup && /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/.test(trimmed)) {
            const used = await this.prisma.backupCode.updateMany({
                where: {
                    totpSecretId: row.id,
                    codeHash: (0, crypto_1.sha256Hex)(normalizeBackup(trimmed)),
                    usedAt: null,
                },
                data: { usedAt: now },
            });
            if (used.count === 1) {
                method = 'backup_code';
                await this.prisma.totpSecret.update({
                    where: { id: row.id },
                    data: { failedAttempts: 0, lockedUntil: null },
                });
            }
        }
        if (method)
            return { ok: true, method, attemptsRemaining: max, lockedUntil: null };
        const failed = row.failedAttempts + 1;
        const lockedUntil = failed >= max ? (0, time_1.addMinutes)(now, lockMinutes) : null;
        await this.prisma.totpSecret.update({
            where: { id: row.id },
            data: { failedAttempts: lockedUntil ? 0 : failed, lockedUntil },
        });
        return {
            ok: false,
            method: null,
            attemptsRemaining: lockedUntil ? 0 : max - failed,
            lockedUntil,
        };
    }
    throwInvalid(outcome) {
        if (outcome.lockedUntil) {
            throw new errors_1.AppError('STEP_UP_LOCKED', 'Too many incorrect codes — try again later', {
                lockedUntil: outcome.lockedUntil.toISOString(),
            });
        }
        throw new errors_1.AppError('STEP_UP_REQUIRED', 'Incorrect or expired code', {
            reason: 'invalid_code',
            attemptsRemaining: outcome.attemptsRemaining,
        });
    }
};
exports.TotpService = TotpService;
exports.TotpService = TotpService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_config_1.AppConfig])
], TotpService);
//# sourceMappingURL=totp.service.js.map