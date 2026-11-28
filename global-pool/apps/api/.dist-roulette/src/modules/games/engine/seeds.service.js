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
exports.SeedsService = void 0;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const fair_1 = require("@gp/shared/fair");
const crypto_1 = require("../../../common/crypto");
const errors_1 = require("../../../common/errors");
const app_config_1 = require("../../../config/app-config");
const prisma_service_1 = require("../../../infra/prisma/prisma.service");
const games_common_1 = require("./games-common");
/**
 * Commit–reveal seed pairs (game_sessions), one ACTIVE pair per player and game:
 * - the server seed is 32 random bytes (64 hex), stored AES-256-GCM encrypted while active; only its SHA-256 is shown;
 * - the client seed is the player's (editable); the nonce counts bets of the pair (0, 1, 2 …);
 * - rotating reveals the server seed (stored in plain from then on) and commits a new one. A pair cannot rotate
 *   while a stateful round (Twenty-One hand, Vault Sweeper board, High Card run) of that game is still open,
 *   because revealing would expose the rest of that round.
 * Nothing here can choose or change an outcome: outcomes are a pure function of (server seed, client seed, nonce).
 */
let SeedsService = class SeedsService {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    newServerSeed() {
        return (0, node_crypto_1.randomBytes)(32).toString('hex');
    }
    defaultClientSeed() {
        return `gp-${(0, node_crypto_1.randomBytes)(5).toString('hex')}`;
    }
    async gameRow(db, slug) {
        (0, games_common_1.gameInfo)(slug);
        const game = await db.game.findUnique({ where: { slug } });
        if (!game || !game.enabled)
            throw (0, errors_1.notFound)('Game', { slug });
        return game;
    }
    /** The active pair of a player for a game (created on first use), row-locked FOR UPDATE. */
    async lockActive(tx, userId, gameId) {
        for (let attempt = 0; attempt < 3; attempt++) {
            const rows = await tx.$queryRaw `
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
                return { session, serverSeed: (0, crypto_1.decryptSecret)(session.serverSeedEnc, this.config.totpKey) };
            }
            await this.insertPair(tx, userId, gameId, this.defaultClientSeed());
        }
        throw new errors_1.AppError('CONFLICT', 'Could not open a seed pair — try again');
    }
    async insertPair(tx, userId, gameId, clientSeed) {
        const serverSeed = this.newServerSeed();
        await tx.$executeRaw `
      INSERT INTO game_sessions (id, user_id, game_id, status, server_seed_hash, server_seed, server_seed_enc,
                                 client_seed, nonce, is_simulation, started_at, created_at, updated_at)
      VALUES (gen_random_uuid(), ${userId}::uuid, ${gameId}::uuid, 'active', ${(0, fair_1.commitServerSeed)(serverSeed)}, NULL,
              ${(0, crypto_1.encryptSecret)(serverSeed, this.config.totpKey)}, ${clientSeed}, 0, true, now(), now(), now())
      ON CONFLICT (user_id, game_id) WHERE status = 'active' DO NOTHING`;
    }
    /** Reserves the next nonce of a locked pair and returns the seed input for that bet. */
    async takeNonce(tx, pair) {
        const nonce = pair.session.nonce;
        await tx.gameSession.update({ where: { id: pair.session.id }, data: { nonce: nonce + 1 } });
        pair.session.nonce = nonce + 1;
        return { serverSeed: pair.serverSeed, clientSeed: pair.session.clientSeed, nonce };
    }
    /** Server seed of a pair for continuing a stateful round (decrypted, or plain once revealed). */
    serverSeedOf(session) {
        if (session.serverSeed)
            return session.serverSeed;
        if (!session.serverSeedEnc)
            throw new errors_1.AppError('INTERNAL_ERROR', 'Seed pair has no server seed');
        return (0, crypto_1.decryptSecret)(session.serverSeedEnc, this.config.totpKey);
    }
    pairView(s) {
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
    async view(userId, slug) {
        const game = await this.gameRow(this.prisma, slug);
        const active = await this.prisma.tx(async (tx) => (await this.lockActive(tx, userId, game.id)).session);
        const revealed = await this.prisma.gameSession.findMany({
            where: { userId, gameId: game.id, status: 'finished' },
            orderBy: { endedAt: 'desc' },
            take: 20,
        });
        return {
            game: { slug: game.slug, name: game.name },
            active: this.pairView(active),
            revealed: revealed.map((r) => this.pairView(r)),
            howItWorks: 'Outcome = f(HMAC-SHA256(server seed, "client seed:nonce:cursor")). The server seed hash is fixed before you bet; rotate to reveal the seed and verify every bet made with it.',
            isDemo: true,
        };
    }
    /** Reveal the active pair and commit a new one (optionally with a new client seed). */
    async rotate(userId, slug, clientSeed) {
        const game = await this.gameRow(this.prisma, slug);
        return this.prisma.tx(async (tx) => {
            const pair = await this.lockActive(tx, userId, game.id);
            const open = await tx.gameResult.count({
                where: { sessionId: pair.session.id, status: 'active' },
            });
            if (open > 0) {
                throw new errors_1.AppError('CONFLICT', 'Finish the round in progress before changing seeds', {
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
};
exports.SeedsService = SeedsService;
exports.SeedsService = SeedsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_config_1.AppConfig])
], SeedsService);
//# sourceMappingURL=seeds.service.js.map