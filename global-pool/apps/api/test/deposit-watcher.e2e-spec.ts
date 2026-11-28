/**
 * Deposit watcher close-out fixes against globalpool_test with a scripted in-memory chain (no Anvil needed): batch
 * transfers in one transaction (R14), reversed deposits re-included later (R15), re-orgs that shift the log indices
 * of sibling deposits (R35) and the RG / restriction hold before Available (R03).
 */
import {
  TransactionReceiptNotFoundError,
  encodeAbiParameters,
  encodeEventTopics,
  keccak256,
  parseUnits,
  toHex,
  type Address,
  type Hex,
} from 'viem';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppConfig } from '../src/config/app-config';
import { BlockchainService } from '../src/modules/blockchain/blockchain.service';
import {
  DepositChainWatcherService,
  TRANSFER_EVENT,
} from '../src/modules/deposits/deposit-chain-watcher.service';
import { DepositsService } from '../src/modules/deposits/deposits.service';
import {
  bearer,
  createAdmin,
  createTestApp,
  newPlayer,
  uid,
  type TestApp,
  type TestPlayer,
} from './helpers';

interface FakeTransfer {
  logIndex: number;
  to: Address;
  amount: string;
}
interface FakeTx {
  hash: Hex;
  blockNumber: bigint;
  blockHash: Hex;
  transfers: FakeTransfer[];
}

const FROM: Address = `0x${'f0'.repeat(20)}`;

/** A canonical chain we script by hand: include / drop / re-include transactions, advance the head. */
class FakeChain {
  head = 50_000n;
  readonly token: Address = `0x${uid().padEnd(40, 'a')}`;
  private readonly txs = new Map<Hex, FakeTx>();

  send(transfers: FakeTransfer[]): Hex {
    const hash = keccak256(toHex(`tx-${uid()}`));
    this.include(hash, transfers);
    return hash;
  }
  include(hash: Hex, transfers: FakeTransfer[]) {
    this.head += 1n;
    this.txs.set(hash, {
      hash,
      blockNumber: this.head,
      blockHash: keccak256(toHex(`block-${this.head}-${uid()}`)),
      transfers,
    });
  }
  drop(hash: Hex) {
    this.txs.delete(hash);
  }
  mine(n: number) {
    this.head += BigInt(n);
  }

  readonly client = {
    getChainId: () => Promise.resolve(421_614),
    getBlockNumber: () => Promise.resolve(this.head),
    getLogs: (q: { args: { to: string[] }; fromBlock: bigint; toBlock: bigint }) => {
      const wanted = new Set(q.args.to.map((a) => a.toLowerCase()));
      const logs = [...this.txs.values()]
        .filter((tx) => tx.blockNumber >= q.fromBlock && tx.blockNumber <= q.toBlock)
        .flatMap((tx) =>
          tx.transfers
            .filter((tr) => wanted.has(tr.to.toLowerCase()))
            .map((tr) => ({
              args: { from: FROM, to: tr.to, value: parseUnits(tr.amount, 6) },
              transactionHash: tx.hash,
              logIndex: tr.logIndex,
              blockNumber: tx.blockNumber,
              blockHash: tx.blockHash,
            })),
        );
      return Promise.resolve(logs);
    },
    getTransactionReceipt: ({ hash }: { hash: Hex }) => {
      const tx = this.txs.get(hash);
      if (!tx) return Promise.reject(new TransactionReceiptNotFoundError({ hash }));
      return Promise.resolve({
        status: 'success',
        blockNumber: tx.blockNumber,
        blockHash: tx.blockHash,
        logs: tx.transfers.map((tr) => ({
          address: this.token,
          logIndex: tr.logIndex,
          data: encodeAbiParameters([{ type: 'uint256' }], [parseUnits(tr.amount, 6)]),
          topics: encodeEventTopics({
            abi: [TRANSFER_EVENT],
            eventName: 'Transfer',
            args: { from: FROM, to: tr.to },
          }),
        })),
      });
    },
  };
}

let t: TestApp;
let chain: FakeChain;
let watcher: DepositChainWatcherService;
let N: number;

