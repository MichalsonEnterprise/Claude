import { Logger, type OnModuleDestroy } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayInit,
} from '@nestjs/websockets';
import { cashOutSchema, crashBetSchema } from '@gp/shared/fair';
import { makeErrorEnvelope } from '@gp/shared/schemas';
import type { Request } from 'express';
import type { Subscription } from 'rxjs';
import type { Namespace, Socket } from 'socket.io';

import { AppError } from '../../../common/errors';
import type { AuthUser } from '../../../common/request';
import { GeoService } from '../../compliance/geo.service';
import { RestrictionsService } from '../../compliance/restrictions.service';
import { PlayerIdentityService } from '../../auth/player-identity.service';
import { CrashEngineService } from './crash.service';

interface SocketData {
  user?: AuthUser;
}

/**
 * Orbit Rush live rounds — socket.io namespace `/crash`.
 * Server → client: `crash:snapshot` (on connect / `crash:subscribe`), `crash:phase` (betting / running), `crash:tick`
 * (every 100 ms frame: multiplier), `crash:bet`, `crash:cashout`, `crash:crashed` (crash point + revealed seed).
 * Client → server (authenticated with `auth.token` = player bearer token): `crash:bet` and `crash:cashout`, answered
 * through the ack callback with `{ ok: true, bet }` or `{ ok: false, error }` (shared error envelope). The same
 * policy as the REST routes applies (onboarding, restrictions, region, self-exclusion, RG limits, DEMO credits).
 * Auto cash-out runs on the server, so a dropped connection never loses an armed target.
 */
@WebSocketGateway({ namespace: '/crash', transports: ['websocket', 'polling'] })
export class CrashGateway implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy {
  private readonly logger = new Logger(CrashGateway.name);
  private subscription?: Subscription;

  @WebSocketServer() server!: Namespace;

  constructor(
    private readonly engine: CrashEngineService,
    private readonly identity: PlayerIdentityService,
    private readonly restrictions: RestrictionsService,
    private readonly geo: GeoService,
  ) {}

  afterInit(): void {
    this.subscription = this.engine.events$.subscribe((e) => {
      switch (e.type) {
        case 'phase':
          this.server.emit('crash:phase', e.round);
          break;
        case 'tick':
          this.server.emit('crash:tick', e);
          break;
        case 'bet':
          this.server.emit('crash:bet', e);
          break;
        case 'cashout':
          this.server.emit('crash:cashout', e);
          break;
        case 'crashed':
          this.server.emit('crash:crashed', e.round);
          break;
      }
    });
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = this.tokenOf(client);
    if (token) {
      try {
        const { user } = await this.identity.authenticate(token, {
          ip: client.handshake.address ?? null,
          userAgent: client.handshake.headers['user-agent'] ?? null,
          requestId: null,
        });
        (client.data as SocketData).user = user;
      } catch {
        client.emit('crash:auth', { ok: false });
      }
    }
    try {
      client.emit('crash:snapshot', await this.engine.snapshot());
    } catch (err) {
      this.logger.warn(`snapshot failed: ${String(err)}`);
    }
  }

  @SubscribeMessage('crash:subscribe')
  async onSubscribe(@ConnectedSocket() client: Socket) {
    client.emit('crash:snapshot', await this.engine.snapshot());
    return { ok: true };
  }

  @SubscribeMessage('crash:bet')
  async onBet(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return this.run(client, async (user) => {
      const parsed = crashBetSchema.safeParse(body);
      if (!parsed.success) throw new AppError('VALIDATION_FAILED', 'Invalid bet');
      await this.assertPolicy(client, user, true);
      return { bet: await this.engine.placeBet(user, parsed.data) };
    });
  }

  @SubscribeMessage('crash:cashout')
  async onCashOut(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return this.run(client, async (user) => {
      const b = (body ?? {}) as { betId?: unknown };
      const parsed = cashOutSchema.safeParse(body);
      if (!parsed.success || typeof b.betId !== 'string') {
        throw new AppError('VALIDATION_FAILED', 'betId and idempotencyKey are required');
      }
      await this.assertPolicy(client, user, false);
      return { bet: await this.engine.cashOut(user, b.betId, parsed.data) };
    });
  }

  private tokenOf(client: Socket): string | null {
    const auth = client.handshake.auth as { token?: unknown } | undefined;
    if (typeof auth?.token === 'string' && auth.token) return auth.token;
    const header = client.handshake.headers.authorization;
    return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
  }

  /** Same checks as GAMING_POLICY on the REST routes (cash-out of an existing bet only needs the account). */
  private async assertPolicy(client: Socket, user: AuthUser, newStake: boolean) {
    if (!user.onboarded)
      throw new AppError('ONBOARDING_REQUIRED', 'Finish setting up your account first');
    const active = await this.restrictions.active(user.id);
    const blocked = active.find(
      (r) => r === 'account_suspended' || (newStake && r === 'gaming_blocked'),
    );
    if (blocked) {
      throw new AppError(
        'FORBIDDEN',
        'This action is restricted on your account — contact support',
        {
          restriction: blocked,
        },
      );
    }
    if (newStake) {
      const headers = client.handshake.headers;
      const shim = {
        get: (name: string) => {
          const v = headers[name.toLowerCase()];
          return Array.isArray(v) ? v[0] : v;
        },
      } as unknown as Request;
      await this.geo.assertPermitted(shim, user.country);
    }
  }

  private async run(client: Socket, fn: (user: AuthUser) => Promise<Record<string, unknown>>) {
    const user = (client.data as SocketData).user;
    try {
      if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in to place bets');
      return { ok: true, ...(await fn(user)) };
    } catch (err) {
      if (err instanceof AppError) return { ok: false, ...(err.getResponse() as object) };
      this.logger.error(`crash socket action failed: ${String(err)}`);
      return { ok: false, ...makeErrorEnvelope('INTERNAL_ERROR', 'Something went wrong') };
    }
  }
}
