/**
 * Local devnet for manual QA (DEV ONLY): `pnpm --filter @gp/api devnet`.
 * Starts Anvil (chain id 31337), deploys VRFCoordinatorV2_5Mock + GlobalPoolRounds + MockUSDT with throwaway keys
 * generated at runtime, and writes the API env lines to apps/api/.dev/devnet.env (git-ignored). Run the API with
 * those variables plus POOL_ONCHAIN_MIRROR=true RANDOMNESS_PROVIDER=chainlink (and WITHDRAWAL_BROADCASTER_ENABLED=true
 * to broadcast withdrawals). Ctrl+C stops the chain; everything on it is discarded.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { startDevnet } from './anvil';

void (async () => {
  const net = await startDevnet();
  const file = resolve(__dirname, '..', '.dev', 'devnet.env');
  mkdirSync(resolve(file, '..'), { recursive: true });
  const publicLines = [
    'EVM_CHAIN_ID=31337',
    `ARBITRUM_SEPOLIA_RPC_URL=${net.rpcUrl}`,
    `POOL_CONTRACT_ADDRESS=${net.rounds}`,
    `POOL_CONTRACT_START_BLOCK=${net.deployBlock}`,
    `TEST_USDT_ADDRESS_ARBITRUM_SEPOLIA=${net.usdt}`,
    `VRF_COORDINATOR=${net.coordinator}`,
  ];
  writeFileSync(
    file,
    [
      '# DEV ONLY — throwaway local devnet (Anvil). Regenerated on every `pnpm --filter @gp/api devnet`.',
      ...publicLines,
      `POOL_OPERATOR_PRIVATE_KEY=${net.keys.operator}`,
      `POOL_SETTLER_PRIVATE_KEY=${net.keys.settler}`,
      `POOL_KEEPER_PRIVATE_KEY=${net.keys.keeper}`,
      `WITHDRAWAL_SIGNER_PRIVATE_KEY=${net.keys.hotWallet}`,
      '',
    ].join('\n'),
    { mode: 0o600 },
  );
  console.info(
    `Local devnet ready (DEV ONLY):\n  ${publicLines.join('\n  ')}\nKeys + env: ${file}`,
  );
  const stop = () => void net.stop().then(() => process.exit(0));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
})();
