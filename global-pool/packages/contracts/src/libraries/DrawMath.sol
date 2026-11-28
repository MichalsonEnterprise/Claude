// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DrawMath
/// @notice Pure, deterministic helpers shared by {GlobalPoolRounds} and off-chain verifiers: Merkle leaf encodings,
///         winner derivation from a VRF word and the pool split. Every function here is reproducible bit-for-bit in
///         TypeScript (see `scripts/lib/verify.ts`); the forge test suite checks both implementations agree.
/// @dev    Changing anything in this file changes how results are derived and therefore requires a new contract
///         version (and a new `WINNERS_DOMAIN`). Never edit it in place for a deployed version.
library DrawMath {
    /// @notice Basis-point denominator for prize splits (100% = 10_000).
    uint256 internal constant BPS_DENOMINATOR = 10_000;

    /// @notice Domain tag mixed into every winner-derivation hash (versioned so a future algorithm cannot collide).
    bytes32 internal constant WINNERS_DOMAIN = keccak256("GLOBAL_POOL_WINNERS_V1");

    /// @notice Thrown when more winners are requested than there are entries (or zero winners).
    error InvalidWinnerCount(uint256 count, uint256 totalEntries);

    /// @notice Leaf of the entries Merkle tree committed by {GlobalPoolRounds-commitEntries}.
    /// @dev    `keccak256(abi.encode(index, entryId, userCommitment))`. The 96-byte preimage can never be confused with a
    ///         64-byte internal node, so the single hash is not open to second-preimage tricks. Pairs are hashed sorted
    ///         (OpenZeppelin `MerkleProof` / `SimpleMerkleTree` convention).
    /// @param index          Zero-based position of the entry in the round's canonical entry list.
    /// @param entryId        Platform entry identifier encoded as bytes32 (see README "Encodings").
    /// @param userCommitment Hiding commitment to the entry owner (see README "Encodings").
    /// @return The leaf hash.
    function entryLeaf(uint256 index, bytes32 entryId, bytes32 userCommitment) internal pure returns (bytes32) {
        return keccak256(abi.encode(index, entryId, userCommitment));
    }

    /// @notice Leaf of the payouts Merkle tree recorded by {GlobalPoolRounds-recordSettlement}.
    /// @dev    `keccak256(abi.encode(roundId, rank, entryIndex, entryId, userCommitment, amount))` (192-byte preimage).
    /// @param roundId        Round identifier.
    /// @param rank           Zero-based prize rank (0 = 1st prize).
    /// @param entryIndex     Winning entry index for that rank (from {deriveWinners}).
    /// @param entryId        Winning entry identifier (bytes32).
    /// @param userCommitment Winning entry's user commitment.
    /// @param amount         Prize amount credited, in accounting base units (USDT, 6 decimals).
    /// @return The leaf hash.
    function payoutLeaf(
        uint256 roundId,
        uint256 rank,
        uint256 entryIndex,
        bytes32 entryId,
        bytes32 userCommitment,
        uint256 amount
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(roundId, rank, entryIndex, entryId, userCommitment, amount));
    }

    /// @notice Derives `count` distinct winning entry indices in `[0, totalEntries)` from a VRF word.
    /// @dev    Iterative hashing with rejection: candidate `x_k = uint256(keccak256(abi.encode(WINNERS_DOMAIN, roundId,
    ///         randomWord, k)))` for k = 0, 1, 2, ...; values below `2^256 mod totalEntries` are rejected (removes modulo
    ///         bias), the rest map to `x_k % totalEntries`; an index already drawn is skipped. The i-th distinct index
    ///         wins prize rank i. Terminates with probability 1 because `count <= totalEntries`.
    /// @param roundId      Round identifier (binds the derivation to the round).
    /// @param randomWord   The VRF random word stored for the round.
    /// @param totalEntries Number of committed entries (the index space).
    /// @param count        Number of prizes (winners) to draw.
    /// @return winners     Winning indices, ordered by prize rank.
    function deriveWinners(uint256 roundId, uint256 randomWord, uint256 totalEntries, uint256 count)
        internal
        pure
        returns (uint256[] memory winners)
    {
        if (count == 0 || count > totalEntries) revert InvalidWinnerCount(count, totalEntries);
        winners = new uint256[](count);
        uint256 threshold;
        unchecked {
            // 2^256 mod totalEntries: candidates below it are rejected so every index is equally likely.
            threshold = (0 - totalEntries) % totalEntries;
        }
        uint256 found;
        uint256 nonce;
        while (found < count) {
            uint256 candidate = uint256(keccak256(abi.encode(WINNERS_DOMAIN, roundId, randomWord, nonce)));
            unchecked {
                ++nonce;
            }
            if (candidate < threshold) continue;
            uint256 index = candidate % totalEntries;
            bool duplicate;
            for (uint256 j; j < found; ++j) {
                if (winners[j] == index) {
                    duplicate = true;
                    break;
                }
            }
            if (!duplicate) {
                winners[found] = index;
                unchecked {
                    ++found;
                }
            }
        }
    }

    /// @notice Splits `pool` into prize amounts by basis points; rounding dust goes to the 1st prize.
    /// @dev    `amounts[i] = pool * bps[i] / 10_000` for i >= 1 and `amounts[0] = pool - sum(amounts[1..])`, so the
    ///         amounts always sum to exactly `pool`. Assumes `bps` sums to 10_000 (validated when the round opens).
    /// @param pool Pool amount in accounting base units.
    /// @param bps  Prize split in basis points, ordered by rank.
    /// @return amounts Prize amount per rank.
    function splitPool(uint256 pool, uint16[] memory bps) internal pure returns (uint256[] memory amounts) {
        uint256 n = bps.length;
        amounts = new uint256[](n);
        if (n == 0) return amounts;
        uint256 rest;
        for (uint256 i = 1; i < n; ++i) {
            uint256 a = (pool * bps[i]) / BPS_DENOMINATOR;
            amounts[i] = a;
            rest += a;
        }
        amounts[0] = pool - rest;
    }
}
