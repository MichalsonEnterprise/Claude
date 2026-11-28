import { Injectable } from '@nestjs/common';
import type { Game, GameCategory } from '@prisma/client';

import { notFound } from '../../common/errors';
import { PrismaService } from '../../infra/prisma/prisma.service';

/** Game catalogue (DB). Games are NON-MONETARY simulations until separately approved (mode = simulation). */
@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(category?: GameCategory) {
    const rows = await this.prisma.game.findMany({
      where: { enabled: true, ...(category ? { category } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((g) => this.view(g));
  }

  async bySlug(slug: string) {
    const game = await this.prisma.game.findUnique({ where: { slug } });
    if (!game || !game.enabled) throw notFound('Game');
    return this.view(game);
  }

  view(g: Game) {
    return {
      id: g.id,
      slug: g.slug,
      name: g.name,
      category: g.category,
      mechanic: g.mechanic,
      houseEdgePercent: g.houseEdgePercent?.toFixed(2) ?? null,
      edgeLabel: g.edgeLabel,
      icon: g.icon,
      players: g.playersDemo,
      details: g.details,
      mode: g.mode,
      realMoney: false,
      isDemo: g.isDemo,
    };
  }
}
