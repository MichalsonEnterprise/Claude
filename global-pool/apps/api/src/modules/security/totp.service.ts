import { Injectable } from '@nestjs/common';
import type { TotpSecret } from '@prisma/client';
import { generateSecret, generateURI, verify } from 'otplib';
import { randomInt } from 'node:crypto';

import { decryptSecret, encryptSecret, sha256Hex } from '../../common/crypto';
import { AppError } from '../../common/errors';
import { addMinutes } from '../../common/time';
import { AppConfig } from '../../config/app-config';
import { PrismaService } from '../../infra/prisma/prisma.service';

const BACKUP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const BACKUP_CODE_COUNT = 10;
/** ±30 s clock-drift tolerance (one step either side). */
const EPOCH_TOLERANCE_SECONDS = 30;

export type TotpOwner = { userId: string } | { adminUserId: string };

export interface VerifyOutcome {
  ok: boolean;
  method: 'totp' | 'backup_code' | null;
  attemptsRemaining: number;
  lockedUntil: Date | null;
}

const normalizeBackup = (code: string) => code.trim().toUpperCase().replace(/-/g, '');

/**
 * RFC 6238 TOTP (otplib) for player step-up 2FA and mandatory admin MFA. Seeds are AES-256-GCM encrypted at rest;
 * each accepted time step is remembered (`last_used_step`) so a code can never be replayed; repeated failures lock
 * the factor for STEP_UP_LOCK_MINUTES.
 */
