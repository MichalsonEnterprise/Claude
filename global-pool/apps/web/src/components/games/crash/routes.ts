/** Orbit Rush routes (key "crash"). */
export const CRASH_ROUTES = {
  play: '/games/orbit-rush',
  rounds: '/games/orbit-rush/rounds',
  statistics: '/games/orbit-rush/rounds#statistics',
  myBets: '/games/orbit-rush/my-bets',
  fairness: '/games/orbit-rush/fairness',
  verify: (n: number) => `/games/orbit-rush/fairness?round=${n}`,
  details: '/games/orbit-rush/details',
} as const;
