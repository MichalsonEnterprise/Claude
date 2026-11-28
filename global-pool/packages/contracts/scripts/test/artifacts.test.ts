import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { LOCAL_ARTIFACTS, localArtifactsPath, readLocalArtifacts } from '../export-artifacts.ts';

const forgeOut = fileURLToPath(
  new URL('../../out/GlobalPoolRounds.sol/GlobalPoolRounds.json', import.meta.url),
);

describe('local devnet artifacts (artifacts/local-devnet.json)', () => {
  it('lists the round registry, the VRF mock and the mock token with creation bytecode', async () => {
    const doc = JSON.parse(await readFile(localArtifactsPath, 'utf8')) as {
      contracts: Record<string, { abi: unknown[]; bytecode: string }>;
    };
    for (const { name } of LOCAL_ARTIFACTS) {
      assert.ok(Array.isArray(doc.contracts[name]?.abi), `${name} ABI`);
      assert.match(doc.contracts[name]?.bytecode ?? '', /^0x[0-9a-f]+$/, `${name} bytecode`);
    }
  });

  it('is up to date with the Foundry build (run `pnpm --filter @gp/contracts artifacts` if this fails)', async (t) => {
    if (!existsSync(forgeOut)) {
      t.skip('forge build output not present');
      return;
    }
    const doc = JSON.parse(await readFile(localArtifactsPath, 'utf8')) as { contracts: unknown };
    assert.deepEqual(doc.contracts, JSON.parse(JSON.stringify(await readLocalArtifacts())));
  });
});
