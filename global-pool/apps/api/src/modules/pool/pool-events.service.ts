import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface PoolUpdateEvent {
  type: 'pool.update';
  roundId: string;
  roundNumber: number;
  status: string;
  entries: number;
  participants: number;
  poolBalance: string;
  platformFees: string;
  closesAt: string;
  lastPurchase?: { handle: string | null; entries: number; amount: string; at: string };
  isDemo: boolean;
}

export interface RoundStatusEvent {
  type: 'round.status';
  roundId: string;
  roundNumber: number;
  status: string;
  at: string;
}

export type PoolEvent = PoolUpdateEvent | RoundStatusEvent;

/** In-process event bus for the live pool UI (the WebSocket gateway subscribes). */
@Injectable()
export class PoolEventsService {
  readonly events$ = new Subject<PoolEvent>();

  emit(event: PoolEvent): void {
    this.events$.next(event);
  }
}
