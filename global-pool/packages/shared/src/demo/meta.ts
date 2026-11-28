import type { DemoFlag } from '../types';

/**
 * The moment the DEMO snapshot represents (latest event in demo-data.md: audit entry #88,214 at 18:44:30 UTC).
 * Countdowns must still be computed from absolute times against the real clock — never faked.
 */
export const DEMO_AS_OF = '2026-11-27T18:44:30Z';

/** Add the DEMO flag to a record. */
export function demo<T extends object>(value: T): T & DemoFlag {
  return { ...value, isDemo: true as const };
}

/** True when a value is a DEMO-flagged object. */
export function isDemo(value: unknown): value is DemoFlag {
  return (
    typeof value === 'object' && value !== null && (value as { isDemo?: unknown }).isDemo === true
  );
}