beforeAll(async () => {
  t = await createTestApp();
  chain = new FakeChain();
  const real = t.app.get(BlockchainService);
  N = real.requiredConfirmations('arbitrum');
  const fakeBlockchain = {
    client: () => chain.client,
    verifiedClient: () => Promise.resolve(chain.client),
    tokenAddress: () => chain.token,
    requiredConfirmations: (n: 'arbitrum') => real.requiredConfirmations(n),
    chainId: real.chainId,
  } as unknown as BlockchainService;
  watcher = new DepositChainWatcherService(
    t.prisma,
    fakeBlockchain,
    t.app.get(DepositsService),
    t.app.get(AppConfig),
  );
});
afterAll(async () => {
  // Never leave open on-chain deposits behind in the shared test DB (other watcher suites reconcile every open row):
  // held ones are reversed with a balanced posting.
  if (t) {
    const deposits = t.app.get(DepositsService);
    const open = await t.prisma.deposit.findMany({
      where: {
        tokenAddress: chain.token.toLowerCase(),
        status: { in: ['detected', 'confirming'] },
      },
    });
    for (const d of open) await t.prisma.tx((tx) => deposits.reverse(tx, d, 'test cleanup'));
  }
  await t?.close();
});

const depositAddress = async (p: TestPlayer) =>
  (await t.http().get('/deposits/address?network=arbitrum').set(bearer(p.token)).expect(200)).body
    .address as Address;
const balances = async (p: TestPlayer) =>
  (await t.http().get('/wallet/balances').set(bearer(p.token)).expect(200)).body as Record<
    string,
    string
  >;
const depositsOf = (userId: string) =>
  t.prisma.deposit.findMany({ where: { userId, isDemo: false }, orderBy: { logIndex: 'asc' } });

describe('deposit watcher: distinct transfers in one transaction (R14)', () => {
  it('two identical Transfers to the same address in one tx are two deposits, both credited', async () => {
    const p = await newPlayer(t);
    const to = await depositAddress(p);
    const hash = chain.send([
      { logIndex: 3, to, amount: '100.00' },
      { logIndex: 5, to, amount: '100.00' },
    ]);
    expect(await watcher.watch()).toMatchObject({ status: 'ok', detected: 2 });
    expect(await balances(p)).toMatchObject({ pending: '200.00', available: '0.00' });
    chain.mine(N);
    expect(await watcher.watch()).toMatchObject({ status: 'ok', credited: 2 });
    expect(await watcher.watch()).toMatchObject({ detected: 0, credited: 0 }); // idempotent
    expect(await balances(p)).toMatchObject({ pending: '0.00', available: '200.00' });
    const rows = await depositsOf(p.userId);
    expect(rows.map((d) => [d.txHash, d.logIndex, d.status])).toEqual([
      [hash, 3, 'credited'],
      [hash, 5, 'credited'],
    ]);
  });
});

