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
import type { Subscription } from 'rxjs';
import type { Namespace, Socket } from 'socket.io';

import { PoolEventsService } from './pool-events.service';
import { RoundsService } from './rounds.service';

/**
 * Live pool updates for the UI (socket.io namespace `/pool`):
 *  - `pool:snapshot` on connect / on `pool:subscribe` (current round summary)
 *  - `pool:update`   after every entry purchase (entries, participants, pool balance, platform fees)
 *  - `round:status`  on lifecycle changes (open, closed, drawing, settled, cancelled)
 * Read-only: clients cannot send anything that changes state.
 */
@WebSocketGateway({ namespace: '/pool', transports: ['websocket', 'polling'] })
export class PoolGateway implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy {
  private readonly logger = new Logger(PoolGateway.name);
  private subscription?: Subscription;

  @WebSocketServer() server!: Namespace;

  constructor(
    private readonly events: PoolEventsService,
    private readonly rounds: RoundsService,
  ) {}

  afterInit(): void {
    this.subscription = this.events.events$.subscribe((event) => {
      if (event.type === 'pool.update') this.server.emit('pool:update', event);
      else this.server.emit('round:status', event);
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      client.emit('pool:snapshot', await this.snapshot());
    } catch (err) {
      this.logger.warn(`snapshot failed: ${String(err)}`);
    }
  }

  @SubscribeMessage('pool:subscribe')
  async onSubscribe(@ConnectedSocket() client: Socket, @MessageBody() _body: unknown) {
    client.emit('pool:snapshot', await this.snapshot());
    return { ok: true };
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private async snapshot() {
    const round = await this.rounds.current();
    if (!round) return { round: null };
    const v = this.rounds.view(round);
    return {
      round: {
        id: v.id,
        number: v.number,
        status: v.status,
        closesAt: v.closesAt,
        entries: v.entries,
        participants: v.participants,
        poolBalance: v.poolBalance,
        platformFees: v.platformFees,
        isDemo: v.isDemo,
      },
    };
  }
}
