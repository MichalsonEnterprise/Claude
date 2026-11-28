/**
 * Regenerates `test/fixtures/round-1248.json` (DEMO round #1,248: entries tree, sample proofs, winners for a fixed
 * VRF word, payouts tree and winner-derivation vectors). Run: `pnpm --filter @gp/contracts fixture`.
 * The JSON is committed so `forge test` needs no Node/FFI; `scripts/test/fixture.test.ts` fails if it goes stale.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { buildFixture } from './lib/demo-round.ts';
import { formatJson } from './lib/format.ts';

const target = fileURLToPath(new URL('../test/fixtures/round-1248.json', import.meta.url));
const fixture = buildFixture();
await writeFile(target, await formatJson(fixture, target));
console.info(
  `wrote ${target}\n  entries root ${fixture.entries.root}\n  payouts root ${fixture.settlement.payoutsRoot}\n  winners ${fixture.draw.winners.join(', ')}`,
);
