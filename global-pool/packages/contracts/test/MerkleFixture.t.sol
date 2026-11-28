// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {GlobalPoolRounds} from "../src/GlobalPoolRounds.sol";
import {RoundsTestBase} from "./utils/RoundsTestBase.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {stdJson} from "forge-std/StdJson.sol";

/// @notice Cross-implementation checks against `test/fixtures/round-1248.json`, produced by the TypeScript verifier
///         (`scripts/build-fixture.ts`, OpenZeppelin merkle-tree + viem). If the contract and the TS
///         code ever disagree on a leaf encoding, a Merkle root, the winner derivation or the prize split, these fail.
contract MerkleFixtureTest is RoundsTestBase {
    using stdJson for string;

    string internal json;
    bytes32 internal root;

    function setUp() public override {
        super.setUp();
        json = vm.readFile(string.concat(vm.projectRoot(), "/test/fixtures/round-1248.json"));
        root = json.readBytes32(".entries.root");
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Entries tree
    // -----------------------------------------------------------------------------------------------------------------

    function test_Fixture_MatchesDemoNumbers() public view {
        assertEq(json.readUint(".round.roundId"), ROUND_ID);
        assertEq(json.readUint(".round.closesAt"), CLOSES_AT);
        assertEq(json.readUint(".round.entryPrice"), ENTRY_PRICE);
        assertEq(json.readUint(".round.feePerEntry"), FEE_PER_ENTRY);
        assertEq(json.readUint(".round.minParticipants"), MIN_PARTICIPANTS);
        assertEq(json.readUint(".round.minPool"), MIN_POOL);
        assertEq(json.readBytes32(".round.rulesHash"), RULES_HASH);
        assertEq(json.readUint(".entries.totalEntries"), TOTAL_ENTRIES);
        assertEq(json.readUint(".entries.totalParticipants"), TOTAL_PARTICIPANTS);
        assertEq(json.readUint(".entries.poolAmount"), POOL);
        assertEq(json.readUint(".entries.platformFees"), PLATFORM_FEES);
        uint256[] memory bps = json.readUintArray(".round.prizeSplitBps");
        uint16[] memory demo = _demoSplit();
        assertEq(bps.length, demo.length);
        for (uint256 i; i < bps.length; ++i) {
            assertEq(bps[i], demo[i]);
        }
    }

    function test_EntryProofs_VerifyWithOpenZeppelinAndContract() public {
        _openAndCommitFixture();
        uint256[] memory indices = json.readUintArray(".entries.sampleIndices");
        assertEq(indices.length, 38);
        for (uint256 i; i < indices.length; ++i) {
            string memory p = string.concat(".entries.samples[", vm.toString(i), "]");
            bytes32 entryId = json.readBytes32(string.concat(p, ".entryId"));
            bytes32 commitment = json.readBytes32(string.concat(p, ".userCommitment"));
            bytes32 leaf = json.readBytes32(string.concat(p, ".leaf"));
            bytes32[] memory proof = json.readBytes32Array(string.concat(p, ".proof"));

            assertEq(rounds.entryLeaf(indices[i], entryId, commitment), leaf, "leaf encoding differs from TS");
            assertTrue(MerkleProof.verify(proof, root, leaf), "OpenZeppelin MerkleProof rejected TS proof");
            assertTrue(rounds.verifyEntry(ROUND_ID, indices[i], entryId, commitment, proof), "verifyEntry");

            // Tampering with any field breaks the proof.
            assertFalse(rounds.verifyEntry(ROUND_ID, indices[i] + 1, entryId, commitment, proof));
            assertFalse(rounds.verifyEntry(ROUND_ID, indices[i], entryId, bytes32(uint256(commitment) ^ 1), proof));
        }
    }

    function test_EntryProofs_NovaKOwns35Entries() public view {
        uint256 count;
        uint256[] memory indices = json.readUintArray(".entries.sampleIndices");
        for (uint256 i; i < indices.length; ++i) {
            string memory p = string.concat(".entries.samples[", vm.toString(i), "]");
            if (keccak256(bytes(json.readString(string.concat(p, ".userId")))) == keccak256("GP-48213")) {
                assertGe(indices[i], 980);
                assertLe(indices[i], 1014);
                ++count;
            }
        }
        assertEq(count, 35);
        // Entry id E-1248-00981 is bytes32 ASCII, right-padded.
        assertEq(json.readBytes32(".entries.samples[1].entryId"), bytes32("E-1248-00981"));
    }

    function test_EntryProofs_IndexOutOfRangeRejected() public {
        _openAndCommitFixture();
        bytes32[] memory proof = json.readBytes32Array(".entries.samples[0].proof");
        assertFalse(
            rounds.verifyEntry(
                ROUND_ID,
                TOTAL_ENTRIES,
                json.readBytes32(".entries.samples[0].entryId"),
                json.readBytes32(".entries.samples[0].userCommitment"),
                proof
            )
        );
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Winner derivation parity
    // -----------------------------------------------------------------------------------------------------------------

    function test_WinnerVectors_MatchTypeScript() public view {
        uint256 i;
        for (; json.keyExists(string.concat(".winnerVectors[", vm.toString(i), "]")); ++i) {
            string memory p = string.concat(".winnerVectors[", vm.toString(i), "]");
            uint256[] memory expected = json.readUintArray(string.concat(p, ".winners"));
            uint256[] memory actual = rounds.deriveWinners(
                json.readUint(string.concat(p, ".roundId")),
                json.readUint(string.concat(p, ".randomWord")),
                json.readUint(string.concat(p, ".totalEntries")),
                json.readUint(string.concat(p, ".count"))
            );
            assertEq(actual, expected, string.concat("winner vector ", vm.toString(i)));
        }
        assertEq(i, 8, "vector count");
    }

    // -----------------------------------------------------------------------------------------------------------------
    // End-to-end: fixture round drawn with the fixture word, settled with the TS payouts tree
    // -----------------------------------------------------------------------------------------------------------------

    function test_FixtureRound_EndToEnd_PayoutsVerify() public {
        _openAndCommitFixture();
        uint256 requestId = rounds.requestDraw(ROUND_ID);
        _fulfilWith(requestId, json.readUint(".draw.randomWord"));

        uint256[] memory winners = rounds.computeWinners(ROUND_ID);
        assertEq(winners, json.readUintArray(".draw.winners"), "winners differ from TS");
        assertEq(rounds.prizeAmounts(ROUND_ID), json.readUintArray(".settlement.prizeAmounts"), "amounts differ");

        // Winning entries are provably in the committed list, before settlement already.
        for (uint256 rank; rank < PRIZES; ++rank) {
            string memory p = string.concat(".settlement.payouts[", vm.toString(rank), "]");
            assertTrue(
                rounds.verifyWinningEntry(
                    ROUND_ID,
                    rank,
                    json.readBytes32(string.concat(p, ".entryId")),
                    json.readBytes32(string.concat(p, ".userCommitment")),
                    json.readBytes32Array(string.concat(p, ".entryProof"))
                )
            );
        }

        vm.prank(settler);
        rounds.recordSettlement(
            ROUND_ID, json.readBytes32(".settlement.payoutsRoot"), uint128(json.readUint(".settlement.totalPaid"))
        );

        for (uint256 rank; rank < PRIZES; ++rank) {
            string memory p = string.concat(".settlement.payouts[", vm.toString(rank), "]");
            bytes32 entryId = json.readBytes32(string.concat(p, ".entryId"));
            bytes32 commitment = json.readBytes32(string.concat(p, ".userCommitment"));
            uint256 amount = json.readUint(string.concat(p, ".amount"));
            bytes32[] memory proof = json.readBytes32Array(string.concat(p, ".payoutProof"));

            assertEq(json.readUint(string.concat(p, ".entryIndex")), winners[rank]);
            assertTrue(rounds.verifyPayout(ROUND_ID, rank, entryId, commitment, amount, proof), "verifyPayout");
            assertTrue(
                MerkleProof.verify(
                    proof,
                    json.readBytes32(".settlement.payoutsRoot"),
                    rounds.payoutLeaf(ROUND_ID, rank, winners[rank], entryId, commitment, amount)
                )
            );
            // Wrong amount or a different rank for the same entry is rejected.
            assertFalse(rounds.verifyPayout(ROUND_ID, rank, entryId, commitment, amount + 1, proof));
            assertFalse(rounds.verifyPayout(ROUND_ID, (rank + 1) % PRIZES, entryId, commitment, amount, proof));
        }

        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.InvalidRank.selector, PRIZES, PRIZES));
        rounds.verifyPayout(ROUND_ID, PRIZES, bytes32(0), bytes32(0), 0, new bytes32[](0));
    }

    function _openAndCommitFixture() internal {
        _open(ROUND_ID);
        _commit(ROUND_ID, root, TOTAL_ENTRIES, TOTAL_PARTICIPANTS);
    }
}
