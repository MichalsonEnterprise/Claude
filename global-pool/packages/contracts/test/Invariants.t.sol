// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {GlobalPoolRounds} from "../src/GlobalPoolRounds.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Test, console} from "forge-std/Test.sol";

/// @dev Drives random sequences of every state-changing call (with the right roles) over three round ids.
contract RoundsHandler is Test {
    GlobalPoolRounds internal immutable rounds;
    VRFCoordinatorV2_5Mock internal immutable coordinator;
    address internal immutable operator;
    address internal immutable settler;
    address internal immutable pauser;
    address internal immutable admin;

    uint256[] public requestIds;
    uint256 public opened;
    uint256 public committed;
    uint256 public drawsRequested;
    uint256 public settled;
    uint256 public cancelled;

    constructor(
        GlobalPoolRounds rounds_,
        VRFCoordinatorV2_5Mock coordinator_,
        address operator_,
        address settler_,
        address pauser_,
        address admin_
    ) {
        rounds = rounds_;
        coordinator = coordinator_;
        operator = operator_;
        settler = settler_;
        pauser = pauser_;
        admin = admin_;
    }

    function _id(uint256 seed) internal pure returns (uint256) {
        return 1 + (seed % 3);
    }

    function open(uint256 seed, uint32 durationSeed) external {
        uint16[] memory bps = new uint16[](3);
        bps[0] = 6000;
        bps[1] = 3000;
        bps[2] = 1000;
        vm.prank(operator);
        try rounds.openRound(
            _id(seed), uint64(block.timestamp + 1 + (durationSeed % 1 days)), 10_000_000, 50_000, 2, 0, bps, bytes32(0)
        ) {
            ++opened;
        } catch {}
    }

    function commit(uint256 seed, uint64 entriesSeed, uint64 participantsSeed, bool failThresholds) external {
        uint256 id = _id(seed);
        uint64 closesAt = rounds.getRound(id).closesAt;
        if (block.timestamp < closesAt) vm.warp(closesAt);
        // failThresholds: fewer entries than prizes or a single participant; otherwise thresholds are met.
        uint64 entries = failThresholds ? entriesSeed % 4 : 3 + (entriesSeed % 50);
        uint64 participants;
        if (entries > 0) {
            participants = failThresholds ? 1 + (participantsSeed % entries) : 2 + (participantsSeed % (entries - 1));
        }
        bytes32 root = entries == 0 ? bytes32(0) : keccak256(abi.encode(seed, entries));
        vm.prank(operator);
        try rounds.commitEntries(id, root, entries, participants, uint128(entries) * 10_000_000) {
            ++committed;
        } catch {}
    }

    function requestDraw(uint256 seed) external {
        try rounds.requestDraw(_id(seed)) returns (uint256 requestId) {
            requestIds.push(requestId);
            ++drawsRequested;
        } catch {}
    }

    function fulfil(uint256 seed, uint256 word) external {
        if (requestIds.length == 0) return;
        uint256[] memory words = new uint256[](1);
        words[0] = word;
        try coordinator.fulfillRandomWordsWithOverride(requestIds[seed % requestIds.length], address(rounds), words) {}
            catch {}
    }

    function rawFulfilAgain(uint256 seed, uint256 word) external {
        // A (buggy or malicious) duplicate callback straight from the coordinator address must be ignored.
        if (requestIds.length == 0) return;
        uint256[] memory words = new uint256[](1);
        words[0] = word;
        vm.prank(address(coordinator));
        rounds.rawFulfillRandomWords(requestIds[seed % requestIds.length], words);
    }

    function settle(uint256 seed) external {
        uint256 id = _id(seed);
        uint128 pool = rounds.getRound(id).poolAmount;
        vm.prank(settler);
        try rounds.recordSettlement(id, keccak256(abi.encode("payouts", id)), pool) {
            ++settled;
        } catch {}
    }

    function cancel(uint256 seed, uint16 reasonSeed) external {
        vm.prank(operator);
        try rounds.cancelRound(_id(seed), reasonSeed % 8) {
            ++cancelled;
        } catch {}
    }

    /// Advances one round a single step along the happy path so deep states (fulfilled, settled, re-requested)
    /// appear in most runs; the other actions interleave arbitrary (often invalid) calls around it.
    function drive(uint256 seed, uint256 word) external {
        uint256 id = _id(seed);
        GlobalPoolRounds.RoundStatus status = rounds.roundStatus(id);
        if (status == GlobalPoolRounds.RoundStatus.None) {
            this.open(seed, uint32(word));
        } else if (status == GlobalPoolRounds.RoundStatus.Open) {
            this.commit(seed, uint64(word), type(uint64).max, false);
        } else if (status == GlobalPoolRounds.RoundStatus.Committed) {
            if (rounds.thresholdsMet(id)) this.requestDraw(seed);
            else this.cancel(seed, 1); // THRESHOLDS_NOT_MET
        } else if (status == GlobalPoolRounds.RoundStatus.DrawRequested) {
            if (word % 4 == 0) vm.warp(block.timestamp + 1 days); // sometimes force the re-request path
            if (word % 4 == 0) this.requestDraw(seed);
            uint256[] memory words = new uint256[](1);
            words[0] = word;
            try coordinator.fulfillRandomWordsWithOverride(rounds.getRound(id).lastRequestId, address(rounds), words) {}
                catch {}
        } else if (status == GlobalPoolRounds.RoundStatus.Fulfilled) {
            this.settle(seed);
        }
    }

    function warp(uint32 secondsSeed) external {
        vm.warp(block.timestamp + (secondsSeed % 2 days));
    }

    function togglePause(bool on) external {
        if (on) {
            vm.prank(pauser);
            try rounds.pause() {} catch {}
        } else {
            vm.prank(admin);
            try rounds.unpause() {} catch {}
        }
    }
}

