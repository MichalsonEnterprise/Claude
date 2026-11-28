/**
 * Local Anvil devnet for the chain e2e suite (TESTS ONLY): starts `anvil` on a free port, funds throwaway keys
 * generated at runtime, and deploys VRFCoordinatorV2_5Mock + GlobalPoolRounds (locked coordinator, funded
 * subscription) + MockUSDT from @gp/contracts/artifacts/local-devnet.json. No key is ever read from disk.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  http,
  parseEther,
  parseEventLogs,
  publicActions,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
  type TestClient,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';

import { localAnvil } from '../src/modules/blockchain/evm-chain';

interface Artifact {
  abi: Abi;
  bytecode: Hex;
}
const artifacts = (
  JSON.parse(
    readFileSync(
      resolve(__dirname, '../node_modules/@gp/contracts/artifacts/local-devnet.json'),
      'utf8',
    ),
  ) as { contracts: Record<'GlobalPoolRounds' | 'VRFCoordinatorV2_5Mock' | 'MockUSDT', Artifact> }
).contracts;
export const ARTIFACTS = artifacts;

/** `anvil` from PATH, ANVIL_BIN or ~/.foundry/bin (null when Foundry is not installed → suite skipped). */
export function anvilBinary(): string | null {
  const candidates = [process.env.ANVIL_BIN, join(homedir(), '.foundry', 'bin', 'anvil')].filter(
    Boolean,
  ) as string[];
  for (const c of candidates) if (existsSync(c)) return c;
  const which = spawnSync('sh', ['-c', 'command -v anvil'], { encoding: 'utf8' });
  return which.status === 0 && which.stdout.trim() ? which.stdout.trim() : null;
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

export interface Devnet {
  rpcUrl: string;
  process: ChildProcess;
  publicClient: PublicClient;
  test: TestClient;
  /** Throwaway accounts (generated at runtime, funded with test ETH). */
  accounts: Record<
    'deployer' | 'operator' | 'settler' | 'keeper' | 'hotWallet' | 'funder',
    PrivateKeyAccount
  >;
  keys: Record<'operator' | 'settler' | 'keeper' | 'hotWallet', Hex>;
  rounds: Address;
  coordinator: Address;
  usdt: Address;
  deployBlock: bigint;
  /** Send a contract write from one of the devnet accounts and wait for its receipt. */
  write: (
    from: PrivateKeyAccount,
    address: Address,
    abi: Abi,
    functionName: string,
    args: readonly unknown[],
    extra?: { maxPriorityFeePerGas?: bigint; maxFeePerGas?: bigint; wait?: boolean },
  ) => Promise<Hex>;
  mine: (blocks?: number) => Promise<void>;
  stop: () => Promise<void>;
}

export async function startDevnet(): Promise<Devnet> {
  const spawned: ChildProcess[] = [];
  try {
    return await deployDevnet(spawned);
  } catch (err) {
    // Never leave an orphaned anvil behind when a deployment step fails.
    for (const child of spawned) if (child.exitCode === null) child.kill('SIGTERM');
    throw err;
  }
}

async function deployDevnet(spawned: ChildProcess[]): Promise<Devnet> {
  const bin = anvilBinary();
  if (!bin) throw new Error('anvil not found');
  const port = await freePort();
  const child = spawn(
    bin,
    ['--port', String(port), '--host', '127.0.0.1', '--silent', '--chain-id', '31337'],
    {
      stdio: 'ignore', // --silent; nothing reads its pipes (a full pipe would block anvil)
    },
  );
  spawned.push(child);
  const rpcUrl = `http://127.0.0.1:${port}`;
  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain: localAnvil, transport, pollingInterval: 100 });
  const test = createTestClient({ chain: localAnvil, mode: 'anvil', transport }).extend(
    publicActions,
  ) as unknown as TestClient;
  const deadline = Date.now() + 15_000;
  for (;;) {
    try {
      await publicClient.getChainId();
      break;
    } catch {
      if (Date.now() > deadline) throw new Error('anvil did not start');
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  const keys = {
    deployer: generatePrivateKey(),
    operator: generatePrivateKey(),
    settler: generatePrivateKey(),
    keeper: generatePrivateKey(),
    hotWallet: generatePrivateKey(),
    funder: generatePrivateKey(),
  };
  const accounts = Object.fromEntries(
    Object.entries(keys).map(([k, v]) => [k, privateKeyToAccount(v)]),
  ) as Devnet['accounts'];
  for (const a of Object.values(accounts)) {
    await test.setBalance({ address: a.address, value: parseEther('1000') });
  }

  const wallet = (account: PrivateKeyAccount) =>
    createWalletClient({ account, chain: localAnvil, transport });

  const write: Devnet['write'] = async (from, address, abi, functionName, args, extra = {}) => {
    const hash = await wallet(from).writeContract({
      address,
      abi,
      functionName,
      args,
      ...(extra.maxFeePerGas ? { maxFeePerGas: extra.maxFeePerGas } : {}),
      ...(extra.maxPriorityFeePerGas ? { maxPriorityFeePerGas: extra.maxPriorityFeePerGas } : {}),
    });
    if (extra.wait !== false) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error(`${functionName} reverted`);
    }
    return hash;
  };

  const deploy = async (name: keyof typeof artifacts, args: readonly unknown[]) => {
    const art = artifacts[name];
    const hash = await wallet(accounts.deployer).deployContract({
      abi: art.abi,
      bytecode: art.bytecode,
      args,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (!receipt.contractAddress) throw new Error(`${name} deployment failed`);
    return receipt.contractAddress;
  };

  // VRF v2.5 mock: base fee 0.1 LINK, gas price 1 gwei, 0.004 ETH/LINK (same as script/Deploy.s.sol).
  const coordinator = await deploy('VRFCoordinatorV2_5Mock', [
    parseEther('0.1'),
    1_000_000_000n,
    4_000_000_000_000_000n,
  ]);
  const vrfAbi = artifacts.VRFCoordinatorV2_5Mock.abi;
  // The v2.5 subscription id depends on the block hash, so read it from the SubscriptionCreated event.
  const created = await publicClient.waitForTransactionReceipt({
    hash: await write(accounts.deployer, coordinator, vrfAbi, 'createSubscription', [], {
      wait: false,
    }),
  });
  const [subscription] = parseEventLogs({
    abi: vrfAbi,
    eventName: 'SubscriptionCreated',
    logs: created.logs,
  }) as unknown as { args: { subId: bigint } }[];
  if (!subscription) throw new Error('SubscriptionCreated not emitted');
  const subId = subscription.args.subId;
  await write(accounts.deployer, coordinator, vrfAbi, 'fundSubscription', [
    subId,
    parseEther('1000'),
  ]);

  const deployBlock = await publicClient.getBlockNumber();
  const rounds = await deploy('GlobalPoolRounds', [
    coordinator,
    {
      keyHash: '0x1770bdc7eec7771f7ba4ffd640f34260d7f095b79c92d34a5b2551d6f6cfd2be',
      subscriptionId: subId,
      callbackGasLimit: 500_000,
      requestConfirmations: 1,
    },
    accounts.deployer.address, // admin
    accounts.operator.address,
    accounts.settler.address,
    accounts.deployer.address, // pauser
  ]);
  const roundsAbi = artifacts.GlobalPoolRounds.abi;
  await write(accounts.deployer, rounds, roundsAbi, 'lockCoordinator', []);
  await write(accounts.deployer, coordinator, vrfAbi, 'addConsumer', [subId, rounds]);

  const usdt = await deploy('MockUSDT', []);

  return {
    rpcUrl,
    process: child,
    publicClient: publicClient,
    test,
    accounts,
    keys: {
      operator: keys.operator,
      settler: keys.settler,
      keeper: keys.keeper,
      hotWallet: keys.hotWallet,
    },
    rounds,
    coordinator,
    usdt,
    deployBlock,
    write,
    mine: async (blocks = 1) => {
      await test.mine({ blocks });
    },
    stop: async () => {
      if (child.exitCode === null) {
        child.kill('SIGTERM');
        await new Promise((r) => child.once('exit', r));
      }
    },
  };
}
