import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { Redis } from 'ioredis';

import { AppConfig } from '../../config/app-config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { InjectRedis } from '../../infra/redis/redis.module';

type Check = { status: 'up' | 'down'; latencyMs: number; error?: string };

async function timed(fn: () => Promise<unknown>): Promise<Check> {
  const started = performance.now();
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2_000)),
    ]);
    return { status: 'up', latencyMs: Math.round(performance.now() - started) };
  } catch (err) {
    return {
      status: 'down',
      latencyMs: Math.round(performance.now() - started),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness + readiness: PostgreSQL and Redis checks (503 when a dependency is down)' })
  async health(@Res({ passthrough: true }) res: Response) {
    const [database, redis] = await Promise.all([
      timed(() => this.prisma.$queryRaw`SELECT 1`),
      timed(() => this.redis.ping()),
    ]);
    const ok = database.status === 'up' && redis.status === 'up';
    res.status(ok ? 200 : 503);
    return {
      status: ok ? 'ok' : 'degraded',
      service: '@gp/api',
      version: process.env.npm_package_version ?? '0.1.0',
      environment: this.config.env.NODE_ENV,
      demoMode: this.config.env.DEMO_MODE,
      realMoneyEnabled: this.config.env.REAL_MONEY_ENABLED,
      chainEnv: this.config.env.CHAIN_ENV,
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      checks: { database, redis },
      time: new Date().toISOString(),
    };
  }
}