describe('deposit watcher: re-org shifting sibling log indices (R35)', () => {
  it('re-indexes all deposits of the transaction together; no unique-key collision halts the watcher', async () => {
    const x = await newPlayer(t);
    const y = await newPlayer(t);
    const toX = await depositAddress(x);
    const toY = await depositAddress(y);
    const hash = chain.send([
      { logIndex: 7, to: toX, amount: '40.00' },
      { logIndex: 8, to: toY, amount: '60.00' },
    ]);
    expect(await watcher.watch()).toMatchObject({ status: 'ok', detected: 2 });
    // Re-org: the same transaction is re-included one log later (X = 8, Y = 9).
    chain.drop(hash);
    chain.include(hash, [
      { logIndex: 8, to: toX, amount: '40.00' },
      { logIndex: 9, to: toY, amount: '60.00' },
    ]);
    const res = await watcher.watch();
    expect(res.status).toBe('ok');
    expect(res.detected).toBe(0);
    expect((await depositsOf(x.userId))[0]).toMatchObject({ logIndex: 8, status: 'confirming' });
    expect((await depositsOf(y.userId))[0]).toMatchObject({ logIndex: 9, status: 'confirming' });
    chain.mine(N);
    expect(await watcher.watch()).toMatchObject({ status: 'ok', credited: 2 });
    expect(await balances(x)).toMatchObject({ available: '40.00', pending: '0.00' });
    expect(await balances(y)).toMatchObject({ available: '60.00', pending: '0.00' });
  });

  it('a sibling whose transfer is gone is moved out of the way and reversed; the shifted deposit is credited (R35b)', async () => {
    const x = await newPlayer(t);
    const y = await newPlayer(t);
    const toX = await depositAddress(x);
    const toY = await depositAddress(y);
    const hash = chain.send([
      { logIndex: 7, to: toX, amount: '43.00' },
      { logIndex: 8, to: toY, amount: '63.00' },
    ]);
    expect(await watcher.watch()).toMatchObject({ status: 'ok', detected: 2 });
    // Re-org: the transaction runs again on the new state and only emits X, at Y's old log index.
    chain.drop(hash);
    chain.include(hash, [{ logIndex: 8, to: toX, amount: '43.00' }]);
    expect(await watcher.watch()).toMatchObject({ status: 'ok', detected: 0, reversed: 1 });
    expect((await depositsOf(x.userId))[0]).toMatchObject({ logIndex: 8, status: 'confirming' });
    expect((await depositsOf(y.userId))[0]).toMatchObject({ status: 'rejected' });
    expect(await balances(y)).toMatchObject({ pending: '0.00', available: '0.00' });
    chain.mine(N);
    expect(await watcher.watch()).toMatchObject({ status: 'ok', credited: 1 });
    expect(await balances(x)).toMatchObject({ available: '43.00', pending: '0.00' });
    expect(await balances(y)).toMatchObject({ available: '0.00', pending: '0.00' });
  });
});

describe('deposit watcher: reversed deposit re-included later (R15)', () => {
  it('reopens the same deposit and credits it exactly once', async () => {
    const p = await newPlayer(t);
    const to = await depositAddress(p);
    const hash = chain.send([{ logIndex: 2, to, amount: '250.00' }]);
    expect(await watcher.watch()).toMatchObject({ detected: 1 });
    chain.drop(hash); // re-orged out …
    chain.mine(1);
    await watcher.watch();
    expect((await depositsOf(p.userId))[0]!.reorgSeenAtBlock).not.toBeNull();
    chain.mine(N); // … and still missing N blocks later → reversed
    await watcher.watch();
    expect((await depositsOf(p.userId))[0]!.status).toBe('rejected');
    expect(await balances(p)).toMatchObject({ pending: '0.00', available: '0.00' });

    chain.include(hash, [{ logIndex: 2, to, amount: '250.00' }]); // back on the canonical chain
    expect(await watcher.watch()).toMatchObject({ status: 'ok', reopened: 1 });
    expect(await balances(p)).toMatchObject({ pending: '250.00', available: '0.00' });
    chain.mine(N);
    expect(await watcher.watch()).toMatchObject({ credited: 1 });
    expect(await watcher.watch()).toMatchObject({ credited: 0, detected: 0 });
    expect(await balances(p)).toMatchObject({ pending: '0.00', available: '250.00' });
    const rows = await depositsOf(p.userId);
    expect(rows).toHaveLength(1); // one transfer = one deposit
    const kinds = (
      await t.prisma.ledgerPosting.findMany({
        where: { reference: `DP-${rows[0]!.number}` },
        orderBy: { createdAt: 'asc' },
      })
    ).map((x) => x.kind);
    expect(kinds).toEqual([
      'deposit_detected',
      'deposit_reversed',
      'deposit_detected',
      'deposit_credited',
    ]);
  });

  it('a batch of identical reversed transfers re-included at shifted indices reopens every deposit in one pass (R15b)', async () => {
    const p = await newPlayer(t);
    const to = await depositAddress(p);
    const hash = chain.send([
      { logIndex: 3, to, amount: '100.00' },
      { logIndex: 5, to, amount: '100.00' },
    ]);
    expect(await watcher.watch()).toMatchObject({ detected: 2 });
    chain.drop(hash);
    chain.mine(1);
    await watcher.watch();
    chain.mine(N);
    expect(await watcher.watch()).toMatchObject({ reversed: 2 });
    expect(await balances(p)).toMatchObject({ pending: '0.00', available: '0.00' });

    // Re-included one log earlier, and the next poll only comes after more than N blocks (Arbitrum ≈ 60 blocks per
    // 15 s poll): this pass is the only one whose re-org window still covers the block.
    chain.include(hash, [
      { logIndex: 1, to, amount: '100.00' },
      { logIndex: 3, to, amount: '100.00' },
    ]);
    chain.mine(N + 10);
    expect(await watcher.watch()).toMatchObject({ status: 'ok', reopened: 2, credited: 2 });
    expect(await watcher.watch()).toMatchObject({ reopened: 0, credited: 0, detected: 0 });
    expect(await balances(p)).toMatchObject({ pending: '0.00', available: '200.00' });
    const rows = await depositsOf(p.userId);
    expect(rows.map((d) => [d.logIndex, d.status])).toEqual([
      [1, 'credited'],
      [3, 'credited'],
    ]);
  });
});

