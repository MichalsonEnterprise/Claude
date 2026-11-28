# GLOBAL POOL — On-chain contracts (hybrid custody)

> DEMO / testnet only. MVP chain: **Arbitrum Sepolia (421614)**. `REAL_MONEY_ENABLED=false`.
> Package: [`packages/contracts`](../packages/contracts/README.md). The package README covers the full design,
> encodings, threat model and audit TODOs. This page is the integration guide for the API, web and ops work.

## 1. What lives where

Owner decision (28 Nov 2026): **custody is hybrid.**

- Player money stays in the platform's append-only double-entry ledger (Available / Locked / Pending / Owed).
- Global Pool rounds are **mirrored and drawn on-chain** by `GlobalPoolRounds`. This contract holds no funds;
  it is a public, immutable record that makes each draw verifiable.

| Concern                                                                                 | System of record                                   |
| --------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Deposits / withdrawals / balances / fees                                                | API + Postgres ledger (chain watcher for deposits) |
| Entry purchase (10.00 USDT + 0.05 USDT fee per entry, network fee 0.00)                 | ledger (fee → `fee_ledger`, never the pool)        |
| Round rules, entry-list commitment, thresholds, randomness, winners, payout attestation | `GlobalPoolRounds` on Arbitrum Sepolia             |
| Refunds (cancelled round) and prize credits                                             | ledger, mirrored by on-chain events                |

## 2. Contract surface (summary)

`GlobalPoolRounds` (Solidity 0.8.28; OpenZeppelin 5.6.1 `AccessControl` + `Pausable`; Chainlink
`VRFConsumerBaseV2Plus`, VRF v2.5 subscription, LINK payment):

| Step              | Call                                                                                                              | Caller                | Emits                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------- |
| open              | `openRound(roundId, closesAt, entryPrice, feePerEntry, minParticipants, minPool, prizeSplitBps[], rulesHash)`     | `OPERATOR_ROLE`       | `RoundOpened`                                      |
| freeze entries    | `commitEntries(roundId, entriesMerkleRoot, totalEntries, totalParticipants, poolAmount)` (after `closesAt`, once) | `OPERATOR_ROLE`       | `EntriesCommitted(…, platformFees, thresholdsMet)` |
| failed thresholds | `cancelRound(roundId, 1)`                                                                                         | anyone                | `RoundCancelled`                                   |
| draw              | `requestDraw(roundId)` (exactly once per round — never re-requested)                                              | anyone (keeper)       | `DrawRequested(…, attempt = 1)`                    |
| VRF timeout       | `cancelRound(roundId, 5)` (VRF_TIMEOUT; only from DrawRequested, ≥ 24 h unfulfilled; late callback ignored)       | anyone (keeper)       | `RoundCancelled`                                   |
| randomness        | VRF callback                                                                                                      | Chainlink coordinator | `DrawFulfilled(roundId, requestId, randomWord)`    |
| results           | `computeWinners(roundId)`, `prizeAmounts(roundId)`                                                                | view                  | —                                                  |
| settle            | `recordSettlement(roundId, payoutsMerkleRoot, totalPaid)` (`totalPaid == pool`)                                   | `SETTLER_ROLE`        | `RoundSettled(…, winningIndices)`                  |
| emergency         | `pause()` / `unpause()`: blocks open + commit only                                                                | `PAUSER_ROLE` / admin | `Paused` / `Unpaused`                              |

There is no function that sets or overrides a random word, winners, entries or settlements. The inherited
coordinator-redirect path is closed by `lockCoordinator()`, which the deploy script calls.

## 3. API integration (for the API agent)

**Imports.** Add `"@gp/contracts": "workspace:*"` to `apps/api/package.json`.

```ts
import {
  globalPoolRoundsAbi,
  RoundStatus,
  CancelReason,
  ACCOUNTING_DECIMALS,
} from '@gp/contracts/abi';
import {
  encodeEntryId,
  userCommitment,
  entryLeaf,
  payoutLeaf,
  buildTree,
  deriveWinners,
  splitPool,
  verifyProof,
} from '@gp/contracts/verify';
// plain JSON ABI: '@gp/contracts/abi/GlobalPoolRounds.json'
```

Both entry points are built to `packages/contracts/dist` (ESM + CJS + d.ts). Run
`pnpm --filter @gp/contracts build`, which needs Foundry, or `build:ts`, which needs only Node. They are not
re-exported from `@gp/shared`, so that `@gp/shared` stays free of the Foundry package.

**Units.** On-chain amounts are `bigint` USDT base units with 6 decimals: `10.00 USDT = 10_000_000n`. Convert
at the boundary with `@gp/shared/money` (decimal.js); ledger columns are `Decimal(20, 6)`.

**Suggested flow.** All writes are idempotent jobs, keyed by `(roundId, step)`, running in BullMQ.

1. **Round created** (admin action with RBAC + reason + MFA, logged in the hash-chained `audit_logs`): call
   `openRound` with the DEMO numbers (entry 10_000_000, fee 50_000, min 500 participants, min pool
   50_000_000_000, split `[5000,2000,1000,200×10]`) and `rulesHash = keccak256(rules document)`.
