import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { ServerOptions } from 'socket.io';

import { redisOptionsFromUrl } from './redis/redis-options';

/** The socket.io Server type @nestjs/platform-socket.io was built against (may differ by patch version). */
type IoServer = Parameters<IoAdapter['close']>[0];

export interface GpIoAdapterOptions {
  /**
   * Redis URL for the socket.io Redis adapter (SOCKET_IO_REDIS_ADAPTER=true): broadcasts such as `pool:update`
   * reach clients connected to ANY API replica (pub/sub fan-out). null = in-process adapter (single replica).
   */
  redisUrl?: string | null;
  /** Channel prefix so several deployments can share one Redis. */
  keyPrefix?: string;
}

/**
 * socket.io adapter with CORS from CORS_ORIGINS (decorator options are evaluated before env files load) and an
 * optional Redis adapter for multi-replica deployments.
 */
export class GpIoAdapter extends IoAdapter {
  private readonly redisClients: Redis[] = [];

  constructor(
    app: INestApplicationContext,
    private readonly origins: string[],
    private readonly options: GpIoAdapterOptions = {},
  ) {
    super(app);
  }

  /** True when broadcasts are shared through Redis. */
  get usesRedis(): boolean {
    return Boolean(this.options.redisUrl);
  }

  override createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: this.origins, credentials: true },
      serveClient: false,
    }) as IoServer;
    if (this.options.redisUrl) {
      const pub = new Redis({ ...redisOptionsFromUrl(this.options.redisUrl), lazyConnect: false });
      const sub = pub.duplicate();
      this.redisClients.push(pub, sub);
      server.adapter(
        createAdapter(pub, sub, { key: `${this.options.keyPrefix ?? 'gp'}:socket.io` }),
      );
    }
    return server;
  }

  override async close(server: IoServer): Promise<void> {
    await super.close(server);
    await Promise.all(this.redisClients.splice(0).map((c) => c.quit().catch(() => undefined)));
  }
}
