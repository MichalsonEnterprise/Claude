import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FAIR_GAMES, FAIR_GAME_SLUGS } from '@gp/shared/fair';
import { money } from '@gp/shared/money';
import { z } from 'zod';

import { createZodDto } from '../../common/zod';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AdminAuth, RequirePermissions } from '../admin/admin.guards';
import { CrashEngineService } from './engine/crash.service';
import { credits, refOf } from './engine/games-common';

class AdminBetsQueryDto extends createZodDto(
  z.object({
    game: z.string().optional(),
    userId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  }),
) {}

const NO_CONTROLS =
  'Read-only monitoring. Outcomes come only from committed seeds: there is no endpoint, flag or tool to choose, edit, re-roll or bias a result, change odds per player or adjust DEMO balances.';

/**
 * Admin game monitoring (permission games.read) — READ-ONLY. Measured RTP is shown next to the published RTP;
 * the live Orbit Rush round never exposes its crash point before the crash.
 */
@ApiTags('admin · games (read-only)')
@Controller('admin/games')
@AdminAuth()
@RequirePermissions('games.read')
export class AdminGamesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crash: CrashEngineService,
  ) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Per game (24 h / 30 d): bets, wagered, returned, measured vs published RTP, open rounds',
  })
  async overview() {
    const now = Date.now();
    const d1 = new Date(now - 86_400_000);
    const d30 = new Date(now - 30 * 86_400_000);
    const games = await this.prisma.game.findMany({ where: { slug: { in: FAIR_GAME_SLUGS } } });
    const rows = await Promise.all(
      games.map(async (g) => {
        const info = FAIR_GAMES[g.slug as keyof typeof FAIR_GAMES];
        const window = async (since: Date) => {
          if (g.slug === 'orbit-rush') {
            const a = await this.prisma.crashBet.aggregate({
              where: { createdAt: { gte: since }, status: { not: 'active' } },
              _sum: { stake: true, payout: true },
              _count: true,
            });
            return { bets: a._count, stake: a._sum.stake, payout: a._sum.payout };
          }
          const a = await this.prisma.gameResult.aggregate({
            where: { gameId: g.id, status: 'settled', createdAt: { gte: since } },
            _sum: { stake: true, payout: true },
            _count: true,
          });
          return { bets: a._count, stake: a._sum.stake, payout: a._sum.payout };
        };
        const view = (w: Awaited<ReturnType<typeof window>>) => {
          const staked = money(credits(w.stake));
          const paid = money(credits(w.payout));
          return {
            bets: w.bets,
            wagered: credits(w.stake),
            returned: credits(w.payout),
            measuredRtpPercent: staked.gt(0) ? paid.div(staked).times(100).toFixed(2) : null,
          };
        };
        const open =
          g.slug === 'orbit-rush'
            ? await this.prisma.crashBet.count({ where: { status: 'active' } })
            : await this.prisma.gameResult.count({ where: { gameId: g.id, status: 'active' } });
        return {
          slug: g.slug,
          name: g.name,
          enabled: g.enabled,
          mode: g.mode,
          publishedHouseEdgePercent: info.houseEdgePercent,
          publishedRtpPercent: info.rtpPercent,
          limits: {
            minBet: info.minBet,
            maxBet: info.maxBet,
            tableMax: info.tableMax ?? null,
            maxPayout: info.maxPayout ?? null,
          },
          rulesVersion: info.rulesVersion,
          last24h: view(await window(d1)),
          last30d: view(await window(d30)),
          openRounds: open,
        };
      }),
    );
    return { games: rows, currency: 'DEMO', controls: 'none', note: NO_CONTROLS, isDemo: true };
  }

  @Get('bets')
  @ApiOperation({ summary: 'Recent settled / open bets (filter by game slug or user id)' })
  async bets(@Query() q: AdminBetsQueryDto) {
    const where = {
      ...(q.userId ? { userId: q.userId } : {}),
      ...(q.game ? { session: { game: { slug: q.game } } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.gameResult.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          session: {
            include: {
              game: { select: { slug: true, name: true } },
              user: { select: { publicId: true, handle: true } },
            },
          },
        },
      }),
      this.prisma.gameResult.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        ref: refOf(r.session.game.slug, r.refNumber),
        game: r.session.game,
        player: {
          id: r.session.userId,
          publicId: r.session.user.publicId,
          handle: r.session.user.handle,
        },
        status: r.status,
        stake: credits(r.stake),
        payout: credits(r.payout),
        nonce: r.nonce,
        serverSeedHash: r.session.serverSeedHash,
        seedRevealed: r.session.status !== 'active',
        createdAt: r.createdAt.toISOString(),
      })),
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
      controls: 'none',
      note: NO_CONTROLS,
      isDemo: true,
    };
  }

  @Get('orbit-rush/rounds')
  @ApiOperation({
    summary: 'Orbit Rush rounds: live round (commitment only) + crashed rounds with seeds',
  })
  async crashRounds(@Query() q: AdminBetsQueryDto) {
    const snapshot = await this.crash.snapshot();
    return {
      live: snapshot.round,
      history: await this.crash.rounds(q.page, q.pageSize),
      controls: 'none',
      note: NO_CONTROLS,
    };
  }
}