contract GlobalPoolRoundsInvariantTest is StdInvariant, Test {
    GlobalPoolRounds internal rounds;
    VRFCoordinatorV2_5Mock internal coordinator;
    RoundsHandler internal handler;

    mapping(uint256 => uint256) internal firstWord;
    mapping(uint256 => bool) internal wordSeen;
    mapping(uint256 => uint8) internal lastStatus;
    mapping(uint256 => bytes32) internal firstEntriesRoot;
    mapping(uint256 => bool) internal rootSeen;

    function setUp() public {
        vm.warp(1_795_766_400);
        coordinator = new VRFCoordinatorV2_5Mock(0.1 ether, 1 gwei, 4e15);
        uint256 subId = coordinator.createSubscription();
        coordinator.fundSubscription(subId, 1_000_000 ether);
        address admin = makeAddr("admin");
        address operator = makeAddr("operator");
        address settler = makeAddr("settler");
        address pauser = makeAddr("pauser");
        rounds = new GlobalPoolRounds(
            address(coordinator),
            GlobalPoolRounds.VrfConfig({
                keyHash: keccak256("key"), subscriptionId: subId, callbackGasLimit: 200_000, requestConfirmations: 3
            }),
            admin,
            operator,
            settler,
            pauser
        );
        rounds.lockCoordinator();
        coordinator.addConsumer(subId, address(rounds));
        handler = new RoundsHandler(rounds, coordinator, operator, settler, pauser, admin);
        targetContract(address(handler));
    }

    /// Once a round has a random word it never changes (no re-roll), and its winners stay derivable.
    /// Status never moves backwards; Cancelled and Settled are terminal; committed roots never change.
    function invariant_NoReRollAndMonotonicLifecycle() public {
        for (uint256 id = 1; id <= 3; ++id) {
            GlobalPoolRounds.Round memory r = rounds.getRound(id);
            uint8 s = uint8(r.status);
            uint8 prev = lastStatus[id];
            if (prev == uint8(GlobalPoolRounds.RoundStatus.Cancelled)) {
                assertEq(s, prev, "cancelled is terminal");
            } else if (s != uint8(GlobalPoolRounds.RoundStatus.Cancelled)) {
                assertGe(s, prev, "status moved backwards");
            } else {
                assertLe(prev, uint8(GlobalPoolRounds.RoundStatus.Committed), "cancelled after draw request");
            }
            lastStatus[id] = s;

            if (s == uint8(GlobalPoolRounds.RoundStatus.Fulfilled) || s == uint8(GlobalPoolRounds.RoundStatus.Settled))
            {
                if (!wordSeen[id]) {
                    wordSeen[id] = true;
                    firstWord[id] = r.randomWord;
                }
                assertEq(r.randomWord, firstWord[id], "random word changed");
                assertEq(rounds.computeWinners(id).length, r.prizeSplitBps.length);
            }
            if (s >= uint8(GlobalPoolRounds.RoundStatus.Committed) && r.entriesRoot != bytes32(0)) {
                if (!rootSeen[id]) {
                    rootSeen[id] = true;
                    firstEntriesRoot[id] = r.entriesRoot;
                }
                assertEq(r.entriesRoot, firstEntriesRoot[id], "entries root changed");
            }
            if (s == uint8(GlobalPoolRounds.RoundStatus.Settled)) assertEq(r.totalPaid, r.poolAmount);
        }
    }

    /// Coverage report: shows that random sequences really reach draws, settlements and cancellations.
    function afterInvariant() external view {
        console.log("opened / committed  ", handler.opened(), handler.committed());
        console.log("draws requested     ", handler.drawsRequested());
        console.log("settled / cancelled ", handler.settled(), handler.cancelled());
    }
}
