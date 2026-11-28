/**
 * Dev-only state preview for the Global Pool screens (same rules as the homepage preview: enabled in `next dev`
 * and builds with NEXT_PUBLIC_STATE_PREVIEW=true, ignored in production).
 *
 *   /pool?state=guest          wallet disconnected / signed-out view (PUB-02 public variant)
 *   /pool?state=restricted     region gate (participation disabled, withdrawals stay available)
 *   /pool?state=no-round       between rounds (last result + next round)
 *   /pool?state=wrong-network  GP-02 wrong-network state in the preview modal
 *   /pool?state=participate    opens the participation preview on load (visual QA)
 * Combine with commas: /pool?state=participate,wrong-network
 */
import { statePreviewEnabled } from '@/lib/home-preview';

export const POOL_PREVIEW_FLAGS = [
  'guest',
  'restricted',
  'no-round',
  'wrong-network',
  'participate',
] as const;
export type PoolPreviewFlag = (typeof POOL_PREVIEW_FLAGS)[number];

export interface PoolPreview {
  flags: PoolPreviewFlag[];
  has: (f: PoolPreviewFlag) => boolean;
}

export function parsePoolPreview(
  raw: string | string[] | undefined,
  enabled: boolean = statePreviewEnabled,
): PoolPreview {
  const flags = enabled
    ? [
        ...new Set(
          (Array.isArray(raw) ? raw : [raw ?? ''])
            .flatMap((v) => v.split(','))
            .map((v) => v.trim().toLowerCase())
            .filter((v): v is PoolPreviewFlag =>
              (POOL_PREVIEW_FLAGS as readonly string[]).includes(v),
            ),
        ),
      ]
    : [];
  return { flags, has: (f) => flags.includes(f) };
}
