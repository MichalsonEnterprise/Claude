/**
 * On-chain e2e against a throwaway local Anvil devnet (chain id 31337): GlobalPoolRounds + VRFCoordinatorV2_5Mock +
 * MockUSDT are deployed in beforeAll; signer keys are generated at runtime. Skipped when Foundry's `anvil` is absent.
 *   1. Round mirroring: openRound → entries → commitEntries (Merkle root over salted commitments) → requestDraw →
 *      VRF fulfilment (DrawFulfilled watcher) → settlement with DB winners == contract winners → recordSettlement.
 *   2. Failed thresholds: commit → cancelRound(THRESHOLDS_NOT_MET) → stakes refunded to Owed.
 *   3. Withdrawal broadcaster: queued → broadcast → confirmed (ledger), nonce management, revert → funds back.
 *   4. Deposit watcher: Transfer logs → confirmations → PENDING → AVAILABLE, idempotent, re-org safe.
 */
import { globalPoolRoundsAbi } from '@gp/contracts/abi';
import {
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  http,
  parseUnits,
  type Address,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { localAnvil } from '../src/modules/blockchain/evm-chain';
import { DepositChainWatcherService } from '../src/modules/deposits/deposit-chain-watcher.service';
import { RoundMirrorService } from '../src/modules/onchain-rounds/round-mirror.service';
import { RoundLifecycleService } from '../src/modules/pool/round-lifecycle.service';
import { RoundsService } from '../src/modules/pool/rounds.service';
import { RandomnessService } from '../src/modules/randomness/randomness.service';
import { WithdrawalBroadcasterService } from '../src/modules/withdrawals/withdrawal-broadcaster.service';
import { ARTIFACTS, anvilBinary, startDevnet, type Devnet } from './anvil';
import {
  adminLogin,
  bearer,
  createAdmin,
  createTestApp,
  demoDeposit,
  enrol2fa,
  newPlayer,
  totp,
  uid,
  type TestApp,
  type TestPlayer,
} from './helpers';

const hasAnvil = anvilBinary() !== null;
if (!hasAnvil) console.warn('chain e2e skipped: Foundry `anvil` not found (set ANVIL_BIN)');

let net: Devnet;
let t: TestApp;
let lifecycle: RoundLifecycleService;
let mirror: RoundMirrorService;
const savedEnv = { ...process.env };

const vrfAbi = ARTIFACTS.VRFCoordinatorV2_5Mock.abi;
const usdtAbi = ARTIFACTS.MockUSDT.abi;

beforeAll(async () => {
  if (!hasAnvil) return;
  net = await startDevnet();
  Object.assign(process.env, {
    EVM_CHAIN_ID: '31337',
    ARBITRUM_SEPOLIA_RPC_URL: net.rpcUrl,
    POOL_CONTRACT_ADDRESS: net.rounds,
    POOL_CONTRACT_START_BLOCK: String(net.deployBlock),
    POOL_ONCHAIN_MIRROR: 'true',
    RANDOMNESS_PROVIDER: 'chainlink',
    POOL_OPERATOR_PRIVATE_KEY: net.keys.operator,
    POOL_SETTLER_PRIVATE_KEY: net.keys.settler,
    POOL_KEEPER_PRIVATE_KEY: net.keys.keeper,
    CHAIN_WRITE_CONFIRMATIONS: '1',
    CHAIN_TX_WAIT_SECONDS: '10',
    VRF_FULFILLMENT_CONFIRMATIONS: '2',
    TEST_USDT_ADDRESS_ARBITRUM_SEPOLIA: net.usdt,
    DEPOSIT_CONFIRMATIONS_ARBITRUM: '3',
    DEPOSIT_WATCHER_START_BLOCK: String(net.deployBlock),
    WITHDRAWAL_BROADCASTER_ENABLED: 'true',
    WITHDRAWAL_SIGNER_PRIVATE_KEY: net.keys.hotWallet,
    WITHDRAWAL_CONFIRMATIONS: '2',
  });
  t = await createTestApp();
  lifecycle = t.app.get(RoundLifecycleService);
  mirror = t.app.get(RoundMirrorService);
}, 120_000);

afterAll(async () => {
  await t?.close();
  await net?.stop();
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
});

const readRound = (roundNumber: number) =>
  net.publicClient.readContract({
    address: net.rounds,
    abi: globalPoolRoundsAbi,
    functionName: 'getRound',
    args: [BigInt(roundNumber)],
  });

const balances = async (p: TestPlayer) =>
  (await t.http().get('/wallet/balances').set(bearer(p.token)).expect(200)).body as Record<
    string,
    string
  >;

const enter = (p: TestPlayer, roundId: string, entries: number) =>
  t
    .http()
    .post(`/pool/rounds/${roundId}/entries`)
    .set(bearer(p.token))
    .send({ entries, idempotencyKey: `e-${uid()}` })
    .expect(201);

/** A round that closes one hour after the LATER of wall-clock and chain time (tests advance chain time). */
async function openMirroredRound(options: { minParticipants: number; minPool: string }) {
  const block = await net.publicClient.getBlock();
  const base = Math.max(Date.now(), Number(block.timestamp) * 1000);
  const round = await t.app.get(RoundsService).open({
    opensAt: new Date(Date.now() - 60_000),
    closesAt: new Date(base + 3_600_000),
    number: 900_000 + Math.floor(Math.random() * 90_000_000),
    ...options,
  });
  const opened = await mirror.ensureOpened(round);
  expect(opened.done).toBe(true);
  return t.prisma.round.findUniqueOrThrow({ where: { id: round.id } });
}

/** Move chain time past the round's close (commitEntries requires block.timestamp ≥ closesAt). */
async function passClose(closesAt: Date) {
  const block = await net.publicClient.getBlock();
  const seconds = Math.floor(closesAt.getTime() / 1000) - Number(block.timestamp) + 5;
  if (seconds > 0) await net.test.increaseTime({ seconds });
  await net.mine(1);
}

describe.skipIf(!hasAnvil)('on-chain round mirroring (GlobalPoolRounds on Anvil)', () => {
  it('open → commit → VRF draw → settle: DB winners == contract winners and every proof verifies on-chain', async () => {
    const alice = await newPlayer(t);
    const bob = await newPlayer(t);
    await demoDeposit(t, alice, '500.00');
    await demoDeposit(t, bob, '500.00');
    const round = await openMirroredRound({ minParticipants: 2, minPool: '100.00' });

    const opened = await readRound(round.number);
    expect(opened.status).toBe(1); // Open
    expect(opened.entryPrice).toBe(10_000_000n);
    expect(opened.feePerEntry).toBe(50_000n);
    expect(opened.rulesHash).toBe(round.rulesHash);
    expect(round).toMatchObject({ chainMirror: true, chainId: 31_337, onchainStatus: 'Open' });

    await enter(alice, round.id, 20);
    await enter(bob, round.id, 15);
    await lifecycle.close(round.id);
    await passClose(round.closesAt);

    expect(await lifecycle.startDraw(round.id)).toBe('drawing');
    const committed = await t.prisma.round.findUniqueOrThrow({ where: { id: round.id } });
    const requested = await readRound(round.number);
    expect(requested.status).toBe(3); // DrawRequested
    expect(requested.entriesRoot).toBe(committed.entriesMerkleRoot);
    expect(requested.totalEntries).toBe(35n);
    expect(requested.totalParticipants).toBe(2n);
    expect(requested.poolAmount).toBe(350_000_000n); // fees (1.75) never enter the pool
    const salts = await t.prisma.entryCommitment.findMany({ where: { roundId: round.id } });
    expect(salts).toHaveLength(35);
    expect(new Set(salts.map((s) => s.saltEnc)).size).toBe(35);
    expect(salts[0]!.saltEnc).toMatch(/^v1\./); // encrypted at rest

    // Not fulfilled yet → waiting; the Chainlink mock then fulfils the request.
    expect(await lifecycle.pollAndSettle(round.id)).toBe('waiting');
    await net.write(net.accounts.funder, net.coordinator, vrfAbi, 'fulfillRandomWords', [
      requested.lastRequestId,
      net.rounds,
    ]);
    expect(await lifecycle.pollAndSettle(round.id)).toBe('waiting'); // 1 of 2 confirmations
    await net.mine(1);
    expect(await lifecycle.pollAndSettle(round.id)).toBe('settled');

    const onchainWinners = await net.publicClient.readContract({
      address: net.rounds,
      abi: globalPoolRoundsAbi,
      functionName: 'computeWinners',
      args: [BigInt(round.number)],
    });
    const prizeAmounts = await net.publicClient.readContract({
      address: net.rounds,
      abi: globalPoolRoundsAbi,
      functionName: 'prizeAmounts',
      args: [BigInt(round.number)],
    });
    const dbWinners = await t.prisma.winner.findMany({
      where: { roundId: round.id },
      orderBy: { rank: 'asc' },
    });
    expect(dbWinners).toHaveLength(13);
    expect(dbWinners.map((w) => BigInt(w.entrySeq! - 1))).toEqual([...onchainWinners]);
    expect(dbWinners.map((w) => parseUnits(w.amount.toFixed(), 6))).toEqual([...prizeAmounts]);

    const settled = await readRound(round.number);
    const dbRound = await t.prisma.round.findUniqueOrThrow({ where: { id: round.id } });
    expect(settled.status).toBe(5); // Settled
    expect(settled.payoutsRoot).toBe(dbRound.payoutsMerkleRoot);
    expect(settled.totalPaid).toBe(350_000_000n);
    expect(settled.randomWord).toBe(
      BigInt(
        (
          await t.prisma.randomnessRequest.findFirstOrThrow({
            where: { roundId: round.id, status: 'fulfilled' },
          })
        ).randomWord!,
      ),
    );

    // Every payout leaf verifies against the on-chain draw + recorded root.
    const payouts = (await t.http().get(`/pool/rounds/${round.number}/payouts`).expect(200)).body;
    expect(payouts.items).toHaveLength(13);
    for (const p of payouts.items) {
      expect(
        await net.publicClient.readContract({
          address: net.rounds,
          abi: globalPoolRoundsAbi,
          functionName: 'verifyPayout',
          args: [
            BigInt(round.number),
            BigInt(p.onchainRank),
            p.entryIdBytes32,
            p.userCommitment,
            BigInt(p.amountUnits),
            p.proof,
          ],
        }),
      ).toBe(true);
    }

    // The owner's receipts (salt + proof) verify with verifyEntry; nobody else sees the salts.
    const proofs = (
      await t
        .http()
        .get(`/pool/rounds/${round.number}/my-proofs`)
        .set(bearer(alice.token))
        .expect(200)
    ).body;
    expect(proofs.entries).toHaveLength(20);
    for (const e of proofs.entries.slice(0, 5)) {
      expect(
        await net.publicClient.readContract({
          address: net.rounds,
          abi: globalPoolRoundsAbi,
          functionName: 'verifyEntry',
          args: [
            BigInt(round.number),
            BigInt(e.index),
            e.entryIdBytes32,
            e.userCommitment,
            e.proof,
          ],
        }),
      ).toBe(true);
    }
    await t.http().get(`/pool/rounds/${round.number}/my-proofs`).expect(401);
    const manifest = (await t.http().get(`/pool/rounds/${round.number}/manifest`).expect(200)).body;
    expect(manifest).toMatchObject({ total: 35, entriesMerkleRoot: dbRound.entriesMerkleRoot });
    expect(JSON.stringify(manifest)).not.toContain('salt"');

    const status = (await t.http().get(`/pool/rounds/${round.number}/chain`).expect(200)).body;
    expect(status).toMatchObject({ mirrored: true, chainId: 31_337, onchainStatus: 'Settled' });
    expect(
      status.steps
        .filter((s: { status: string }) => s.status === 'confirmed')
        .map((s: { step: string }) => s.step),
    ).toEqual(['open', 'commit', 'request_draw', 'settle']);

    // Ledger effects identical to the off-chain path: prizes owed, pool emptied.
    const [a, b] = [await balances(alice), await balances(bob)];
    expect(parseUnits(a.owed!, 6) + parseUnits(b.owed!, 6)).toBe(350_000_000n);

    // Idempotent: running the steps again sends nothing new.
    const txCount = await t.prisma.chainTransaction.count({ where: { purpose: 'round_op' } });
    await mirror.recordSettlement(dbRound);
    await mirror.ensureOpened(dbRound);
    expect(await t.prisma.chainTransaction.count({ where: { purpose: 'round_op' } })).toBe(txCount);

    const verify = (await t.http().get(`/pool/rounds/${round.number}/verify`).expect(200)).body;
    expect(verify.recomputed).toEqual({ matchesStoredWinners: true });
    expect(verify.randomness.provider).toBe('chainlink_vrf_v2_5');
  });

  it('missed thresholds: entries are committed, the round is cancelled on-chain and stakes go to Owed', async () => {
    const carol = await newPlayer(t);
    await demoDeposit(t, carol, '300.00');
    const round = await openMirroredRound({ minParticipants: 5, minPool: '100.00' });
    await enter(carol, round.id, 20); // 200.00 + 1.00 fee
    await lifecycle.close(round.id);
    await passClose(round.closesAt);

    expect(await lifecycle.startDraw(round.id)).toBe('cancelled');
    const onchain = await readRound(round.number);
    expect(onchain.status).toBe(6); // Cancelled
    expect(onchain.cancelReason).toBe(1); // THRESHOLDS_NOT_MET
    expect(onchain.totalEntries).toBe(20n);
    const bal = await balances(carol);
    expect(bal).toMatchObject({ available: '99.00', owed: '200.00', locked: '0.00' });
    const db = await t.prisma.round.findUniqueOrThrow({ where: { id: round.id } });
    expect(db).toMatchObject({ status: 'cancelled', cancelReason: 'threshold_not_met' });
  });

  it('VRF never answers: no re-request — after 24 h the round is cancelled on-chain (VRF_TIMEOUT) and refunded; a late fulfilment is ignored (R33)', async () => {
    const dave = await newPlayer(t);
    const erin = await newPlayer(t);
    await demoDeposit(t, dave, '300.00');
    await demoDeposit(t, erin, '300.00');
    const round = await openMirroredRound({ minParticipants: 2, minPool: '50.00' });
    await enter(dave, round.id, 10);
    await enter(erin, round.id, 5);
    await lifecycle.close(round.id);
    await passClose(round.closesAt);
    expect(await lifecycle.startDraw(round.id)).toBe('drawing');
    const requested = await readRound(round.number);
    expect(requested.status).toBe(3); // DrawRequested

    // 23 h later (chain and server time): still owed, nothing re-requested, nothing cancelled.
    await net.test.increaseTime({ seconds: 23 * 3600 });
    await net.mine(1);
    expect(await lifecycle.pollAndSettle(round.id, new Date(Date.now() + 23 * 3_600_000))).toBe(
      'waiting',
    );
    // 25 h: the keeper cancels for VRF timeout, then the DB refunds every stake to Owed.
    await net.test.increaseTime({ seconds: 2 * 3600 });
    await net.mine(1);
    expect(await lifecycle.pollAndSettle(round.id, new Date(Date.now() + 25 * 3_600_000))).toBe(
      'cancelled',
    );
    const onchain = await readRound(round.number);
    expect(onchain.status).toBe(6); // Cancelled
    expect(onchain.cancelReason).toBe(5); // VRF_TIMEOUT
    expect(onchain.drawAttempts).toBe(1); // randomness was requested once, never again
    const db = await t.prisma.round.findUniqueOrThrow({ where: { id: round.id } });
    expect(db).toMatchObject({ status: 'cancelled', cancelReason: 'vrf_timeout' });
    expect(await balances(dave)).toMatchObject({ owed: '100.00', locked: '0.00' });
    expect(await balances(erin)).toMatchObject({ owed: '50.00', locked: '0.00' });

    // The VRF operator answers late: the contract ignores it — no outcome can be chosen after the fact.
    await net.write(net.accounts.funder, net.coordinator, vrfAbi, 'fulfillRandomWords', [
      requested.lastRequestId,
      net.rounds,
    ]);
    const after = await readRound(round.number);
    expect(after.status).toBe(6);
    expect(after.randomWord).toBe(0n);
    await expect(
      net.publicClient.simulateContract({
        account: net.accounts.funder,
        address: net.rounds,
        abi: globalPoolRoundsAbi,
        functionName: 'requestDraw',
        args: [BigInt(round.number)],
      }),
    ).rejects.toThrow(/InvalidStatus/);
    const ops = await t.prisma.roundChainOp.findMany({ where: { roundId: round.id } });
    expect(ops.filter((o) => o.step === 'request_draw')).toHaveLength(1);
    expect(ops.find((o) => o.step === 'cancel')).toMatchObject({ status: 'confirmed' });
  });

  it('the VRF word and request id come from contract storage, not from a bounded event scan (R24)', async () => {
    const vrf = (
      t.app.get(RandomnessService).provider as unknown as { cfg: { fromBlock?: bigint } }
    ).cfg;
    const saved = vrf.fromBlock;
    const frank = await newPlayer(t);
    const gina = await newPlayer(t);
    await demoDeposit(t, frank, '300.00');
    await demoDeposit(t, gina, '300.00');
    const round = await openMirroredRound({ minParticipants: 2, minPool: '50.00' });
    await enter(frank, round.id, 8);
    await enter(gina, round.id, 7);
    await lifecycle.close(round.id);
    await passClose(round.closesAt);
    try {
      // The events are outside the scan window (e.g. the worker was down for hours).
      vrf.fromBlock = (await net.publicClient.getBlockNumber()) + 1_000_000n;
      expect(await lifecycle.startDraw(round.id)).toBe('drawing');
      const requested = await readRound(round.number);
      const req = await t.prisma.randomnessRequest.findFirstOrThrow({
        where: { roundId: round.id },
      });
      expect(req.requestId).toBe(requested.lastRequestId.toString());
      await net.write(net.accounts.funder, net.coordinator, vrfAbi, 'fulfillRandomWords', [
        requested.lastRequestId,
        net.rounds,
      ]);
      expect(await lifecycle.pollAndSettle(round.id)).toBe('waiting'); // 1 of 2 confirmations
      await net.mine(1);
      expect(await lifecycle.pollAndSettle(round.id)).toBe('settled');
      const fulfilled = await readRound(round.number);
      const stored = await t.prisma.randomnessRequest.findFirstOrThrow({
        where: { roundId: round.id, status: 'fulfilled' },
      });
      expect(BigInt(stored.randomWord!)).toBe(fulfilled.randomWord);
      expect(await t.prisma.winner.count({ where: { roundId: round.id } })).toBe(13);
    } finally {
      vrf.fromBlock = saved;
    }
  });

  it('refuses to mirror a round that closes too soon and never lets anyone pick results', async () => {
    const round = await t.app.get(RoundsService).open({
      opensAt: new Date(Date.now() - 60_000),
      closesAt: new Date(Date.now() + 10_000),
      number: 900_000 + Math.floor(Math.random() * 90_000_000),
    });
    await expect(mirror.ensureOpened(round)).rejects.toMatchObject({ code: 'CONFLICT' });
    await t.http().post(`/pool/rounds/${round.number}/chain`).expect(404);
  });
});

const randomAddress = (): Address => privateKeyToAccount(generatePrivateKey()).address;
const tokenBalance = (address: Address) =>
  net.publicClient.readContract({
    address: net.usdt,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });

/** A real withdrawal request (KYC, step-up 2FA, risk check, four-eyes approval) that ends up `queued`. */
async function queuedWithdrawal(amount: string, to: Address) {
  const player = await newPlayer(t);
  await demoDeposit(t, player, '500.00');
  await t
    .http()
    .post('/dev/kyc/approve')
    .set(bearer(player.token))
    .send({ level: 'level_2' })
    .expect(200);
  const secret = await enrol2fa(t, player);
  const wd = await t
    .http()
    .post('/withdrawals')
    .set(bearer(player.token))
    .send({
      network: 'arbitrum',
      address: to,
      amount,
      idempotencyKey: `wd-${uid()}`,
      totpCode: await totp(secret, 1),
    })
    .expect(201);
  for (const role of ['finance', 'compliance'] as const) {
    const admin = await createAdmin(t, role);
    const token = await adminLogin(t, admin, 0);
    await t
      .http()
      .post(`/admin/withdrawals/${wd.body.id}/approve`)
      .set(bearer(token))
      .send({ reason: 'Testnet destination verified', mfaCode: await totp(admin.secret, 1) })
      .expect(200);
  }
  const queued = await t.prisma.withdrawal.findUniqueOrThrow({ where: { id: wd.body.id } });
  expect(queued.status).toBe('queued');
  return { player, id: queued.id };
}

describe.skipIf(!hasAnvil)('withdrawal broadcaster (test USDT on Anvil)', () => {
  let broadcaster: WithdrawalBroadcasterService;

  beforeAll(async () => {
    broadcaster = t.app.get(WithdrawalBroadcasterService);
    await net.write(net.accounts.deployer, net.usdt, usdtAbi, 'mint', [
      net.accounts.hotWallet.address,
      parseUnits('10000', 6),
    ]);
  });

  it('queued → broadcast → confirmed after N confirmations → ledger settled, net amount on-chain', async () => {
    const to = randomAddress();
    const { player, id } = await queuedWithdrawal('200.00', to);
    expect(await broadcaster.broadcast(id)).toBe('broadcast');
    const sent = await t.prisma.withdrawal.findUniqueOrThrow({ where: { id } });
    const outbox = await t.prisma.chainTransaction.findFirstOrThrow({
      where: { purpose: 'withdrawal', refId: id },
    });
    expect(sent.txHash).toBe(outbox.txHash);
    expect(outbox.fromAddress).toBe(net.accounts.hotWallet.address.toLowerCase());
    expect(await broadcaster.broadcast(id)).toBe('broadcast'); // idempotent: no second transfer
    expect(
      await t.prisma.chainTransaction.count({ where: { purpose: 'withdrawal', refId: id } }),
    ).toBe(1);

    expect(await broadcaster.trackOne(id)).toBe('pending'); // 1 of 2 confirmations
    expect(await balances(player)).toMatchObject({ available: '300.00', locked: '200.00' });
    await net.mine(1);
    expect(await broadcaster.trackOne(id)).toBe('confirmed');

    expect(await tokenBalance(to)).toBe(199_920_000n); // 200.00 − 0.08 network fee
    const view = (await t.http().get(`/withdrawals/${id}`).set(bearer(player.token)).expect(200))
      .body;
    expect(view).toMatchObject({
      status: 'confirmed',
      txHash: outbox.txHash,
      youReceive: '199.92',
    });
    expect(view.timeline.map((s: { status: string }) => s.status).slice(-2)).toEqual([
      'broadcast',
      'confirmed',
    ]);
    expect(await balances(player)).toMatchObject({ available: '300.00', locked: '0.00' });
  });

  it('manages nonces: concurrent broadcasts get consecutive nonces and both confirm', async () => {
    const a = await queuedWithdrawal('50.00', randomAddress());
    const b = await queuedWithdrawal('60.00', randomAddress());
    const before = await net.publicClient.getTransactionCount({
      address: net.accounts.hotWallet.address,
    });
    expect(await Promise.all([broadcaster.broadcast(a.id), broadcaster.broadcast(b.id)])).toEqual([
      'broadcast',
      'broadcast',
    ]);
    const nonces = (
      await t.prisma.chainTransaction.findMany({
        where: { purpose: 'withdrawal', refId: { in: [a.id, b.id] } },
      })
    )
      .map((r) => r.nonce)
      .sort();
    expect(nonces).toEqual([before, before + 1]);
    await net.mine(1);
    expect(await broadcaster.trackOne(a.id)).toBe('confirmed');
    expect(await broadcaster.trackOne(b.id)).toBe('confirmed');
  });

  it('reserves in-flight transfers: a withdrawal the hot wallet cannot cover yet stays queued instead of reverting (R56)', async () => {
    const a = await queuedWithdrawal('60.00', randomAddress());
    const b = await queuedWithdrawal('60.00', randomAddress());
    // Leave exactly 100 test-USDT in the hot wallet.
    const hot = net.accounts.hotWallet.address;
    const held = await tokenBalance(hot);
    await net.write(net.accounts.hotWallet, net.usdt, usdtAbi, 'transfer', [
      net.accounts.deployer.address,
      held - parseUnits('100', 6),
    ]);
    await net.test.setAutomine(false);
    try {
      // Two workers at once (concurrency 4): both read balance 100 before either transfer is mined.
      const outcome = await Promise.all([broadcaster.broadcast(a.id), broadcaster.broadcast(b.id)]);
      expect([...outcome].sort()).toEqual(['broadcast', 'queued']); // 100 − 59.92 in flight < 59.92
      if (outcome[0] === 'queued') [a.id, b.id] = [b.id, a.id]; // `a` is the one that was sent
      expect(await t.prisma.chainTransaction.count({ where: { refId: b.id } })).toBe(0);
      await net.mine(1);
    } finally {
      await net.test.setAutomine(true);
    }
    await net.mine(1);
    expect(await broadcaster.trackOne(a.id)).toBe('confirmed');
    expect(await broadcaster.broadcast(b.id)).toBe('queued'); // 40.08 left on-chain
    await net.write(net.accounts.deployer, net.usdt, usdtAbi, 'mint', [hot, parseUnits('1000', 6)]);
    expect(await broadcaster.broadcast(b.id)).toBe('broadcast');
    await net.mine(1);
    expect(await broadcaster.trackOne(b.id)).toBe('confirmed');
  });

  it('a transfer that would revert never gets a nonce: failed from queued, funds back to Available', async () => {
    const to = randomAddress();
    const { player, id } = await queuedWithdrawal('100.00', to);
    await net.write(net.accounts.deployer, net.usdt, usdtAbi, 'setBlocked', [to, true]);
    expect(await broadcaster.broadcast(id)).toBe('failed');
    expect(await t.prisma.chainTransaction.count({ where: { refId: id } })).toBe(0);
    const w = await t.prisma.withdrawal.findUniqueOrThrow({ where: { id } });
    expect(w.failureReason).toMatch(/RecipientBlocked/);
    expect(await balances(player)).toMatchObject({ available: '500.00', locked: '0.00' });
  });

  it('a transfer that reverts on-chain fails after confirmation and returns the funds', async () => {
    const to = randomAddress();
    const { player, id } = await queuedWithdrawal('80.00', to);
    await net.test.setAutomine(false);
    try {
      expect(await broadcaster.broadcast(id)).toBe('broadcast'); // simulated fine, now in the mempool
      // The token owner blocks the recipient with a higher tip: it is mined first, so the transfer reverts.
      await net.write(net.accounts.deployer, net.usdt, usdtAbi, 'setBlocked', [to, true], {
        maxPriorityFeePerGas: 50_000_000_000n,
        maxFeePerGas: 100_000_000_000n,
        wait: false,
      });
      await net.mine(1);
    } finally {
      await net.test.setAutomine(true);
    }
    await net.mine(1);
    expect(await broadcaster.trackOne(id)).toBe('failed');
    const outbox = await t.prisma.chainTransaction.findFirstOrThrow({ where: { refId: id } });
    expect(outbox.status).toBe('reverted');
    const w = await t.prisma.withdrawal.findUniqueOrThrow({ where: { id } });
    expect(w).toMatchObject({ status: 'failed' });
    expect(await tokenBalance(to)).toBe(0n);
    expect(await balances(player)).toMatchObject({ available: '500.00', locked: '0.00' });
  });
});

describe.skipIf(!hasAnvil)(
  'deposit watcher (test USDT Transfer logs on Anvil, re-org safe)',
  () => {
    let watcher: DepositChainWatcherService;
    const funderWallet = () =>
      createWalletClient({
        account: net.accounts.funder,
        chain: localAnvil,
        transport: http(net.rpcUrl),
      });
    const depositAddress = async (p: TestPlayer) =>
      (await t.http().get('/deposits/address?network=arbitrum').set(bearer(p.token)).expect(200))
        .body.address as Address;
    const transfer = (to: Address, amount: string) =>
      net.write(net.accounts.funder, net.usdt, usdtAbi, 'transfer', [to, parseUnits(amount, 6)]);
    const depositOf = (userId: string) =>
      t.prisma.deposit.findFirstOrThrow({ where: { userId, isDemo: false } });

    beforeAll(async () => {
      watcher = t.app.get(DepositChainWatcherService);
      await net.write(net.accounts.deployer, net.usdt, usdtAbi, 'mint', [
        net.accounts.funder.address,
        parseUnits('100000', 6),
      ]);
    });

    it('Transfer log → confirmations → PENDING → AVAILABLE, credited exactly once', async () => {
      const p = await newPlayer(t);
      await transfer(await depositAddress(p), '250.00');
      const first = await watcher.watch();
      expect(first).toMatchObject({ status: 'ok', detected: 1, credited: 0 });
      expect(await balances(p)).toMatchObject({ pending: '250.00', available: '0.00' });
      expect(await watcher.watch()).toMatchObject({ detected: 0, credited: 0 }); // re-scan is idempotent
      expect(await depositOf(p.userId)).toMatchObject({ status: 'confirming', confirmations: 1 });

      await net.mine(2); // 3 confirmations
      expect(await watcher.watch()).toMatchObject({ credited: 1 });
      expect(await watcher.watch()).toMatchObject({ detected: 0, credited: 0 });
      expect(await balances(p)).toMatchObject({ pending: '0.00', available: '250.00' });
      const d = await depositOf(p.userId);
      expect(d).toMatchObject({ status: 'credited', confirmations: 3 });
      expect(d.blockHash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(await t.prisma.ledgerPosting.count({ where: { reference: `DP-${d.number}` } })).toBe(
        2,
      );
    });

    it('a deposit re-orged out of the chain is never credited and its Pending is reversed', async () => {
      const p = await newPlayer(t);
      const address = await depositAddress(p);
      const snapshot = await net.test.snapshot();
      await transfer(address, '100.00');
      expect(await watcher.watch()).toMatchObject({ detected: 1 });
      expect(await balances(p)).toMatchObject({ pending: '100.00' });

      await net.test.revert({ id: snapshot }); // the block with the transfer is gone
      await net.mine(1);
      expect(await watcher.watch()).toMatchObject({ reorged: 1, credited: 0 });
      expect(await depositOf(p.userId)).toMatchObject({ status: 'confirming', confirmations: 0 });
      await net.mine(3);
      expect(await watcher.watch()).toMatchObject({ reversed: 1, credited: 0 });
      expect(await balances(p)).toMatchObject({ pending: '0.00', available: '0.00' });
      const d = await depositOf(p.userId);
      expect(d.status).toBe('rejected');
      const kinds = (
        await t.prisma.ledgerPosting.findMany({ where: { reference: `DP-${d.number}` } })
      ).map((x) => x.kind);
      expect(kinds.sort()).toEqual(['deposit_detected', 'deposit_reversed']);
      const tx = await t.prisma.transaction.findFirstOrThrow({ where: { depositId: d.id } });
      expect(tx.status).toBe('failed');
    });

    it('a transaction re-included in another block is followed and credited once', async () => {
      const p = await newPlayer(t);
      const address = await depositAddress(p);
      const wallet = funderWallet();
      const request = await wallet.prepareTransactionRequest({
        to: net.usdt,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [address, parseUnits('75.00', 6)],
        }),
      });
      const raw = await wallet.signTransaction(request as never);
      const snapshot = await net.test.snapshot();
      const hash = await net.publicClient.sendRawTransaction({ serializedTransaction: raw });
      await net.publicClient.waitForTransactionReceipt({ hash });
      expect(await watcher.watch()).toMatchObject({ detected: 1 });
      const firstBlock = (await depositOf(p.userId)).blockHash;

      await net.test.revert({ id: snapshot });
      await net.mine(2);
      expect(await watcher.watch()).toMatchObject({ reorged: 1 });
      await net.publicClient.sendRawTransaction({ serializedTransaction: raw }); // same tx, new block
      await net.mine(1);
      expect(await watcher.watch()).toMatchObject({ credited: 0, reversed: 0 });
      const moved = await depositOf(p.userId);
      expect(moved.blockHash).not.toBe(firstBlock);
      expect(moved.reorgSeenAtBlock).toBeNull();
      await net.mine(2);
      expect(await watcher.watch()).toMatchObject({ credited: 1 });
      expect(await balances(p)).toMatchObject({ available: '75.00', pending: '0.00' });
      expect(await t.prisma.deposit.count({ where: { txHash: hash } })).toBe(1);
    });
  },
);
