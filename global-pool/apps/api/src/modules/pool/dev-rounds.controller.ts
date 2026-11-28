import { Controller, HttpCode, Injectable, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import type { Round } from '@prisma/client';
import { formatRoundNumber } from '@gp/shared/format';

import { DemoOnly } from '../../common/demo-only.guard';
import { AppError } from '../../common/errors';
import { CurrentUser, type AuthUser } from '../../common/request';
import { AppConfig } from '../../config/app-config';
import { AuditService } from '../audit/audit.service';
import { PlayerAuth } from '../auth/guards';
import { RandomnessService } from '../randomness/randomness.service';
import { RoundLifecycleService } from './round-lifecycle.service';
import { RoundsService } from './rounds.service';

type DevStep = 'close' | 'draw' | 'settle';

/**
 * DEMO / dev only (Q23): walk a DEMO round through the REAL lifecycle steps on demand, so QA can run
 * close → draw (mock VRF) → settle → results → verifier → winnings without waiting for 20:00 UTC on a JOBS-enabled API.
 *
 * Nothing here decides an outcome: each step calls the same RoundLifecycleService method the BullMQ tick calls
 * (thresholds frozen at close, randomness from MockVrfProvider — a word derived from a fresh request id, winners only
 * from selectWinners(word, canonical entries), balanced ledger postings). Refused unless DEMO endpoints are enabled
 * (DEMO_MODE, REAL_MONEY_ENABLED=false, NODE_ENV≠production → else 404), for DEMO rounds only, never for a round
 * mirrored on-chain and only with the mock randomness provider. Every call writes a hash-chained audit row.
 */
@Injectable()
export class DevRoundsService {
  constructor(
    private readonly rounds: RoundsService,
    private readonly lifecycle: RoundLifecycleService,
    private readonly randomness: RandomnessService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
  ) {}

  async advance(user: AuthUser, number: number, step: DevStep) {
    if (!this.config.demoEndpointsEnabled) throw new AppError('NOT_FOUND', 'Not found');
    const round = await this.demoRound(number);
    const now = new Date();
    let outcome: string;
    if (step === 'close') {
      await this.lifecycle.close(round.id, now);
      outcome = 'closed';
    } else {
      if (this.randomness.provider.kind !== 'mock') {
        throw new AppError(
          'CONFLICT',
          'DEMO draws use the mock randomness provider only (RANDOMNESS_PROVIDER=mock)',
        );
      }
      outcome =
        step === 'draw'
          ? await this.lifecycle.startDraw(round.id, now)
          : await this.settleStep(round);
    }
    const fresh = await this.rounds.byId(round.id);
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      action: `dev.round.${step}`,
      targetType: 'round',
      targetId: round.id,
      reason: 'DEMO / QA lifecycle step',
      metadata: { number: round.number, from: round.status, to: fresh.status, outcome, demo: true },
    });
    return { step, outcome, round: this.rounds.view(fresh), isDemo: true };
  }

  private async settleStep(round: Round): Promise<string> {
    if (round.status !== 'drawing') {
      throw new AppError(
        'CONFLICT',
        `Round ${formatRoundNumber(round.number)} is ${round.status} — draw it first`,
        { status: round.status },
      );
    }
    return this.lifecycle.pollAndSettle(round.id);
  }

  private async demoRound(number: number): Promise<Round> {
    const round = await this.rounds.byNumber(number);
    if (!round.isDemo) {
      throw new AppError(
        'FORBIDDEN',
        'Only DEMO rounds can be advanced by hand; real rounds follow their schedule',
      );
    }
    if (round.chainMirror) {
      throw new AppError(
        'CONFLICT',
        `Round ${formatRoundNumber(round.number)} is mirrored on-chain: it is drawn and settled through the contract only`,
      );
    }
    return round;
  }
}

@DemoOnly()
@PlayerAuth()
@Controller('dev/pool/rounds')
export class DevRoundsController {
  constructor(private readonly dev: DevRoundsService) {}

  @Post(':number/close')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'DEMO only: close an open DEMO round now (freezes entries and thresholds, as at its close time)',
  })
  close(@CurrentUser() user: AuthUser, @Param('number', ParseIntPipe) number: number) {
    return this.dev.advance(user, number, 'close');
  }

  @Post(':number/draw')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'DEMO only: request randomness (mock VRF) for a closed DEMO round — or cancel it with refunds when thresholds are not met',
  })
  draw(@CurrentUser() user: AuthUser, @Param('number', ParseIntPipe) number: number) {
    return this.dev.advance(user, number, 'draw');
  }

  @Post(':number/settle')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'DEMO only: settle a drawing DEMO round from its fulfilled mock VRF word (winners = selectWinners, prizes to Owed)',
  })
  settle(@CurrentUser() user: AuthUser, @Param('number', ParseIntPipe) number: number) {
    return this.dev.advance(user, number, 'settle');
  }
}
