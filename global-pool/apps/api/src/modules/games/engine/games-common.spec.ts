import { FairError } from '@gp/shared/fair';
import { describe, expect, it } from 'vitest';

import { AppError } from '../../../common/errors';
import {
  GameClock,
  assertDemoOnly,
  fairToAppError,
  refNumberOf,
  refOf,
  rules,
} from './games-common';

describe('REAL_MONEY guard (assertDemoOnly)', () => {
  it('accepts DEMO (or no currency) on simulation games', () => {
    expect(() => assertDemoOnly(undefined, { mode: 'simulation' })).not.toThrow();
    expect(() => assertDemoOnly('DEMO', { mode: 'simulation' })).not.toThrow();
  });
  it('refuses any other currency and any non-simulation game with 403 REAL_MONEY_DISABLED', () => {
    for (const currency of ['USDT', 'USD', 'demo', '']) {
      try {
        assertDemoOnly(currency, { mode: 'simulation' });
        throw new Error('expected a refusal');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('REAL_MONEY_DISABLED');
        expect((err as AppError).getStatus()).toBe(403);
      }
    }
    expect(() => assertDemoOnly('DEMO', { mode: 'real_money' })).toThrow(AppError);
    expect(() => assertDemoOnly(undefined, { mode: 'pool' })).toThrow(AppError);
  });
});

describe('rule errors → API envelope', () => {
  it('maps FairError codes to HTTP errors', () => {
    const conflict = fairToAppError(new FairError('nope', 'ACTION_NOT_ALLOWED')) as AppError;
    expect([conflict.code, conflict.getStatus()]).toEqual(['CONFLICT', 409]);
    const bad = fairToAppError(new FairError('nope', 'OUT_OF_RANGE')) as AppError;
    expect([bad.code, bad.getStatus(), bad.details]).toEqual([
      'BAD_REQUEST',
      400,
      { reason: 'OUT_OF_RANGE' },
    ]);
    const internal = fairToAppError(new FairError('x', 'INTERNAL')) as AppError;
    expect(internal.code).toBe('INTERNAL_ERROR');
    const other = new Error('plain');
    expect(fairToAppError(other)).toBe(other);
    expect(() =>
      rules(() => {
        throw new FairError('bad', 'INVALID_PARAMS');
      }),
    ).toThrow(AppError);
  });
});

describe('references and clock', () => {
  it('formats and parses public bet references', () => {
    expect(refOf('pool-dice', 88213)).toBe('D-88213');
    expect(refOf('twenty-one', 40517)).toBe('BJ-40517');
    expect(refNumberOf('CF-52107')).toBe(52107);
    expect(refNumberOf('nope')).toBeNull();
  });
  it('can be pinned for tests and released', () => {
    const clock = new GameClock();
    const d = new Date('2026-11-27T18:42:05Z');
    clock.set(d);
    expect(clock.now().toISOString()).toBe(d.toISOString());
    clock.set(null);
    expect(Math.abs(clock.now().getTime() - Date.now())).toBeLessThan(1000);
  });
});