2. **Close** (at `closesAt`, the real time; no fake timers):
   1. Lock new entries.
   2. Load the qualifying entries ordered by ledger sequence and assign `index = 0…N−1`.
   3. Store `entryId` (bytes32), a **random 32-byte salt per entry** (encrypted at rest, shown only to the
      owner) and `userCommitment`.
   4. Build the tree with `buildTree(entries.map(entryLeaf))`, and persist the root and each entry's proof.
   5. Publish the manifest (leaf list).
   6. Call `commitEntries` with `poolAmount = N × entryPrice`.
3. **Thresholds** come from the `EntriesCommitted.thresholdsMet` event or the `thresholdsMet(roundId)` view.
   - If false: call `cancelRound(roundId, CancelReason.ThresholdsNotMet)`, then refund entries in the ledger
     (Owed → Available, e.g. round #1,245).
   - If true: call `requestDraw(roundId)` from a keeper account with no role.
4. **Fulfilment.**
   1. Watch `DrawFulfilled` with confirmations (Arbitrum Sepolia: 20 per the demo table).
   2. Read `computeWinners` and `prizeAmounts`.
   3. Credit prizes in one ledger transaction (pool liability → winners).
   4. Build the payouts tree with `payoutLeaf`, then call `recordSettlement(roundId, root, pool)`.
   5. Persist the proofs so winners can call `verifyPayout`.
5. **Monitoring and alerts.** Raise an alert on:
   - `RoundCancelled` with reason `VRF_TIMEOUT` (5): a disclosed incident (stakes refunded);
   - `FulfillmentIgnored`;
   - `coordinatorPinned() == false`;
   - `Paused`;
   - any `RoleGranted` or `RoleRevoked`;
   - a low LINK balance on the VRF subscription.

   Randomness is never re-requested (Chainlink VRF guidance: a re-request lets whoever can delay fulfilment choose
   between two outcomes). If the request is unfulfilled after 24 h, the keeper calls
   `cancelRound(roundId, CancelReason.VrfTimeout)` and the ledger refunds every stake to Owed.

**Suggested DB fields.**

- `rounds`: `chain_id`, `contract_address`, `rules_hash`, `entries_root`, `commit_tx`, `vrf_request_id`,
  `random_word`, `draw_attempts`, `payouts_root`, `settle_tx`, `onchain_status`.
- `entries`: `round_index`, `entry_id_bytes32`, `salt_encrypted`, `user_commitment`, `merkle_proof` (jsonb).
- `payouts`: `rank`, `entry_index`, `amount`, `merkle_proof`.

**Keys.** The OPERATOR, SETTLER and PAUSER roles are separate testnet service keys held in a KMS or HSM; never
put them in env files or commit them. DEFAULT_ADMIN is a multisig. Tests use Anvil or throwaway keys generated
at runtime. For local end-to-end runs, `anvil` + `forge script script/Deploy.s.sol:Deploy --rpc-url
http://127.0.0.1:8545 --broadcast` deploys a `VRFCoordinatorV2_5Mock` too, with a throwaway Anvil key passed on
the command line. Fulfil requests with `mock.fulfillRandomWords(requestId, consumer)`.

## 4. Web integration (for the web agent)

The Pool and History screens show the provable-fairness data. Every value carries the DEMO badges.

- Request id, fulfilment time, confirmations and the explorer links for `commit_tx`, the VRF request and
  `settle_tx`.
- The "Verify my entries" panel shows each entry's index, entry id and proof, with a button that calls
  `verifyEntry` via viem `readContract` (no wallet needed).
- Winners are derived with `deriveWinners`, so they can be reproduced in the browser from the on-chain word.
- Odds disclosure follows the demo data: 35 entries of 18,640 give about a 2.44% chance of any prize and about
  0.188% for 1st.

## 5. Deployment status

| Item                      | Status                                                                                                                                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract + tests          | done: 67 tests (unit, fuzz, invariant, TS fixture cross-check)                                                                                                                                                                                             |
| Deploy script             | `script/Deploy.s.sol`, env-driven; simulated in-memory and on an Arbitrum Sepolia fork; **not broadcast**                                                                                                                                                  |
| Arbitrum Sepolia VRF v2.5 | coordinator `0x5CE8D5A2BC84beb22a398CCA51996F7930313D61`, 50 gwei key hash `0x1770bdc7…cfd2be`, LINK `0xb1D4538B…1E80E`; **verify before use** (package README)                                                                                            |
| Subscription / consumer   | to be created and funded by the owner at vrf.chain.link; then deploy and add the consumer                                                                                                                                                                  |
| Audit                     | not audited; see the package README's Audit TODOs. The admin screen's "Audited — DEMO placeholder" label must stay a placeholder                                                                                                                           |
| API integration           | done: `apps/api` mirrors rounds (`RoundMirrorService`), watches `DrawFulfilled` and records settlements; proven end to end on Anvil (`apps/api/test/chain.e2e-spec.ts`) — not yet run against Arbitrum Sepolia                                             |
| Local devnet artifacts    | `artifacts/local-devnet.json` (`@gp/contracts/artifacts/local-devnet.json`): ABI + bytecode of `GlobalPoolRounds`, `VRFCoordinatorV2_5Mock` and the test-only `MockUSDT` (`test/mocks/`), regenerated by `build` / `artifacts`; a freshness test guards it |

The demo admin table lists "GlobalPool v1.3.0 / VRFConsumer v1.1.2 / Treasury v1.0.4" with placeholder
addresses. Those are Figma DEMO values. The real MVP has a single contract, `GlobalPoolRounds` v0.1.0, and no
treasury contract, because there is no on-chain custody under the hybrid model.
