/**
 * Dev-only homepage state preview: `/?state=<flags>` (comma-separated).
 *
 *   guest       force the logged-out view (default when signed out)
 *   member      force the logged-in view with the DEMO player @nova.k (balance chip, "Your 35 entries")
 *   restricted  restricted region (United States): gating banner, disabled CTAs, withdraw still available
 *   no-round    between rounds: last result + "next round opens 28 Nov 2026, 08:00 UTC"
 *
 * Combine flags, e.g. `/?state=member,no-round`. Enabled in `next dev` and in builds made with
 * NEXT_PUBLIC_STATE_PREVIEW=true (visual QA); ignored everywhere else. In production the viewer comes from
 * auth and the region from GET /compliance/region.
 */
import { DEFAULT_SCENARIO, type HomeScenario } from '@/lib/data/types';

export const HOME_PREVIEW_FLAGS = ['guest', 'member', 'restricted', 'no-round'] as const;
export type HomePreviewFlag = (typeof HOME_PREVIEW_FLAGS)[number];

export const statePreviewEnabled =
  process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_STATE_PREVIEW === 'true';

export interface HomePreview {
  /** Forced viewer, or null to use the real auth state. */
  viewer: 'guest' | 'member' | null;
  scenario: HomeScenario;
  flags: HomePreviewFlag[];
}

const isFlag = (v: string): v is HomePreviewFlag =>
  (HOME_PREVIEW_FLAGS as readonly string[]).includes(v);

export function parseHomePreview(
  raw: string | string[] | undefined,
  enabled: boolean = statePreviewEnabled,
): HomePreview {
  const flags = enabled
    ? [
        ...new Set(
          (Array.isArray(raw) ? raw : [raw ?? ''])
            .flatMap((v) => v.split(','))
            .map((v) => v.trim().toLowerCase())
            .filter(isFlag),
        ),
      ]
    : [];
  const has = (f: HomePreviewFlag) => flags.includes(f);
  return {
    viewer: has('member') ? 'member' : has('guest') ? 'guest' : null,
    scenario: {
      round: has('no-round') ? 'none' : DEFAULT_SCENARIO.round,
      region: has('restricted') ? 'restricted' : DEFAULT_SCENARIO.region,
    },
    flags,
  };
}
