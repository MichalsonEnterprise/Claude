import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { canonicalJson, sha256Hex } from '../../common/crypto';
import { AppError } from '../../common/errors';
import { PrismaService, type Tx } from '../../infra/prisma/prisma.service';

export interface IdempotentResult<T> {
  /** true when this response is a replay of an earlier, identical request. */
  replayed: boolean;
  value: T;
}

class ReplayRace extends Error {}

/**
 * Idempotency for financial writes. The key row is inserted INSIDE the business transaction
 * (`INSERT … ON CONFLICT DO NOTHING`), so a concurrent duplicate blocks on the unique index until the first commits
 * and then replays the stored response. A key reused with a different request body is rejected (409).
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async run<T extends Prisma.InputJsonValue>(
    params: { scope: string; ownerId: string; key: string; request: unknown },
    fn: (tx: Tx) => Promise<T>,
  ): Promise<IdempotentResult<T>> {
    const requestHash = sha256Hex(canonicalJson(params.request));
    const existing = await this.find(params);
    if (existing) return this.replay<T>(existing, requestHash);
    try {
      const value = await this.prisma.tx(async (tx) => {
        const inserted = await tx.$queryRaw<{ id: string }[]>`
          INSERT INTO idempotency_keys (id, scope, owner_id, key, request_hash, created_at, updated_at)
          VALUES (gen_random_uuid(), ${params.scope}, ${params.ownerId}, ${params.key}, ${requestHash}, now(), now())
          ON CONFLICT (scope, owner_id, key) DO NOTHING
          RETURNING id::text AS id`;
        const row = inserted[0];
        if (!row) throw new ReplayRace();
        const result = await fn(tx);
        await tx.idempotencyKey.update({
          where: { id: row.id },
          data: { response: result, statusCode: 200, completedAt: new Date() },
        });
        return result;
      });
      return { replayed: false, value };
    } catch (err) {
      if (!(err instanceof ReplayRace)) throw err;
      const row = await this.find(params);
      if (!row) throw new AppError('CONFLICT', 'Concurrent request with the same idempotency key');
      return this.replay<T>(row, requestHash);
    }
  }

  private find(params: { scope: string; ownerId: string; key: string }) {
    return this.prisma.idempotencyKey.findUnique({
      where: {
        scope_ownerId_key: { scope: params.scope, ownerId: params.ownerId, key: params.key },
      },
    });
  }

  private replay<T>(
    row: { requestHash: string; response: Prisma.JsonValue | null; completedAt: Date | null },
    requestHash: string,
  ): IdempotentResult<T> {
    if (row.requestHash !== requestHash) {
      throw new AppError(
        'IDEMPOTENCY_CONFLICT',
        'This idempotency key was already used for a different request',
      );
    }
    if (!row.completedAt || row.response === null) {
      throw new AppError('CONFLICT', 'A request with this idempotency key is still being processed');
    }
    return { replayed: true, value: row.response as T };
  }
}
