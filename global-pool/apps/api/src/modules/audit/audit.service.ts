import { Injectable } from '@nestjs/common';
import { Prisma, type AuditActorType } from '@prisma/client';

import { PrismaService, type Tx } from '../../infra/prisma/prisma.service';
import { GENESIS_HASH, auditHash, verifyChain, type ChainVerification } from './audit-hash';

/** Advisory-lock key that serialises appends to the audit hash chain. */
const AUDIT_CHAIN_LOCK = 7_262_001;

export interface AuditEntry {
  actorType: AuditActorType;
  actorId?: string | null;
  actorLabel?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  reason?: string | null;
  outcome?: 'success' | 'failure' | 'pending_approval';
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

const REDACTED_KEYS = new Set([
  'password',
  'mfaCode',
  'totpCode',
  'code',
  'refreshToken',
  'secret',
]);

/** Drop secrets from metadata before it is hashed and stored. */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        REDACTED_KEYS.has(k) ? '[redacted]' : redact(v),
      ]),
    );
  }
  return value;
}

/**
 * Append-only, hash-chained audit log. Each row stores prev_hash and hash = sha256(prev_hash + row); appends are
 * serialised with a transaction-scoped advisory lock so the chain never forks. UPDATE/DELETE are blocked by DB
 * triggers. Call `record(entry, tx)` inside the business transaction so the audit row commits atomically with it.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, tx?: Tx): Promise<{ id: string; seq: string; hash: string }> {
    if (!tx) return this.prisma.tx((t) => this.record(entry, t));
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_CHAIN_LOCK})`;
    const last = await tx.auditLog.findFirst({ orderBy: { seq: 'desc' }, select: { hash: true } });
    const createdAt = new Date();
    const metadata = (redact(entry.metadata ?? {}) ?? {}) as Record<string, unknown>;
    const row = {
      prevHash: last?.hash ?? GENESIS_HASH,
      actorType: entry.actorType,
      actorId: entry.actorId ?? null,
      actorLabel: entry.actorLabel ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      reason: entry.reason ?? null,
      outcome: entry.outcome ?? 'success',
      metadata,
      createdAt,
    };
    const hash = auditHash(row);
    const created = await tx.auditLog.create({
      data: {
        ...row,
        metadata: metadata as Prisma.InputJsonObject,
        hash,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        requestId: entry.requestId ?? null,
      },
      select: { id: true, seq: true, hash: true },
    });
    return { id: created.id, seq: created.seq.toString(), hash: created.hash };
  }

  /** Re-compute the whole chain (batched). */
  async verify(batchSize = 1000): Promise<ChainVerification & { total: number }> {
    let prev = GENESIS_HASH;
    let checked = 0;
    let cursor: bigint | undefined;
    for (;;) {
      const rows = await this.prisma.auditLog.findMany({
        where: cursor !== undefined ? { seq: { gt: cursor } } : {},
        orderBy: { seq: 'asc' },
        take: batchSize,
      });
      if (rows.length === 0) break;
      const result = verifyChain(rows, prev);
      if (!result.ok)
        return { ...result, checked: checked + result.checked, total: checked + rows.length };
      checked += rows.length;
      prev = result.headHash;
      cursor = rows[rows.length - 1]!.seq;
    }
    return {
      ok: true,
      checked,
      headHash: prev,
      firstBrokenSeq: null,
      problem: null,
      total: checked,
    };
  }
}
