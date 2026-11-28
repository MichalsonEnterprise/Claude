import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { commitServerSeed, type SeedInput } from '@gp/shared/fair';
import type { GameSession } from '@prisma/client';

import { decryptSecret, encryptSecret } from '../../../common/crypto';
import { AppError, notFound } from '../../../common/errors';
import { AppConfig } from '../../../config/app-config';
import { PrismaService, type Db, type Tx } from '../../../infra/prisma/prisma.service';
import { gameInfo } from './games-common';

export interface ActivePair {
  session: GameSession;
  serverSeed: string;
}

/**
 * Commit–reveal seed pairs (game_sessions), one ACTIVE pair per player and game:
 * - the server seed is 32 random bytes (64 hex), stored AES-256-GCM encrypted while active; only its SHA-256 is shown;
 * - the client seed is the player's (editable); the nonce counts bets of the pair (0, 1, 2 …);
 * - rotating reveals the server seed (stored in plain from then on) and commits a new one. A pair cannot rotate
 *   while a stateful round (Twenty-One hand, Vault Sweeper board, High Card run) of that game is still open,
 *   because revealing would expose the rest of that round.
 * Nothing here can choose or change an outcome: outcomes are a pure function of (server seed, client seed, nonce).
 */
@Injectable()
export class SeedsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  private newServerSeed(): string {
    return randomBytes(32).toString('hex');
  }

  private defaultClientSeed(): string {
    return `gp-${randomBytes(5).toString('hex')}`;
  }

  async gameRow(db: Db, slug: string) {
    gameInfo(slug);
    const game = await db.game.findUnique({ where: { slug } });
    if (!game || !game.enabled) throw notFound('Game', { slug });
    return game;
  }

  /** The active pair of a player for a game (created on first use), row-locked FOR UPDATE. */
  async lockActive(tx: Tx, userId: string, gameId: string): Promise<ActivePair> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id::text AS id FROM game_sessions
        WHERE user_id = ${userId}::uuid AND game_id = ${gameId}::uuid AND status = 'active'
        FOR UPDATE`;
      const id = rows[0]?.id;
      if (id) {
        const session = await tx.gameSession.findUniqueOrThrow({ where: { id } });
        if (!session.serverSeedEnc) {
          // legacy DEMO history pair without an encrypted seed: close it (its seed is already public) and start fresh
          await tx.gameSession.update({
            where: { id },
            data: { status: 'finished', endedAt: new Date() },
          });
          continue;
        }
        return { session, serverSeed: decryptSecret(session.serverSeedEnc, this.config.totpKey) };
      }
      await this.insertPair(tx, userId, gameId, this.defaultClientSeed());
    }
    throw new AppError('CONFLICT', 'Could not open a seed pair — try again');
  }

  private async insertPair(tx: Tx, userId: string, gameId: string, clientSeed: string) {
    const serverSeed = this.newServerSeed();
    await tx.$executeRaw`
      INSERT INTO game_sessions (id, user_id, game_id, status, server_seed_hash, server_seed, server_seed_enc,
                                 client_seed, nonce, is_simulation, started_at, created_at, updated_at)
      VALUES (gen_random_uuid(), ${userId}::uuid, ${gameId}::uuid, 'active', ${commitServerSeed(serverSeed)}, NULL,
              ${encryptSecret(serverSeed, this.config.totpKey)}, ${clientSeed}, 0, true, now(), now(), now())
      ON CONFLICT (user_id, game_id) WHERE status = 'active' DO NOTHING`;
  }

  /** Reserves the next nonce of a locked pair and returns the seed input for that bet. */
  async takeNonce(tx: Tx, pair: ActivePair): Promise<SeedInput> {
    const nonce = pair.session.nonce;
    await tx.gameSession.update({ where: { id: pair.session.id }, data: { nonce: nonce + 1 } });
    pair.session.nonce = nonce + 1;
    return { serverSeed: pair.serverSeed, clientSeed: pair.session.clientSeed, nonce };
  }

  /** Server seed of a pair for continuing a stateful round (decrypted, or plain once revealed). */
  serverSeedOf(session: GameSession): string {
    if (session.serverSeed) return session.serverSeed;
    if (!session.serverSeedEnc)
      throw new AppError('INTERNAL_ERROR', 'Seed pair has no server seed');
    return decryptSecret(session.serverSeedEnc, this.config.totpKey);
  }

  pairView(s: GameSession) {
    const revealed = s.status !== 'active';
    return {
      id: s.id,
      status: s.status,
      serverSeedHash: s.serverSeedHash,
      serverSeed: revealed ? s.serverSeed : null,
      clientSeed: s.clientSeed,
      /** Next nonce (= bets made with this pair). */
      nonce: s.nonce,
      bets: s.nonce,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
    };
  }

  /** GET /games/:slug/seeds — active commitment + revealed pairs (newest first). */
  async view(userId: string, slug: string) {
    const game = await this.gameRow(this.prisma, slug);
    const active = await this.prisma.tx(
      async (tx) => (await this.lockActive(tx, userId, game.id)).session,
    );
    const revealed = await this.prisma.gameSession.findMany({
      where: { userId, gameId: game.id, status: 'finished' },
      orderBy: { endedAt: 'desc' },
      take: 20,
    });
    return {
      game: { slug: game.slug, name: game.name },
      active: this.pairView(active),
      revealed: revealed.map((r) => this.pairView(r)),
      howItWorks:
        'Outcome = f(HMAC-SHA256(server seed, "client seed:nonce:cursor")). The server seed hash is fixed before you bet; rotate to reveal the seed and verify every bet made with it.',
      isDemo: true,
    };
  }

  /** Reveal the active pair and commit a new one (optionally with a new client seed). */
  async rotate(userId: string, slug: string, clientSeed?: string) {
    const game = await this.gameRow(this.prisma, slug);
    return this.prisma.tx(async (tx) => {
      const pair = await this.lockActive(tx, userId, game.id);
      const open = await tx.gameResult.count({
        where: { sessionId: pair.session.id, status: 'active' },
      });
      if (open > 0) {
        throw new AppError('CONFLICT', 'Finish the round in progress before changing seeds', {
          reason: 'ROUND_IN_PROGRESS',
        });
      }
      const now = new Date();
      const finished = await tx.gameSession.update({
        where: { id: pair.session.id },
        data: {
          status: 'finished',
          serverSeed: pair.serverSeed,
          serverSeedEnc: null,
          endedAt: now,
        },
      });
      await this.insertPair(tx, userId, game.id, clientSeed ?? pair.session.clientSeed);
      const next = await this.lockActive(tx, userId, game.id);
      return {
        revealed: this.pairView(finished),
        active: this.pairView(next.session),
        isDemo: true,
      };
    });
  }
}
