/** Twenty-One routes (static routes under app/(app)/games/twenty-one). */
export const BJ_ROUTES = {
  play: '/games/twenty-one',
  myHands: '/games/twenty-one/my-hands',
  rules: '/games/twenty-one/rules',
  fairness: '/games/twenty-one/fairness',
  /** Fairness page focused on one hand (bet id). */
  verify: (betId: string) => `/games/twenty-one/fairness?bet=${encodeURIComponent(betId)}`,
  details: '/games/twenty-one/details',
} as const;
