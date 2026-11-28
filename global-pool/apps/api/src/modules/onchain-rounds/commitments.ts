/**
 * Pure helpers for mirroring a round on GlobalPoolRounds (no I/O): the rules document + hash published with
 * `openRound`, the per-entry commitments and Merkle tree committed with `commitEntries`, and the payouts tree
 * recorded with `recordSettlement`. Encodings come from `@gp/contracts/verify` (the TS mirror of DrawMath.sol that
 * the forge suite proves equal to the contract), so the API cannot drift from what the chain verifies.
 */
import {
  buildTree,
  encodeEntryId,
  entryLeaf,
  payoutLeaf,
  userCommitment,
  verifyProof,
} from '@gp/contracts/verify';
import { toBaseUnits } from '@gp/shared/money';
import { keccak256, stringToHex, type Hex } from 'viem';
import { randomBytes } from 'node:crypto';

import { canonicalJson } from '../../common/crypto';

/** Rules that are published (hash on-chain) and frozen when a round opens. */
export interface RoundRulesInput {
  roundId: bigint;
  closesAt: Date;
  entryPrice: string;
  feePerEntry: string;
  minParticipants: number;
  minPool: string;
  prizeSplitBps: readonly number[];
}

export interface OnchainRoundParams {
  roundId: bigint;
  closesAt: bigint;
  entryPrice: bigint;
  feePerEntry: bigint;
  minParticipants: bigint;
  minPool: bigint;
  prizeSplitBps: number[];
  rulesHash: Hex;
}

/** Canonical rules document (sorted-key JSON). Its keccak256 is the on-chain `rulesHash`. */
export function rulesDocument(r: RoundRulesInput) {
  return {
    document: 'GLOBAL POOL round rules',
    version: 1,
    demo: true,
    roundId: r.roundId.toString(),
    closesAt: Math.floor(r.closesAt.getTime() / 1000),
    currency: 'USDT (test token, 6 decimals)',
    entryPriceUnits: toBaseUnits(r.entryPrice).toString(),
    platformFeePerEntryUnits: toBaseUnits(r.feePerEntry).toString(),
    platformFeeNote:
      'The platform fee is charged per entry, is never part of the pool and is not refunded.',
    minParticipants: r.minParticipants,
    minPoolUnits: toBaseUnits(r.minPool).toString(),
    prizeSplitBps: [...r.prizeSplitBps],
    winnerAlgorithm: 'GLOBAL_POOL_WINNERS_V1 (DrawMath.deriveWinners, Chainlink VRF v2.5 word)',
    entryOrder: 'qualifying entries sorted by purchase sequence; index = seq - 1',
    cancellation: 'thresholds not met: stakes refunded to Owed (fees not refunded)',
  };
}

export function rulesHash(r: RoundRulesInput): Hex {
  return keccak256(stringToHex(canonicalJson(rulesDocument(r))));
}

/** `openRound` arguments in USDT base units (6 decimals). */
export function onchainRoundParams(r: RoundRulesInput): OnchainRoundParams {
  return {
    roundId: r.roundId,
    closesAt: BigInt(Math.floor(r.closesAt.getTime() / 1000)),
    entryPrice: toBaseUnits(r.entryPrice),
    feePerEntry: toBaseUnits(r.feePerEntry),
    minParticipants: BigInt(r.minParticipants),
    minPool: toBaseUnits(r.minPool),
    prizeSplitBps: [...r.prizeSplitBps],
    rulesHash: rulesHash(r),
  };
}

export interface CommitmentEntryInput {
  /** DB entry id (uuid). */
  id: string;
  seq: number;
  /** Public entry id, e.g. E-1248-00981. */
  code: string;
  /** Owner's public id, e.g. GP-48213 (hashed inside the commitment, never published). */
  userPublicId: string;
}

export interface EntryCommitmentRow {
  entryId: string;
  index: number;
  entryIdBytes32: Hex;
  salt: Hex;
  userCommitment: Hex;
  leaf: Hex;
}

export const randomSalt = (): Hex => `0x${randomBytes(32).toString('hex')}`;

/**
 * Commitments for the canonical entry list (sorted by seq; seq must be 1..N). Salts are fresh random 32-byte
 * secrets unless `saltFor` is given (tests / fixtures). Returns the rows and the Merkle root (zero for no entries).
 */
export function buildEntryCommitments(
  entries: readonly CommitmentEntryInput[],
  saltFor: (index: number) => Hex = randomSalt,
): { rows: EntryCommitmentRow[]; root: Hex } {
  const rows = entries.map((e, index) => {
    if (e.seq !== index + 1) {
      throw new Error(
        `entry list must be in canonical seq order (index ${index} has seq ${e.seq})`,
      );
    }
    const salt = saltFor(index);
    const entryIdBytes32 = encodeEntryId(e.code);
    const commitment = userCommitment(e.userPublicId, salt);
    return {
      entryId: e.id,
      index,
      entryIdBytes32,
      salt,
      userCommitment: commitment,
      leaf: entryLeaf({
        index: BigInt(index),
        entryId: entryIdBytes32,
        userCommitment: commitment,
      }),
    };
  });
  const root = rows.length === 0 ? ZERO_ROOT : (buildTree(rows.map((r) => r.leaf)).root as Hex);
  return { rows, root };
}

export const ZERO_ROOT: Hex = `0x${'0'.repeat(64)}`;

/** Merkle proofs for every leaf of a tree (index order). */
export function proofsFor(leaves: readonly Hex[]): { root: Hex; proofs: Hex[][] } {
  const tree = buildTree(leaves);
  return { root: tree.root as Hex, proofs: leaves.map((_, i) => tree.getProof(i) as Hex[]) };
}

export interface PayoutInput {
  /** 1-based rank. */
  rank: number;
  entryIndex: number;
  entryIdBytes32: Hex;
  userCommitment: Hex;
  /** USDT decimal string. */
  amount: string;
}

export interface PayoutRow extends PayoutInput {
  amountUnits: bigint;
  leaf: Hex;
  proof: Hex[];
}

/** Payouts tree for `recordSettlement` (on-chain rank = rank − 1; amounts in base units). */
export function buildPayouts(
  roundId: bigint,
  payouts: readonly PayoutInput[],
): { rows: PayoutRow[]; root: Hex; totalUnits: bigint } {
  const withLeaves = payouts.map((p) => {
    const amountUnits = toBaseUnits(p.amount);
    return {
      ...p,
      amountUnits,
      leaf: payoutLeaf({
        roundId,
        rank: BigInt(p.rank - 1),
        entryIndex: BigInt(p.entryIndex),
        entryId: p.entryIdBytes32,
        userCommitment: p.userCommitment,
        amount: amountUnits,
      }),
    };
  });
  const { root, proofs } = proofsFor(withLeaves.map((p) => p.leaf));
  const rows = withLeaves.map((p, i) => ({ ...p, proof: proofs[i]! }));
  return { rows, root, totalUnits: rows.reduce((a, r) => a + r.amountUnits, 0n) };
}

export { verifyProof };
