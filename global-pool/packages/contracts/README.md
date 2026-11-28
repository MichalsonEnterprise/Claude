# @gp/contracts — GLOBAL POOL round registry (Foundry)

> **DEMO / testnet only.** Target chain for the MVP: **Arbitrum Sepolia (chainId 421614)**. No mainnet
> addresses exist and the deploy script refuses every chain except Arbitrum Sepolia and local Anvil (31337).
> All fixture data (round #1,248, users, salts, VRF word) is synthetic DEMO data.

`GlobalPoolRounds` is the public, append-only record that makes every Global Pool draw **verifiable and
immutable**. Under the owner's **hybrid custody** decision, player balances, entries and payouts live in the
platform's off-chain double-entry ledger. The contract **holds no funds and moves no tokens**. It records:

1. the round's rules (price, fee, thresholds, prize split, rules-document hash) when it opens;
2. after the close time, a Merkle root over the canonical entry list plus the totals;
3. whether the thresholds were met, evaluated on-chain from the committed numbers;
4. one Chainlink VRF v2.5 random word, from which anyone can derive the winners deterministically;
5. a Merkle root over the payouts credited off-chain, which must sum to the pool.

No function can set or override a random word, a winner, a committed entry list or a recorded settlement.
Pausing only stops new rounds and new commitments.

---

## Contents

- [Toolchain](#toolchain) · [Commands](#commands) · [Layout](#layout)
- [Design](#design): [lifecycle](#lifecycle), [functions & roles](#functions--roles), [events](#events)
- [Trust model (hybrid custody)](#trust-model-hybrid-custody)
- [Encodings](#encodings) (amounts, entry ids, commitments, leaves, winners, prize split)
- [Verification procedure for players](#verification-procedure-for-players)
- [Threat model notes](#threat-model-notes)
- [Arbitrum Sepolia VRF v2.5 — verify before use](#arbitrum-sepolia-vrf-v25--verify-before-use)
- [Deployment](#deployment) · [Using the ABI / verifier from other packages](#using-the-abi--verifier-from-other-packages)
- [Gas & size](#gas--size) · [Static analysis](#static-analysis) · [Audit TODOs](#audit-todos)

---

## Toolchain

| Tool                             | Version                                                                           | Notes                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Foundry (forge/cast/anvil)       | **1.9.0** (`6056c58`, 2 Nov 2026)                                                 | v1.10.x was < 2 weeks old at install time                                          |
| solc                             | **0.8.28**, `evm_version = cancun`, optimizer 10,000 runs, no via-IR              | sources use `pragma ^0.8.24`                                                       |
| OpenZeppelin Contracts           | **5.6.1** (npm)                                                                   | `AccessControl`, `Pausable`, `MerkleProof`                                         |
| Chainlink contracts              | **1.5.0** (npm)                                                                   | `VRFConsumerBaseV2Plus`, `VRFV2PlusClient`, `VRFCoordinatorV2_5Mock`               |
| OpenZeppelin Contracts 4.9.6     | npm alias `@openzeppelin/contracts-4.9.6`                                         | only needed because the Chainlink mock imports `@openzeppelin/contracts@4.9.6/...` |
| forge-std                        | **v1.17.0** (`f3dae6e`), vendored in `lib/forge-std` via `forge install --no-git` | byte-identical to the tag                                                          |
| @openzeppelin/merkle-tree / viem | 1.0.8 / 2.57.19                                                                   | TS verifier + fixture builder                                                      |

**Installing Foundry.** `curl -L https://foundry.paradigm.xyz | bash && foundryup` is the standard route. In the
sandbox used to build this package the GitHub attestation and release-tag API endpoints returned 403. The
binaries were therefore downloaded straight from the release assets and verified against Sigstore instead: the
Rekor transparency-log entry for each binary's SHA-256 carries a Fulcio certificate for
`foundry-rs/foundry/.github/workflows/release.yml@refs/tags/v1.9.0`, chained to the Fulcio root. They live in
`~/.foundry/bin`. `scripts/forge.sh` (used by every pnpm script) finds `forge` on `PATH` or in `~/.foundry/bin`.

**Why npm packages instead of `forge install` submodules.** The package lives inside a monorepo whose git
root (`/home/user/Claude`) must not be modified. Submodules would add a root `.gitmodules`, and Chainlink's
Foundry repo is about 17 MB. The pnpm workspace already pins versions in `pnpm-lock.yaml`. forge-std is not
published on npm in a current version, so it is vendored with `forge install --no-git` (72 files, 1.4 MB; no
submodule).

## Commands

```bash
pnpm --filter @gp/contracts build        # forge build → export ABI (abi/) → tsup (dist/: abi + verify, ESM+CJS+d.ts)
pnpm --filter @gp/contracts test         # forge test + node --test (fixture freshness, TS verifier)
pnpm --filter @gp/contracts test:sol     # forge test -vv
pnpm --filter @gp/contracts lint         # forge fmt --check + eslint
pnpm --filter @gp/contracts typecheck    # tsc --noEmit (abi/, scripts/)
pnpm --filter @gp/contracts snapshot     # forge snapshot → .gas-snapshot (snapshot:check to compare)
pnpm --filter @gp/contracts gas-report   # per-function gas table
pnpm --filter @gp/contracts fixture      # regenerate test/fixtures/round-1248.json (DEMO round #1,248)
pnpm --filter @gp/contracts build:ts     # tsup only (no forge needed; abi/*.ts is committed)
```

Fuzz runs: 1,024 per property (`FOUNDRY_PROFILE=ci` → 10,000), fixed seed for a reproducible snapshot.
The invariant suite runs 64 × 256 random calls (`ci`: 512 × 128) across open, commit, draw, re-request,
fulfil, duplicate callbacks, settle, cancel, pause and time warps.

## Layout

```
src/GlobalPoolRounds.sol         the registry (AccessControl + Pausable + VRFConsumerBaseV2Plus)
src/libraries/DrawMath.sol       pure: leaf encodings, winner derivation, prize split
test/GlobalPoolRounds.t.sol      lifecycle, thresholds, commit/draw/settle rules, roles, pause, coordinator lock
test/DrawMath.t.sol              fuzz/property tests for winners & split, gas reference points
test/MerkleFixture.t.sol         cross-checks against the TypeScript implementation (fixture)
test/Invariants.t.sol            stateful invariants: no re-roll, monotonic lifecycle, frozen entries root
test/fixtures/round-1248.json    GENERATED by scripts/build-fixture.ts (committed so forge needs no FFI)
script/Deploy.s.sol              env-driven deploy (Arbitrum Sepolia / Anvil), never reads a private key
scripts/lib/verify.ts            TS mirror of DrawMath (published as @gp/contracts/verify)
scripts/lib/demo-round.ts        deterministic DEMO round #1,248 (18,640 entries, 3,412 participants)
scripts/export-abi.ts            out/ → abi/GlobalPoolRounds.json + abi/GlobalPoolRounds.ts (as const)
abi/index.ts                     @gp/contracts/abi entry (ABI + RoundStatus/CancelReason enums)
lib/forge-std                    vendored forge-std v1.17.0
```

---

## Design

### Lifecycle

```
            openRound (OPERATOR, not paused)
   None ───────────────────────────────▶ Open ──cancelRound (OPERATOR; OPERATIONAL|COMPLIANCE|OTHER)──▶ Cancelled
                                          │
                     commitEntries (OPERATOR, not paused, block.timestamp ≥ closesAt, once)
                                          ▼
                                      Committed ──thresholds NOT met: cancelRound (anyone; THRESHOLDS_NOT_MET)──▶ Cancelled
                                          │ thresholds met
                     requestDraw (anyone, coordinator locked & pinned)
                                          ▼
                                    DrawRequested ◀─┐ requestDraw again only if unfulfilled and
                                          │         └─ ≥ 24 h after the previous request (same entries)
                     VRF callback (pinned coordinator only; FIRST fulfilment of any request is final)
                                          ▼
                                      Fulfilled ── computeWinners / prizeAmounts (views)
                                          │
                     recordSettlement (SETTLER, totalPaid == pool, once)
                                          ▼
                                       Settled
```

Thresholds (`thresholdsMet`) = `totalParticipants ≥ minParticipants && poolAmount ≥ minPool && totalEntries ≥
number of prizes`. They are computed only from committed numbers. A committed round that meets them can only
be drawn; it cannot be cancelled. Nothing can be cancelled once a draw has been requested.

### Functions & roles

| Function                                                                                                      | Who                                                                | Notes                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openRound(roundId, closesAt, entryPrice, feePerEntry, minParticipants, minPool, prizeSplitBps[], rulesHash)` | `OPERATOR_ROLE`                                                    | blocked when paused; `roundId ≠ 0` and unique; `closesAt` in the future; `entryPrice > 0`; 1–100 ranks, each > 0, sum = 10,000 bps                                                                                                                                                  |
| `commitEntries(roundId, entriesMerkleRoot, totalEntries, totalParticipants, poolAmount)`                      | `OPERATOR_ROLE`                                                    | blocked when paused; only after `closesAt`; once; `poolAmount == totalEntries × entryPrice`; `participants ≤ entries`; root ≠ 0 iff entries > 0                                                                                                                                     |
| `cancelRound(roundId, reasonCode)`                                                                            | `OPERATOR_ROLE` (Open) / anyone (Committed and failing thresholds) | see lifecycle; never after `requestDraw`                                                                                                                                                                                                                                            |
| `requestDraw(roundId)`                                                                                        | anyone                                                             | VRF v2.5, `numWords = 1`, `nativePayment = false` (LINK subscription); re-request only when unfulfilled and ≥ `DRAW_REQUEST_TIMEOUT` (24 h) later                                                                                                                                   |
| `fulfillRandomWords` (via `rawFulfillRandomWords`)                                                            | pinned VRF coordinator                                             | stores the word; ignores unknown or late requests (`FulfillmentIgnored`), never reverts for them                                                                                                                                                                                    |
| `recordSettlement(roundId, payoutsMerkleRoot, totalPaid)`                                                     | `SETTLER_ROLE`                                                     | only when Fulfilled; once; root ≠ 0; `totalPaid == poolAmount`                                                                                                                                                                                                                      |
| `setVrfConfig(cfg)`                                                                                           | `DEFAULT_ADMIN_ROLE`                                               | future requests only; callback gas 150,000–2,500,000; confirmations 1–200                                                                                                                                                                                                           |
| `pause()` / `unpause()`                                                                                       | `PAUSER_ROLE` / `DEFAULT_ADMIN_ROLE`                               | pause blocks `openRound` + `commitEntries` only                                                                                                                                                                                                                                     |
| `lockCoordinator()`                                                                                           | anyone, once                                                       | makes the contract its own Chainlink `ConfirmedOwner` (see threat model); `requestDraw` requires it                                                                                                                                                                                 |
| Views                                                                                                         | anyone                                                             | `getRound`, `roundStatus`, `thresholdsMet`, `computeWinners`, `prizeAmounts`, `verifyEntry`, `verifyWinningEntry`, `verifyPayout`, `deriveWinners`, `splitPool`, `entryLeaf`, `payoutLeaf`, `requestRound`, `vrfConfig`, `vrfCoordinator`, `coordinatorPinned`, `coordinatorLocked` |

Why `requestDraw` and the failed-threshold `cancelRound` are permissionless: once entries are committed, the
next step is fully determined by on-chain data. Letting anyone trigger it means the operator cannot stall a
due draw or keep a failed round open. Request spam is bounded by the state machine: at most one VRF request
per round per 24 h.

### Events

| Event                | Carries                                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `RoundOpened`        | roundId, openedAt, closesAt, entryPrice, feePerEntry, minParticipants, minPool, prizeSplitBps, rulesHash                           |
| `EntriesCommitted`   | roundId, entriesMerkleRoot, totalEntries, totalParticipants, poolAmount, platformFees (= entries × fee, not pooled), thresholdsMet |
| `RoundCancelled`     | roundId, reasonCode, previousStatus, cancelledBy                                                                                   |
| `DrawRequested`      | roundId, requestId, attempt, keyHash, subscriptionId, requestConfirmations, callbackGasLimit, entriesMerkleRoot, totalEntries      |
| `DrawFulfilled`      | roundId, requestId, randomWord                                                                                                     |
| `FulfillmentIgnored` | roundId, requestId (late or unknown callback)                                                                                      |
| `RoundSettled`       | roundId, payoutsMerkleRoot, totalPaid, winningIndices                                                                              |
| `VrfConfigUpdated`   | keyHash, subscriptionId, callbackGasLimit, requestConfirmations                                                                    |
| inherited            | `RoleGranted/Revoked/AdminChanged`, `Paused/Unpaused`, `CoordinatorSet`, `OwnershipTransferRequested/Transferred`                  |

Cancel reason codes: `1 THRESHOLDS_NOT_MET`, `2 OPERATIONAL`, `3 COMPLIANCE`, `4 OTHER` (the details go in the
platform's audit log).

---

## Trust model (hybrid custody)

| On-chain (this contract — public, immutable)                        | Off-chain (platform ledger / API)                                          |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Round rules: price, fee, thresholds, prize split, rules hash        | Deposits, withdrawals, balances (Available / Locked / Pending / Owed)      |
| Entries Merkle root + totals, frozen after close, before randomness | Entry purchases (10.00 USDT + 0.05 fee from the balance; network fee 0.00) |
| On-chain threshold evaluation and draw / cancel decision            | Refunds of cancelled rounds (→ Owed / Available)                           |
| VRF request ids and the single random word                          | Crediting prizes to winners' balances                                      |
| Deterministic winners and prize amounts (anyone can recompute)      | Publishing the entry manifest, receipts (salts) and proofs                 |
| Payouts Merkle root, `totalPaid == pool`                            | Compliance gates (KYC, geo, RG limits) before entries                      |

**What a player does NOT have to trust:**

- the draw outcome: Chainlink VRF output plus a public derivation;
- the timing: commit happens strictly before randomness is requested;
- that results stay unchanged: there is no override path;
- the prize amounts: derived on-chain from the committed pool and split.

**What remains trusted (custodial):**

- that the off-chain ledger actually debited and credited the amounts;
- that the entry list contains exactly the paid entries (mitigated by per-user inclusion proofs and the public
  manifest);
- that payouts recorded in the root were really credited (mitigated by `verifyPayout` and ledger statements).

Real-money operation stays disabled (`REAL_MONEY_ENABLED=false`).

## Encodings

All amounts are **USDT base units, 6 decimals** (`ACCOUNTING_DECIMALS`): 10.00 USDT = `10_000_000`, fee
0.05 = `50_000`, pool 186,400.00 = `186_400_000_000`. They are accounting values only.

| Item                       | Encoding                                                                                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entryId` (bytes32)        | the platform entry id as UTF-8, right-padded, if ≤ 32 bytes (e.g. `E-1248-00981`), otherwise `keccak256(utf8(id))` — `encodeEntryId()`                                                                                                                                          |
| `userCommitment` (bytes32) | `keccak256(abi.encode(keccak256(utf8(userPublicId)), salt))`, where `salt` is a random 32-byte secret stored with the entry and shown only to its owner (receipt) — `userCommitment()`                                                                                          |
| entry leaf                 | `keccak256(abi.encode(uint256 index, bytes32 entryId, bytes32 userCommitment))`; leaves in index order 0…N−1                                                                                                                                                                    |
| payout leaf                | `keccak256(abi.encode(uint256 roundId, uint256 rank, uint256 entryIndex, bytes32 entryId, bytes32 userCommitment, uint256 amount))`                                                                                                                                             |
| trees                      | OpenZeppelin `SimpleMerkleTree` with `sortLeaves: false`, sorted-pair keccak256, verifiable with OZ `MerkleProof`                                                                                                                                                               |
| winners                    | for k = 0,1,2…: `x = uint256(keccak256(abi.encode(WINNERS_DOMAIN, roundId, randomWord, k)))`; reject `x < 2^256 mod N` (no modulo bias); `i = x mod N`; skip already-drawn indices; the i-th distinct index wins rank i. `WINNERS_DOMAIN = keccak256("GLOBAL_POOL_WINNERS_V1")` |
| prize split                | `amount[r] = floor(pool × bps[r] / 10,000)` for r ≥ 1; `amount[0] = pool − Σ others` (dust to 1st prize), so the total always equals the pool                                                                                                                                   |

The entry and payout leaf preimages are 96 and 192 bytes long, so they can never be confused with a 64-byte
internal node. That makes single hashing safe here. OpenZeppelin's `StandardMerkleTree` double-hashes leaves for
the general case; this contract uses the spec's single-hash leaves with `SimpleMerkleTree`.

**Canonical entry order (API contract).** Index = position after sorting the round's qualifying entries by
ledger sequence (purchase order). The order is fixed when the round closes and must never depend on anything
known after commitment.

DEMO round #1,248 in the fixture uses the demo-data numbers: 18,640 entries, 3,412 participants, pool
186,400.00, fees 932.00, prizes 93,200.00 / 37,280.00 / 18,640.00 / 10 × 3,728.00. @nova.k (`GP-48213`) owns
entries `E-1248-00981…01015` (indices 980–1014).

## Verification procedure for players

Anything below can be done with a block explorer (read contract / events) or with `@gp/contracts/verify`:

1. **Rules.** In `RoundOpened` for the round, check the price, fee, thresholds and prize split. Check that
   `rulesHash` equals the hash of the published rules document.
2. **Entries frozen before the draw.** Check that `EntriesCommitted` happened at or after `closesAt` and before
   `DrawRequested`. Check that `poolAmount == totalEntries × entryPrice`.
3. **My entries are included.** From your entry receipt (index, entry id, salt), compute
   `userCommitment` and fetch the Merkle proof (platform API or public manifest). Call
   `verifyEntry(roundId, index, entryId, userCommitment, proof)`; it must return `true`.
4. **Whole list (auditors).** Download the manifest of leaves. Rebuild the root with `buildTree()` and check it
   equals `entriesMerkleRoot`. Check there are exactly `totalEntries` leaves with indices 0…N−1, each once.
5. **Randomness.** `DrawFulfilled` gives `requestId` and `randomWord`. On the VRF coordinator, the
   `RandomWordsFulfilled` event for that `requestId` must exist. `DrawRequested.attempt` should be `1`; a
   re-request (attempt > 1) is a published incident.
6. **Winners.** Call `computeWinners(roundId)`, or recompute it off-chain with
   `deriveWinners(roundId, randomWord, totalEntries, prizeSplitBps.length)`. For a winning entry, check
   `verifyWinningEntry(roundId, rank, entryId, userCommitment, proof)`.
7. **Payouts.** After `RoundSettled`, check `totalPaid == poolAmount`, then run
   `verifyPayout(roundId, rank, entryId, userCommitment, amount, payoutProof)` for each prize.
8. **Cancelled rounds.** `RoundCancelled.reasonCode`. For `THRESHOLDS_NOT_MET`, `thresholdsMet(roundId)` is
   `false` from the committed totals; refunds appear in the ledger (Owed → Available).

## Threat model notes

- **Operator controls the entry list (custodial).** The operator could add or omit entries before committing.
  Mitigations:
  - commitment happens after close and before randomness, so the list cannot depend on the outcome;
  - every user can check inclusion;
  - the public manifest lets anyone check the count, uniqueness and pool equality;
  - the pool must equal entries × price on-chain;
  - the ledger reconciliation and audit log record the paid entries.

  The Merkle root alone does not prove that indices are unique; the manifest check (step 4) does.

- **Admin cannot alter results.** There is no setter for words, winners, entries or settlements. The admin can:
  - grant and revoke roles;
  - change the VRF config (future requests only, bounded);
  - pause and unpause (no effect on recorded data).
- **Coordinator redirection.** `VRFConsumerBaseV2Plus.setCoordinator` is `onlyOwnerOrCoordinator` and not
  virtual. An owner could have pointed it at an EOA that injects words. Worse, they could have broken a pending
  callback after its output became public and then re-requested, which is a re-roll. Mitigations:
  - the contract becomes its own owner (`lockCoordinator`), and `requestDraw` requires the lock;
  - callbacks are accepted only from the immutable coordinator pinned at deployment;
  - requests always go to that coordinator.

  A Chainlink-side migration can still call `setCoordinator`. Draws then stall with `CoordinatorMismatch` (a
  new version must be deployed), but no words can be injected.

- **Re-request risk (spec requirement).** Chainlink's VRF security guidance warns that re-requesting randomness
  can let the party who can block a fulfilment bias outcomes. The re-request path therefore:
  - is allowed only when unfulfilled and at least 24 h after the previous request;
  - reuses the same committed entries;
  - treats the **first** fulfilment of any request for the round as final (a re-request cannot invalidate an
    earlier request);
  - emits every attempt;
  - keeps the callback minimal (about 79k gas) under an enforced minimum gas limit of 150k, so it cannot run
    out of gas.

  Residual risk: a fulfilment that reverts inside the coordinator (for example an under-funded subscription)
  after its proof is public. Operations must keep the subscription funded and treat any attempt > 1 as a
  disclosed incident (see Audit TODOs).

- **Timing / MEV.** The VRF output is unpredictable to everyone, including the operator, and
  `requestConfirmations ≥ 1` (default 3) covers reorgs. Arbitrum's sequencer has no public mempool.
  Front-running `requestDraw` or a failed-threshold cancel only performs the deterministic next step.
- **Timestamps.** Windows are hours long (close, 24 h); sequencer timestamp drift is irrelevant.
- **Reentrancy.** The only external call is `requestRandomWords` on the pinned coordinator. The callback makes
  no external calls.
- **DoS / gas.** At most 100 prizes. Winner derivation is O(prizes²) with rejection sampling; the worst case
  (100 prizes over 100 entries) is about 2.3M gas, used in a view and in `recordSettlement`. For the demo round
  (13 prizes over 18,640 entries) it costs 24k gas.
- **Privacy.** Only the entry id and a hiding commitment are public. User ids and salts stay off-chain. Salts
  must be random (the fixture's derivable salts are DEMO only).
- **No upgradeability.** The contract is immutable. A new version means a new deployment and a new
  `WINNERS_DOMAIN`.

## Arbitrum Sepolia VRF v2.5 — verify before use

Values from Chainlink's official **VRF v2.5 Supported Networks** page
(`docs.chain.link/vrf/v2-5/supported-networks`, Arbitrum Sepolia testnet, subscription method). They were
retrieved on 28 Nov 2026 and cross-checked on-chain with read-only `eth_call`s to the public RPC:

| Item             | Value                                                                | On-chain check                                                                  |
| ---------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| VRF Coordinator  | `0x5CE8D5A2BC84beb22a398CCA51996F7930313D61`                         | has code (48 KB)                                                                |
| 50 gwei key hash | `0x1770bdc7eec7771f7ba4ffd640f34260d7f095b79c92d34a5b2551d6f6cfd2be` | `s_provingKeys(keyHash)` → `(true, 50 gwei)`                                    |
| LINK token       | `0xb1D4538B4571d411F07960EF2838Ce337FE1E80E`                         | `LINK()` matches                                                                |
| Premium          | 60% (Sepolia ETH) / 50% (testnet LINK)                               | —                                                                               |
| Max callback gas | 2,500,000                                                            | `s_config().maxGasLimit = 2,500,000`                                            |
| Confirmations    | docs: min 1 / max 200                                                | `s_config().minimumRequestConfirmations = 0`, `MAX_REQUEST_CONFIRMATIONS = 200` |
| Max random words | 500                                                                  | `MAX_NUM_WORDS = 500`                                                           |

> **⚠️ Verify before use.** Testnet infrastructure changes. Before any broadcast:
>
> 1. re-open the Chainlink docs page and compare every value;
> 2. run `cast code`, `cast call <coordinator> "s_provingKeys(bytes32)(bool,uint64)" <keyHash>` and
>    `"LINK()(address)"` against Arbitrum Sepolia;
> 3. create and fund the subscription at vrf.chain.link with test LINK, and keep the id in `.env` (never in git).
>
> The deploy script refuses any other coordinator or key hash on 421614 unless `VRF_ALLOW_UNLISTED=true`.

## Deployment

**Not broadcast in this task.** Parameters come from the environment (`.env.example`; copy to the git-ignored
`.env`). The script never reads a private key. Sign with an encrypted keystore
(`cast wallet import gp-testnet-deployer --interactive`) or a hardware wallet.

```bash
# 1. simulate (no transactions): local in-memory EVM with a VRF mock, or an Arbitrum Sepolia fork
forge script script/Deploy.s.sol:Deploy
forge script script/Deploy.s.sol:Deploy --rpc-url arbitrum_sepolia

# 2. broadcast (only after the checklist above; throwaway testnet deployer)
forge script script/Deploy.s.sol:Deploy --rpc-url arbitrum_sepolia \
  --account gp-testnet-deployer --sender <deployer> --broadcast --verify

# 3. if the deployer is not the subscription owner (VRF_ADD_CONSUMER=false): the subscription owner adds the consumer
cast send 0x5CE8D5A2BC84beb22a398CCA51996F7930313D61 "addConsumer(uint256,address)" $VRF_SUBSCRIPTION_ID <rounds> --account <sub-owner>
```

The script deploys the contract, calls `lockCoordinator()`, and adds the consumer (Anvil always; Sepolia when
`VRF_ADD_CONSUMER=true`). It then asserts `coordinatorLocked() && coordinatorPinned()`. On Anvil without
`VRF_COORDINATOR` it also deploys and funds a `VRFCoordinatorV2_5Mock`, for local API end-to-end tests: fulfil
with `fulfillRandomWords(requestId, consumer)` on the mock.

Dry runs performed while building this package:

- in-memory (31337, mock): success, 7.9M gas total;
- Arbitrum Sepolia fork (real coordinator, dummy subscription id): success, an estimated 9.74M gas, about
  0.00039 ETH at 0.04 gwei.

## Using the ABI / verifier from other packages

Add `"@gp/contracts": "workspace:*"` to the consumer's `package.json`.

```ts
import {
  globalPoolRoundsAbi,
  RoundStatus,
  CancelReason,
  ACCOUNTING_DECIMALS,
} from '@gp/contracts/abi';
import {
  buildTree,
  entryLeaf,
  payoutLeaf,
  deriveWinners,
  splitPool,
  encodeEntryId,
  userCommitment,
  verifyProof,
} from '@gp/contracts/verify';
import abiJson from '@gp/contracts/abi/GlobalPoolRounds.json'; // plain JSON ABI
```

- `@gp/contracts/abi` and `@gp/contracts/verify` resolve to `dist/` (ESM + CJS + `.d.ts`, built by tsup). The
  `as const` ABI keeps full viem type inference.
- `pnpm --filter @gp/contracts build` needs forge. `build:ts` needs only Node, because `abi/*.ts` is committed.
- `@gp/shared` does not re-export these, because that would make `@gp/shared` depend on a Foundry package.
- Amounts from `verify` are `bigint` base units. Convert them with `@gp/shared/money` (decimal.js), never JS
  floats.

## Gas & size

`GlobalPoolRounds` runtime size is 16,771 B (margin 7,805 B to the 24,576 B limit). Results from
`forge test --gas-report`, demo round:

| Function                                  | Typical (median)                 | Max                                 |
| ----------------------------------------- | -------------------------------- | ----------------------------------- |
| `openRound` (13 prizes)                   | 208,894                          | 208,894                             |
| `commitEntries`                           | 95,142                           | 129,318                             |
| `requestDraw` (mock coordinator)          | 218,585                          | 218,585                             |
| VRF callback `rawFulfillRandomWords`      | 26,383                           | 78,627 (direct measurement: 79,361) |
| `recordSettlement` (13 winners)           | 27,191                           | 110,509                             |
| `cancelRound`                             | 30,775                           | 53,937                              |
| `deriveWinners` 13 of 18,640 / 100 of 100 | 24,190 / 2,300,726 (test totals) | —                                   |

Per-test gas is in `.gas-snapshot` (`pnpm snapshot:check` to compare).

## Static analysis

forge-lint runs on every build. Excluded lints (in `foundry.toml`):

- `block-timestamp`: windows are hours long;
- `uninitialized-local`: zero-initialised locals are idiomatic Solidity;
- `require-revert-in-loop`: the prize-split validation loop has to revert inside the loop.

Two lines are disabled inline with a justification each: the uint64 timestamp cast, and an event that must
follow the coordinator call because it carries the returned request id.

## Audit TODOs

- [ ] External audit + Slither/Aderyn/Halmos runs (not run here); formal spec of `DrawMath.deriveWinners`.
- [ ] Decide whether to keep the 24 h re-request path. If kept, gate it behind a governance timelock or an
      on-chain incident flag, and add a monitored "attempt > 1" disclosure flow.
- [ ] Consider on-chain settlement verification: submit the winners' entry proofs and let the contract build
      the payouts root, instead of trusting the settler's root and checking leaves afterwards.
- [ ] `AccessControlDefaultAdminRules` (2-step admin transfer with delay) and multisig role holders.
- [ ] Optional "abandon" path for rounds whose VRF never fulfils (long timeout, refunds), currently handled
      off-chain only.
- [ ] Re-verify the Chainlink 1.5.0 / OZ 5.6.1 versions against advisories before any mainnet consideration
      (out of scope: DEMO/testnet).
- [ ] Extend the invariant suite (more actors, role rotation, VRF config changes mid-draw, very large rounds).
