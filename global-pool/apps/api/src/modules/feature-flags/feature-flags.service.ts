import { Injectable } from '@nestjs/common';

import { AppError } from '../../common/errors';
import { AppConfig } from '../../config/app-config';
import { PrismaService } from '../../infra/prisma/prisma.service';

/** Default flags (seeded). `real_money.enabled` is informational: REAL_MONEY_ENABLED is a hard env kill switch. */
export const DEFAULT_FLAGS: { key: string; enabled: boolean; description: string }[] = [
  {
    key: 'pool.entries.enabled',
    enabled: true,
    description: 'Players can buy Global Pool entries',
  },
  { key: 'deposits.enabled', enabled: true, description: 'Deposit addresses + watcher (testnet)' },
  { key: 'withdrawals.enabled', enabled: true, description: 'Withdrawal requests (testnet)' },
  {
    key: 'games.simulation.enabled',
    enabled: true,
    description: 'Games run as non-monetary simulations',
  },
  {
    key: 'real_money.enabled',
    enabled: false,
    description: 'Locked off — mirrors REAL_MONEY_ENABLED=false',
  },
];

@Injectable()
export class FeatureFlagsService {
  private cache: { at: number; flags: Map<string, boolean> } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  async isEnabled(key: string): Promise<boolean> {
    if (key === 'real_money.enabled') return this.config.env.REAL_MONEY_ENABLED;
    const flags = await this.flags();
    return flags.get(key) ?? DEFAULT_FLAGS.find((f) => f.key === key)?.enabled ?? false;
  }

  /** Throws SERVICE_UNAVAILABLE when an operational kill switch is off. */
  async assertEnabled(key: string, what: string): Promise<void> {
    if (!(await this.isEnabled(key))) {
      throw new AppError('SERVICE_UNAVAILABLE', `${what} is temporarily paused`, { flag: key });
    }
  }

  async list() {
    const rows = await this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
    const keys = new Set(rows.map((r) => r.key));
    return [
      ...rows.map((r) => ({
        key: r.key,
        enabled: r.key === 'real_money.enabled' ? false : r.enabled,
        description: r.description,
      })),
      ...DEFAULT_FLAGS.filter((f) => !keys.has(f.key)),
    ];
  }

  /** Drop the 15 s cache so a flag change (e.g. the dual-approved circuit breaker) applies at once. */
  invalidate(): void {
    this.cache = null;
  }

  private async flags(): Promise<Map<string, boolean>> {
    if (this.cache && Date.now() - this.cache.at < 15_000) return this.cache.flags;
    const rows = await this.prisma.featureFlag.findMany();
    const flags = new Map(rows.map((r) => [r.key, r.enabled]));
    this.cache = { at: Date.now(), flags };
    return flags;
  }
}
