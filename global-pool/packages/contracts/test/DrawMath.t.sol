// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DrawMath} from "../src/libraries/DrawMath.sol";
import {Test} from "forge-std/Test.sol";

/// @dev Exposes the internal library functions so reverts can be asserted via external calls.
contract DrawMathHarness {
    function deriveWinners(uint256 roundId, uint256 randomWord, uint256 totalEntries, uint256 count)
        external
        pure
        returns (uint256[] memory)
    {
        return DrawMath.deriveWinners(roundId, randomWord, totalEntries, count);
    }

    function splitPool(uint256 pool, uint16[] memory bps) external pure returns (uint256[] memory) {
        return DrawMath.splitPool(pool, bps);
    }
}

contract DrawMathTest is Test {
    uint256 internal constant MAX_PRIZES = 100;
    DrawMathHarness internal h;

    function setUp() public {
        h = new DrawMathHarness();
    }

    /// Winners are distinct, in range, of the requested length and fully determined by (round, word, n, count).
    function testFuzz_DeriveWinners_DistinctInRangeDeterministic(
        uint256 roundId,
        uint256 word,
        uint64 totalEntries,
        uint256 countSeed
    ) public view {
        uint256 n = bound(uint256(totalEntries), 1, type(uint64).max);
        uint256 count = bound(countSeed, 1, n < MAX_PRIZES ? n : MAX_PRIZES);
        uint256[] memory w = h.deriveWinners(roundId, word, n, count);
        assertEq(w.length, count);
        for (uint256 i; i < count; ++i) {
            assertLt(w[i], n);
            for (uint256 j = i + 1; j < count; ++j) {
                assertTrue(w[i] != w[j], "duplicate winner");
            }
        }
        assertEq(h.deriveWinners(roundId, word, n, count), w, "not deterministic");
    }

    /// When count == totalEntries the result is a permutation of 0..n-1 (worst case for duplicate rejection).
    function testFuzz_DeriveWinners_FullPermutation(uint256 word, uint8 nSeed) public view {
        uint256 n = bound(uint256(nSeed), 1, 40);
        uint256[] memory w = h.deriveWinners(1248, word, n, n);
        bool[] memory seen = new bool[](n);
        for (uint256 i; i < n; ++i) {
            assertFalse(seen[w[i]], "duplicate");
            seen[w[i]] = true;
        }
    }

    /// Rejection sampling path: index spaces just above 2^255 reject ~50% of candidates and must still terminate.
    function testFuzz_DeriveWinners_HugeIndexSpace(uint256 word, uint256 offset) public view {
        uint256 n = (uint256(1) << 255) + bound(offset, 1, 1e18);
        uint256[] memory w = h.deriveWinners(7, word, n, 13);
        for (uint256 i; i < w.length; ++i) {
            assertLt(w[i], n);
        }
    }

    /// The prefix of a derivation does not depend on how many winners are requested (rank i is stable).
    function testFuzz_DeriveWinners_PrefixStable(uint256 word, uint64 totalEntries) public view {
        uint256 n = bound(uint256(totalEntries), 13, type(uint64).max);
        uint256[] memory three = h.deriveWinners(1248, word, n, 3);
        uint256[] memory thirteen = h.deriveWinners(1248, word, n, 13);
        for (uint256 i; i < 3; ++i) {
            assertEq(three[i], thirteen[i]);
        }
    }

    function test_DeriveWinners_RevertsOnInvalidCount() public {
        vm.expectRevert(abi.encodeWithSelector(DrawMath.InvalidWinnerCount.selector, 0, 10));
        h.deriveWinners(1, 1, 10, 0);
        vm.expectRevert(abi.encodeWithSelector(DrawMath.InvalidWinnerCount.selector, 11, 10));
        h.deriveWinners(1, 1, 10, 11);
        vm.expectRevert(abi.encodeWithSelector(DrawMath.InvalidWinnerCount.selector, 1, 0));
        h.deriveWinners(1, 1, 0, 1);
    }

    /// Smoke test for uniformity: 1st-prize index over 4,000 deterministic words on 8 entries (expected 500 each).
    function test_DeriveWinners_FirstPrizeRoughlyUniform() public view {
        uint256[8] memory hits;
        for (uint256 k; k < 4000; ++k) {
            uint256 word = uint256(keccak256(abi.encode("uniformity", k)));
            hits[h.deriveWinners(1248, word, 8, 1)[0]]++;
        }
        for (uint256 i; i < 8; ++i) {
            assertGt(hits[i], 400);
            assertLt(hits[i], 600);
        }
    }

    /// Prize amounts always sum to the pool; ranks ≥ 2 are floor(pool × bps / 10_000); dust goes to rank 1.
    function testFuzz_SplitPool_SumsToPool(uint128 pool, uint8 ranksSeed, uint256 splitSeed) public view {
        uint256 ranks = bound(uint256(ranksSeed), 1, MAX_PRIZES);
        uint16[] memory bps = _randomSplit(ranks, splitSeed);
        uint256[] memory amounts = h.splitPool(pool, bps);
        uint256 sum;
        for (uint256 i; i < ranks; ++i) {
            if (i > 0) assertEq(amounts[i], (uint256(pool) * bps[i]) / 10_000);
            sum += amounts[i];
        }
        assertEq(sum, pool);
        // dust is bounded by one base unit per rank
        assertLe(amounts[0] - (uint256(pool) * bps[0]) / 10_000, ranks);
    }

    function test_SplitPool_DemoRound1248() public view {
        uint16[] memory bps = new uint16[](13);
        bps[0] = 5000;
        bps[1] = 2000;
        bps[2] = 1000;
        for (uint256 i = 3; i < 13; ++i) {
            bps[i] = 200;
        }
        uint256[] memory a = h.splitPool(186_400_000_000, bps);
        assertEq(a[0], 93_200_000_000);
        assertEq(a[1], 37_280_000_000);
        assertEq(a[2], 18_640_000_000);
        assertEq(a[12], 3_728_000_000);
    }

    function test_SplitPool_DustGoesToFirstPrize() public view {
        uint16[] memory bps = new uint16[](3);
        bps[0] = 3334;
        bps[1] = 3333;
        bps[2] = 3333;
        uint256[] memory a = h.splitPool(100, bps); // 33.33 + 33.33 → 33 + 33, first gets 34
        assertEq(a[0], 34);
        assertEq(a[1], 33);
        assertEq(a[2], 33);
    }

    /// Gas reference points (also captured by `forge snapshot`).
    function test_Gas_DeriveWinners_13of18640() public view {
        uint256 g = gasleft();
        h.deriveWinners(1248, uint256(keccak256("gas")), 18_640, 13);
        assertLt(g - gasleft(), 100_000);
    }

    function test_Gas_DeriveWinners_100of100() public view {
        uint256 g = gasleft();
        h.deriveWinners(1248, uint256(keccak256("gas")), 100, 100);
        assertLt(g - gasleft(), 3_000_000);
    }

    function _randomSplit(uint256 ranks, uint256 seed) internal pure returns (uint16[] memory bps) {
        bps = new uint16[](ranks);
        uint256 remaining = 10_000 - ranks; // every rank gets at least 1 bps
        for (uint256 i; i < ranks; ++i) {
            uint256 extra = i == ranks - 1 ? remaining : uint256(keccak256(abi.encode(seed, i))) % (remaining + 1);
            remaining -= extra;
            // forge-lint: disable-next-line(unsafe-typecast)
            bps[i] = uint16(1 + extra);
        }
    }
}
