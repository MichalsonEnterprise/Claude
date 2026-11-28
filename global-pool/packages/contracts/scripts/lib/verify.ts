/**
 * GLOBAL POOL — off-chain mirror of `src/libraries/DrawMath.sol`.
 *
 * Everything a player, auditor or the platform API needs to rebuild and check a round without trusting the platform:
 * entry/payout leaf encodings, Merkle trees (OpenZeppelin `SimpleMerkleTree`, sorted-pair keccak256 — the same scheme
 * as OpenZeppelin `MerkleProof` on-chain), winner derivation from the VRF word and the prize split.
 * The forge test suite (`test/MerkleFixture.t.sol`) proves this file and the contract agree on the committed fixture.
 *
 * Amounts are bigint USDT base units (6 decimals). Never use JS numbers for money.
 */
import { SimpleMerkleTree } from '@openzeppelin/merkle-tree';
import { encodeAbiParameters, hexToBigInt, keccak256, stringToHex, toHex, type Hex } from 'viem';

/** Basis-point denominator (100% = 10_000). */
export const BPS_DENOMINATOR = 10_000n;

/** keccak256("GLOBAL_POOL_WINNERS_V1") — domain tag of the winner derivation (DrawMath.WINNERS_DOMAIN). */
export const WINNERS_DOMAIN: Hex = keccak256(stringToHex('GLOBAL_POOL_WINNERS_V1'));

const TWO_256 = 1n << 256n;

/** One entry of a round's canonical entry list (position in the list = `index`). */
export interface EntryLeafInput {
  index: bigint;
  entryId: Hex;
  userCommitment: Hex;
}

/** One credited prize of a settled round. */
export interface PayoutLeafInput {
  roundId: bigint;
  rank: bigint;
  entryIndex: bigint;
  entryId: Hex;
  userCommitment: Hex;
  amount: bigint;
}

/**
 * Encodes a platform entry id (e.g. `E-1248-00981`) as bytes32: UTF-8, right-padded with zeros when it fits in 32
 * bytes, otherwise keccak256 of the UTF-8 bytes.
 */
export function encodeEntryId(id: string): Hex {
  const bytes = new TextEncoder().encode(id);
  return bytes.length <= 32 ? stringToHex(id, { size: 32 }) : keccak256(toHex(bytes));
}

/**
 * Hiding commitment to the entry owner: `keccak256(abi.encode(keccak256(utf8(userPublicId)), salt))`.
 * `salt` is a random 32-byte secret stored with the entry and shown only to its owner (entry receipt), so outsiders
 * cannot link entries to users but the owner can prove/check inclusion.
 */
export function userCommitment(userPublicId: string, salt: Hex): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'bytes32' }],
      [keccak256(stringToHex(userPublicId)), salt],
    ),
  );
}

/** Entries-tree leaf: `keccak256(abi.encode(uint256 index, bytes32 entryId, bytes32 userCommitment))`. */
export function entryLeaf({ index, entryId, userCommitment: commitment }: EntryLeafInput): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'uint256' }, { type: 'bytes32' }, { type: 'bytes32' }],
      [index, entryId, commitment],
    ),
  );
}

/** Payouts-tree leaf: `keccak256(abi.encode(roundId, rank, entryIndex, entryId, userCommitment, amount))`. */
export function payoutLeaf(p: PayoutLeafInput): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'uint256' },
      ],
      [p.roundId, p.rank, p.entryIndex, p.entryId, p.userCommitment, p.amount],
    ),
  );
}

/**
 * Builds a Merkle tree over pre-hashed leaves, keeping input order (leaf i = entry index i).
 * Proofs verify with OpenZeppelin `MerkleProof.verify` and `GlobalPoolRounds.verifyEntry`.
 */
export function buildTree(leaves: readonly Hex[]): SimpleMerkleTree {
  if (leaves.length === 0) throw new Error('a Merkle tree needs at least one leaf');
  return SimpleMerkleTree.of([...leaves], { sortLeaves: false });
}

/** Verifies a proof for a pre-hashed leaf (sorted-pair keccak256). Accepts any 0x-hex strings. */
export function verifyProof(root: string, leaf: string, proof: readonly string[]): boolean {
  return SimpleMerkleTree.verify(root, leaf, [...proof]);
}

/**
 * Derives `count` distinct winning indices in `[0, totalEntries)` from the VRF word, ordered by prize rank.
 * Mirrors `DrawMath.deriveWinners`: candidate_k = keccak256(abi.encode(WINNERS_DOMAIN, roundId, randomWord, k)),
 * reject candidate_k < 2^256 mod totalEntries (no modulo bias), index = candidate_k % totalEntries, skip duplicates.
 */
export function deriveWinners(
  roundId: bigint,
  randomWord: bigint,
  totalEntries: bigint,
  count: bigint,
): bigint[] {
  if (count === 0n || count > totalEntries) {
    throw new Error(`invalid winner count ${count} for ${totalEntries} entries`);
  }
  const threshold = TWO_256 % totalEntries;
  const winners: bigint[] = [];
  const seen = new Set<bigint>();
  for (let nonce = 0n; BigInt(winners.length) < count; nonce++) {
    const candidate = hexToBigInt(
      keccak256(
        encodeAbiParameters(
          [{ type: 'bytes32' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }],
          [WINNERS_DOMAIN, roundId, randomWord, nonce],
        ),
      ),
    );
    if (candidate < threshold) continue;
    const index = candidate % totalEntries;
    if (seen.has(index)) continue;
    seen.add(index);
    winners.push(index);
  }
  return winners;
}

/** Prize amount per rank (`DrawMath.splitPool`): floor(pool × bps / 10_000) for ranks ≥ 2, dust to 1st prize. */
export function splitPool(pool: bigint, bps: readonly number[]): bigint[] {
  const amounts = bps.map((b, i) => (i === 0 ? 0n : (pool * BigInt(b)) / BPS_DENOMINATOR));
  const rest = amounts.reduce((sum, a) => sum + a, 0n);
  if (amounts.length > 0) amounts[0] = pool - rest;
  return amounts;
}
