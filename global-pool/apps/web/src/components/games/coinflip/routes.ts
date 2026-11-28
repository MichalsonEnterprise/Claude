/** Double Side routes (play · My flips · Fairness) — static routes under app/(app)/games/double-side. */
export const COINFLIP_ROUTES = {
  play: '/games/double-side',
  myFlips: '/games/double-side/my-flips',
  fairness: '/games/double-side/fairness',
  /** Fairness page focused on one flip (bet id). */
  verify: (betId: string) => `/games/double-side/fairness?bet=${encodeURIComponent(betId)}`,
  details: '/games/double-side/details',
} as const;