describe('deposit watcher: RG and restriction hold before Available (R03)', () => {
  it('a deposits_blocked player keeps the deposit in Pending (not stakeable) until the restriction is lifted', async () => {
    const p = await newPlayer(t);
    const to = await depositAddress(p);
    const admin = await createAdmin(t, 'compliance');
    const restriction = await t.prisma.userRestriction.create({
      data: {
        userId: p.userId,
        type: 'deposits_blocked',
        reason: 'AML review',
        appliedByAdminId: admin.id,
      },
    });
    chain.send([{ logIndex: 0, to, amount: '5000.00' }]);
    await watcher.watch();
    chain.mine(N);
    expect(await watcher.watch()).toMatchObject({ credited: 0 });
    expect(await balances(p)).toMatchObject({ pending: '5000.00', available: '0.00' });
    const d = (await depositsOf(p.userId))[0]!;
    expect(d.status).toBe('confirming');
    const record = await t.prisma.transaction.findFirstOrThrow({ where: { depositId: d.id } });
    expect((record.metadata as { statusDetail: string }).statusDetail).toMatch(/On hold/);
    expect(
      await t.prisma.notification.count({ where: { userId: p.userId, type: 'deposit.held' } }),
    ).toBe(1);
    await watcher.watch(); // still held, notified once
    expect(
      await t.prisma.notification.count({ where: { userId: p.userId, type: 'deposit.held' } }),
    ).toBe(1);

    await t.prisma.userRestriction.update({
      where: { id: restriction.id },
      data: { liftedAt: new Date(), liftedByAdminId: admin.id, liftReason: 'Cleared' },
    });
    expect(await watcher.watch()).toMatchObject({ credited: 1 });
    expect(await balances(p)).toMatchObject({ pending: '0.00', available: '5000.00' });
  });

  it('a self-excluded player is not credited', async () => {
    const p = await newPlayer(t);
    const to = await depositAddress(p);
    await t.prisma.rgSelfExclusion.create({
      data: {
        userId: p.userId,
        duration: '30d',
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 30 * 86_400_000),
      },
    });
    chain.send([{ logIndex: 0, to, amount: '300.00' }]);
    await watcher.watch();
    chain.mine(N);
    expect(await watcher.watch()).toMatchObject({ credited: 0 });
    expect(await balances(p)).toMatchObject({ pending: '300.00', available: '0.00' });
    expect((await depositsOf(p.userId))[0]!.status).toBe('confirming');
  });

  it('the RG deposit limit applies to on-chain deposits: what exceeds it stays held', async () => {
    const p = await newPlayer(t);
    const to = await depositAddress(p);
    await t
      .http()
      .put('/responsible-gaming/limits')
      .set(bearer(p.token))
      .send({ type: 'deposit', period: 'week', amount: '500.00' })
      .expect(200);
    chain.send([{ logIndex: 0, to, amount: '300.00' }]);
    chain.send([{ logIndex: 0, to, amount: '300.00' }]);
    await watcher.watch();
    chain.mine(N);
    expect(await watcher.watch()).toMatchObject({ credited: 1 });
    expect(await balances(p)).toMatchObject({ available: '300.00', pending: '300.00' });
  });
});