@Injectable()
export class TotpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  /** Start (or restart) enrolment: a new pending secret. An ACTIVE factor must be disabled first. */
  async enroll(owner: TotpOwner, label: string): Promise<{ secret: string; otpauthUrl: string; issuer: string }> {
    const existing = await this.find(owner);
    if (existing?.status === 'active') {
      throw new AppError('CONFLICT', 'Two-factor authentication is already enabled');
    }
    const secret = generateSecret();
    const secretEnc = encryptSecret(secret, this.config.totpKey);
    if (existing) {
      await this.prisma.totpSecret.update({
        where: { id: existing.id },
        data: { secretEnc, status: 'pending', failedAttempts: 0, lockedUntil: null, lastUsedStep: null },
      });
    } else {
      await this.prisma.totpSecret.create({ data: { ...owner, secretEnc, status: 'pending' } });
    }
    const issuer = this.config.env.TOTP_ISSUER;
    return { secret, otpauthUrl: generateURI({ issuer, label, secret }), issuer };
  }

  /** Confirm enrolment with the first code → active + fresh backup codes (shown once). */
  async confirm(owner: TotpOwner, code: string): Promise<{ backupCodes: string[] }> {
    const row = await this.find(owner);
    if (!row) throw new AppError('BAD_REQUEST', 'Start two-factor enrolment first');
    if (row.status === 'active') throw new AppError('CONFLICT', 'Two-factor authentication is already enabled');
    const outcome = await this.verifyRow(row, code, { allowBackup: false });
    if (!outcome.ok) this.throwInvalid(outcome);
    await this.prisma.totpSecret.update({
      where: { id: row.id },
      data: { status: 'active', confirmedAt: new Date() },
    });
    return { backupCodes: await this.regenerateBackupCodes(row.id) };
  }

  async regenerateBackupCodes(totpSecretId: string): Promise<string[]> {
    const codes = Array.from({ length: BACKUP_CODE_COUNT }, () => {
      const raw = Array.from({ length: 8 }, () => BACKUP_ALPHABET[randomInt(BACKUP_ALPHABET.length)]).join('');
      return `${raw.slice(0, 4)}-${raw.slice(4)}`;
    });
    await this.prisma.$transaction([
      this.prisma.backupCode.deleteMany({ where: { totpSecretId } }),
      this.prisma.backupCode.createMany({
        data: codes.map((c) => ({ totpSecretId, codeHash: sha256Hex(normalizeBackup(c)) })),
      }),
    ]);
    return codes;
  }

  async disable(owner: TotpOwner): Promise<void> {
    const row = await this.find(owner);
    if (row) await this.prisma.totpSecret.delete({ where: { id: row.id } });
  }

  async status(owner: TotpOwner) {
    const row = await this.find(owner);
    const remaining = row
      ? await this.prisma.backupCode.count({ where: { totpSecretId: row.id, usedAt: null } })
      : 0;
    return {
      enabled: row?.status === 'active',
      pending: row?.status === 'pending',
      method: row?.status === 'active' ? ('authenticator_app' as const) : null,
      backupCodesRemaining: remaining,
      lockedUntil: row?.lockedUntil && row.lockedUntil > new Date() ? row.lockedUntil.toISOString() : null,
    };
  }

  find(owner: TotpOwner) {
    return this.prisma.totpSecret.findUnique({
      where: 'userId' in owner ? { userId: owner.userId } : { adminUserId: owner.adminUserId },
    });
  }

  /** Verify a code for an ACTIVE factor (TOTP, or a single-use backup code when allowed). Throws on failure. */
  async verifyActive(owner: TotpOwner, code: string, options: { allowBackup?: boolean } = {}): Promise<VerifyOutcome> {
    const row = await this.find(owner);
    if (!row || row.status !== 'active') {
      throw new AppError('STEP_UP_REQUIRED', 'Set up two-factor authentication first', {
        reason: 'enroll_2fa',
      });
    }
    const outcome = await this.verifyRow(row, code, { allowBackup: options.allowBackup ?? true });
    if (!outcome.ok) this.throwInvalid(outcome);
    return outcome;
  }

  /** Low-level check with replay protection + lockout bookkeeping. Never throws for a wrong code. */
  async verifyRow(row: TotpSecret, code: string, options: { allowBackup: boolean }): Promise<VerifyOutcome> {
    const { STEP_UP_MAX_ATTEMPTS: max, STEP_UP_LOCK_MINUTES: lockMinutes } = this.config.env;
    const now = new Date();
    if (row.lockedUntil && row.lockedUntil > now) {
      throw new AppError('STEP_UP_LOCKED', 'Too many incorrect codes — try again later', {
        lockedUntil: row.lockedUntil.toISOString(),
      });
    }
    const trimmed = code.trim();
    let method: VerifyOutcome['method'] = null;
    if (/^\d{6}$/.test(trimmed)) {
      const secret = decryptSecret(row.secretEnc, this.config.totpKey);
      const result = await verify({
        secret,
        token: trimmed,
        epochTolerance: EPOCH_TOLERANCE_SECONDS,
        ...(row.lastUsedStep !== null ? { afterTimeStep: row.lastUsedStep } : {}),
      });
      if (result.valid) {
        // Conditional update = atomic replay protection under concurrency.
        const claimed = await this.prisma.totpSecret.updateMany({
          where: {
            id: row.id,
            OR: [{ lastUsedStep: null }, { lastUsedStep: { lt: result.timeStep } }],
          },
          data: { lastUsedStep: result.timeStep, failedAttempts: 0, lockedUntil: null },
        });
        if (claimed.count === 1) method = 'totp';
      }
    } else if (options.allowBackup && /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/.test(trimmed)) {
      const used = await this.prisma.backupCode.updateMany({
        where: { totpSecretId: row.id, codeHash: sha256Hex(normalizeBackup(trimmed)), usedAt: null },
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
    if (method) return { ok: true, method, attemptsRemaining: max, lockedUntil: null };

    const failed = row.failedAttempts + 1;
    const lockedUntil = failed >= max ? addMinutes(now, lockMinutes) : null;
    await this.prisma.totpSecret.update({
      where: { id: row.id },
      data: { failedAttempts: lockedUntil ? 0 : failed, lockedUntil },
    });
    return { ok: false, method: null, attemptsRemaining: lockedUntil ? 0 : max - failed, lockedUntil };
  }

  private throwInvalid(outcome: VerifyOutcome): never {
    if (outcome.lockedUntil) {
      throw new AppError('STEP_UP_LOCKED', 'Too many incorrect codes — try again later', {
        lockedUntil: outcome.lockedUntil.toISOString(),
      });
    }
    throw new AppError('STEP_UP_REQUIRED', 'Incorrect or expired code', {
      reason: 'invalid_code',
      attemptsRemaining: outcome.attemptsRemaining,
    });
  }
}
