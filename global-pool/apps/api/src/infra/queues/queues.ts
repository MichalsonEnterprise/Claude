/** BullMQ queue names. */
export const QUEUES = {
  DEPOSITS: 'deposits',
  WITHDRAWALS: 'withdrawals',
  ROUNDS: 'rounds',
} as const;

export const JOBS = {
  DEPOSIT_WATCH: 'deposit.watch',
  WITHDRAWAL_RISK_CHECK: 'withdrawal.risk-check',
  WITHDRAWAL_BROADCAST: 'withdrawal.broadcast',
  ROUND_TICK: 'round.tick',
  ROUND_SETTLE: 'round.settle',
} as const;
