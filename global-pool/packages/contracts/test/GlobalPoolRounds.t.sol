// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {GlobalPoolRounds} from "../src/GlobalPoolRounds.sol";
import {RoundsTestBase} from "./utils/RoundsTestBase.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {console} from "forge-std/console.sol";

contract GlobalPoolRoundsTest is RoundsTestBase {
    // -----------------------------------------------------------------------------------------------------------------
    // Full lifecycle (DEMO round #1,248)
    // -----------------------------------------------------------------------------------------------------------------

    function test_FullLifecycle_DemoRound1248() public {
        uint16[] memory split = _demoSplit();
        vm.expectEmit(true, false, false, true, address(rounds));
        emit GlobalPoolRounds.RoundOpened(
            ROUND_ID, OPENED_AT, CLOSES_AT, ENTRY_PRICE, FEE_PER_ENTRY, MIN_PARTICIPANTS, MIN_POOL, split, RULES_HASH
        );
        _open(ROUND_ID);
        assertEq(uint8(_status(ROUND_ID)), uint8(GlobalPoolRounds.RoundStatus.Open));
        assertFalse(rounds.thresholdsMet(ROUND_ID));

        vm.warp(CLOSES_AT);
        vm.expectEmit(true, false, false, true, address(rounds));
        emit GlobalPoolRounds.EntriesCommitted(
            ROUND_ID, ENTRIES_ROOT, TOTAL_ENTRIES, TOTAL_PARTICIPANTS, POOL, PLATFORM_FEES, true
        );
        _commit(ROUND_ID, ENTRIES_ROOT, TOTAL_ENTRIES, TOTAL_PARTICIPANTS);
        assertTrue(rounds.thresholdsMet(ROUND_ID));

        vm.warp(CLOSES_AT + 4); // 20:00:04 UTC
        vm.expectEmit(true, true, false, true, address(rounds));
        emit GlobalPoolRounds.DrawRequested(
            ROUND_ID, 1, 1, KEY_HASH, subId, REQUEST_CONFIRMATIONS, CALLBACK_GAS_LIMIT, ENTRIES_ROOT, TOTAL_ENTRIES
        );
        vm.prank(stranger); // permissionless once committed with thresholds met
        uint256 requestId = rounds.requestDraw(ROUND_ID);
        assertEq(requestId, 1);
        assertEq(rounds.requestRound(requestId), ROUND_ID);

        vm.warp(CLOSES_AT + 41); // fulfilled 20:00:41 UTC
        uint256 expectedWord = uint256(keccak256(abi.encode(requestId, uint256(0)))); // mock's word
        vm.expectEmit(true, true, false, true, address(rounds));
        emit GlobalPoolRounds.DrawFulfilled(ROUND_ID, requestId, expectedWord);
        _fulfil(requestId);
        assertEq(uint8(_status(ROUND_ID)), uint8(GlobalPoolRounds.RoundStatus.Fulfilled));

        uint256[] memory winners = rounds.computeWinners(ROUND_ID);
        assertEq(winners.length, PRIZES);
        _assertDistinctInRange(winners, TOTAL_ENTRIES);
        assertEq(winners, rounds.deriveWinners(ROUND_ID, expectedWord, TOTAL_ENTRIES, PRIZES));

        uint256[] memory amounts = rounds.prizeAmounts(ROUND_ID);
        assertEq(amounts[0], 93_200_000_000); // 93,200.00
        assertEq(amounts[1], 37_280_000_000); // 37,280.00
        assertEq(amounts[2], 18_640_000_000); // 18,640.00
        uint256 total = amounts[0] + amounts[1] + amounts[2];
        for (uint256 i = 3; i < PRIZES; ++i) {
            assertEq(amounts[i], 3_728_000_000); // 3,728.00 each
            total += amounts[i];
        }
        assertEq(total, POOL);

        vm.warp(CLOSES_AT + 130); // settled 20:02:10 UTC
        vm.expectEmit(true, false, false, true, address(rounds));
        emit GlobalPoolRounds.RoundSettled(ROUND_ID, PAYOUTS_ROOT, POOL, winners);
        vm.prank(settler);
        rounds.recordSettlement(ROUND_ID, PAYOUTS_ROOT, POOL);

        GlobalPoolRounds.Round memory r = rounds.getRound(ROUND_ID);
        assertEq(uint8(r.status), uint8(GlobalPoolRounds.RoundStatus.Settled));
        assertEq(r.openedAt, OPENED_AT);
        assertEq(r.closesAt, CLOSES_AT);
        assertEq(r.committedAt, CLOSES_AT);
        assertEq(r.lastRequestAt, CLOSES_AT + 4);
        assertEq(r.fulfilledAt, CLOSES_AT + 41);
        assertEq(r.settledAt, CLOSES_AT + 130);
        assertEq(r.drawAttempts, 1);
        assertEq(r.entriesRoot, ENTRIES_ROOT);
        assertEq(r.payoutsRoot, PAYOUTS_ROOT);
        assertEq(r.totalPaid, POOL);
        assertEq(r.poolAmount, POOL);
        assertEq(r.randomWord, expectedWord);
        assertEq(r.fulfilledRequestId, requestId);
        assertEq(r.lastRequestId, requestId);
        assertEq(r.rulesHash, RULES_HASH);
        assertEq(r.prizeSplitBps.length, PRIZES);
        // Results stay readable and identical after settlement.
        assertEq(rounds.computeWinners(ROUND_ID), winners);
    }

    // -----------------------------------------------------------------------------------------------------------------
    // openRound validation
    // -----------------------------------------------------------------------------------------------------------------

    function test_OpenRound_RevertsOnZeroOrDuplicateId() public {
        uint16[] memory split = _demoSplit();
        vm.startPrank(operator);
        vm.expectRevert(GlobalPoolRounds.InvalidRoundId.selector);
        rounds.openRound(0, CLOSES_AT, ENTRY_PRICE, FEE_PER_ENTRY, MIN_PARTICIPANTS, MIN_POOL, split, RULES_HASH);
        rounds.openRound(ROUND_ID, CLOSES_AT, ENTRY_PRICE, FEE_PER_ENTRY, MIN_PARTICIPANTS, MIN_POOL, split, RULES_HASH);
        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.RoundAlreadyExists.selector, ROUND_ID));
        rounds.openRound(ROUND_ID, CLOSES_AT, ENTRY_PRICE, FEE_PER_ENTRY, MIN_PARTICIPANTS, MIN_POOL, split, RULES_HASH);
        vm.stopPrank();
    }

    function test_OpenRound_RevertsOnPastCloseOrZeroPrice() public {
        uint16[] memory split = _demoSplit();
        vm.startPrank(operator);
        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.InvalidCloseTime.selector, OPENED_AT));
        rounds.openRound(ROUND_ID, OPENED_AT, ENTRY_PRICE, FEE_PER_ENTRY, MIN_PARTICIPANTS, MIN_POOL, split, RULES_HASH);
        vm.expectRevert(GlobalPoolRounds.InvalidEntryPrice.selector);
        rounds.openRound(ROUND_ID, CLOSES_AT, 0, FEE_PER_ENTRY, MIN_PARTICIPANTS, MIN_POOL, split, RULES_HASH);
        vm.stopPrank();
    }

    function test_OpenRound_RevertsOnInvalidPrizeSplit() public {
        vm.startPrank(operator);
        // empty
        vm.expectRevert(GlobalPoolRounds.InvalidPrizeSplit.selector);
        rounds.openRound(
            ROUND_ID, CLOSES_AT, ENTRY_PRICE, FEE_PER_ENTRY, MIN_PARTICIPANTS, MIN_POOL, new uint16[](0), RULES_HASH
        );
        // sum != 10_000
        uint16[] memory split = _demoSplit();
        split[12] = 199;
        vm.expectRevert(GlobalPoolRounds.InvalidPrizeSplit.selector);
        rounds.openRound(ROUND_ID, CLOSES_AT, ENTRY_PRICE, FEE_PER_ENTRY, MIN_PARTICIPANTS, MIN_POOL, split, RULES_HASH);
        // zero rank
        split = new uint16[](2);
        split[0] = 10_000;
        vm.expectRevert(GlobalPoolRounds.InvalidPrizeSplit.selector);
        rounds.openRound(ROUND_ID, CLOSES_AT, ENTRY_PRICE, FEE_PER_ENTRY, MIN_PARTICIPANTS, MIN_POOL, split, RULES_HASH);
        // more than MAX_PRIZES
        split = new uint16[](101);
        for (uint256 i; i < 100; ++i) {
            split[i] = 99;
        }
        split[100] = 100;
        vm.expectRevert(GlobalPoolRounds.InvalidPrizeSplit.selector);
        rounds.openRound(ROUND_ID, CLOSES_AT, ENTRY_PRICE, FEE_PER_ENTRY, MIN_PARTICIPANTS, MIN_POOL, split, RULES_HASH);
        vm.stopPrank();
    }

    // -----------------------------------------------------------------------------------------------------------------
    // commitEntries
    // -----------------------------------------------------------------------------------------------------------------

    function test_Commit_RevertsBeforeClose() public {
        _open(ROUND_ID);
        vm.warp(CLOSES_AT - 1);
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.RoundNotClosed.selector, ROUND_ID, CLOSES_AT));
        rounds.commitEntries(ROUND_ID, ENTRIES_ROOT, TOTAL_ENTRIES, TOTAL_PARTICIPANTS, POOL);
    }

    function test_Commit_RevertsWhenCommittedTwice() public {
        _openAndCommitDemo();
        vm.prank(operator);
        vm.expectRevert(
            abi.encodeWithSelector(
                GlobalPoolRounds.InvalidStatus.selector, ROUND_ID, GlobalPoolRounds.RoundStatus.Committed
            )
        );
        rounds.commitEntries(ROUND_ID, keccak256("another root"), TOTAL_ENTRIES, TOTAL_PARTICIPANTS, POOL);
        assertEq(rounds.getRound(ROUND_ID).entriesRoot, ENTRIES_ROOT);
    }

    function test_Commit_RevertsForUnknownRound() public {
        vm.warp(CLOSES_AT);
        vm.prank(operator);
        vm.expectRevert(
            abi.encodeWithSelector(GlobalPoolRounds.InvalidStatus.selector, 7, GlobalPoolRounds.RoundStatus.None)
        );
        rounds.commitEntries(7, ENTRIES_ROOT, TOTAL_ENTRIES, TOTAL_PARTICIPANTS, POOL);
    }

    function test_Commit_RevertsOnPoolMismatch() public {
        _open(ROUND_ID);
        vm.warp(CLOSES_AT);
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.PoolMismatch.selector, POOL, POOL + 1));
        rounds.commitEntries(ROUND_ID, ENTRIES_ROOT, TOTAL_ENTRIES, TOTAL_PARTICIPANTS, POOL + 1);
    }

    function test_Commit_RevertsOnInconsistentTotals() public {
        _open(ROUND_ID);
        vm.warp(CLOSES_AT);
        vm.startPrank(operator);
        // more participants than entries
        vm.expectRevert(GlobalPoolRounds.InconsistentEntries.selector);
        rounds.commitEntries(ROUND_ID, ENTRIES_ROOT, 10, 11, 10 * ENTRY_PRICE);
        // entries without participants
        vm.expectRevert(GlobalPoolRounds.InconsistentEntries.selector);
        rounds.commitEntries(ROUND_ID, ENTRIES_ROOT, 10, 0, 10 * ENTRY_PRICE);
        // entries without a root
        vm.expectRevert(GlobalPoolRounds.InconsistentEntries.selector);
        rounds.commitEntries(ROUND_ID, bytes32(0), 10, 5, 10 * ENTRY_PRICE);
        // root without entries
        vm.expectRevert(GlobalPoolRounds.InconsistentEntries.selector);
        rounds.commitEntries(ROUND_ID, ENTRIES_ROOT, 0, 0, 0);
        vm.stopPrank();
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Thresholds & cancellation
    // -----------------------------------------------------------------------------------------------------------------

    function test_Thresholds_TooFewParticipants_AnyoneCanCancel() public {
        _open(ROUND_ID);
        vm.warp(CLOSES_AT);
        vm.expectEmit(true, false, false, true, address(rounds));
        emit GlobalPoolRounds.EntriesCommitted(ROUND_ID, ENTRIES_ROOT, TOTAL_ENTRIES, 499, POOL, PLATFORM_FEES, false);
        _commit(ROUND_ID, ENTRIES_ROOT, TOTAL_ENTRIES, 499);
        assertFalse(rounds.thresholdsMet(ROUND_ID));

        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.ThresholdsNotMet.selector, ROUND_ID));
        rounds.requestDraw(ROUND_ID);

        uint16 reason = rounds.REASON_THRESHOLDS_NOT_MET();
        vm.expectEmit(true, true, false, true, address(rounds));
        emit GlobalPoolRounds.RoundCancelled(ROUND_ID, reason, GlobalPoolRounds.RoundStatus.Committed, stranger);
        vm.prank(stranger);
        rounds.cancelRound(ROUND_ID, reason);

        GlobalPoolRounds.Round memory r = rounds.getRound(ROUND_ID);
        assertEq(uint8(r.status), uint8(GlobalPoolRounds.RoundStatus.Cancelled));
        assertEq(r.cancelReason, reason);
        assertEq(r.cancelledAt, CLOSES_AT);
        // committed entries stay verifiable for refunds
        assertEq(r.entriesRoot, ENTRIES_ROOT);

        vm.expectRevert(
            abi.encodeWithSelector(
                GlobalPoolRounds.InvalidStatus.selector, ROUND_ID, GlobalPoolRounds.RoundStatus.Cancelled
            )
        );
        rounds.requestDraw(ROUND_ID);
    }

    function test_Thresholds_PoolBelowMinimum() public {
        _open(ROUND_ID);
        _commit(ROUND_ID, ENTRIES_ROOT, 4999, 600); // 49,990.00 < 50,000.00
        assertFalse(rounds.thresholdsMet(ROUND_ID));
        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.ThresholdsNotMet.selector, ROUND_ID));
        rounds.requestDraw(ROUND_ID);
        rounds.cancelRound(ROUND_ID, rounds.REASON_THRESHOLDS_NOT_MET());
    }

    function test_Thresholds_FewerEntriesThanPrizes() public {
        vm.prank(operator);
        rounds.openRound(ROUND_ID, CLOSES_AT, ENTRY_PRICE, 0, 0, 0, _demoSplit(), RULES_HASH);
        _commit(ROUND_ID, ENTRIES_ROOT, 12, 12);
        assertFalse(rounds.thresholdsMet(ROUND_ID));
        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.ThresholdsNotMet.selector, ROUND_ID));
        rounds.requestDraw(ROUND_ID);
    }

    function test_Thresholds_ExactlyAtMinimumDraws() public {
        _open(ROUND_ID);
        _commit(ROUND_ID, ENTRIES_ROOT, 5000, MIN_PARTICIPANTS); // pool exactly 50,000.00
        assertTrue(rounds.thresholdsMet(ROUND_ID));
        rounds.requestDraw(ROUND_ID);
    }

    function test_Thresholds_ZeroEntriesCancels() public {
        _open(ROUND_ID);
        _commit(ROUND_ID, bytes32(0), 0, 0);
        assertFalse(rounds.thresholdsMet(ROUND_ID));
        rounds.cancelRound(ROUND_ID, rounds.REASON_THRESHOLDS_NOT_MET());
        assertEq(uint8(_status(ROUND_ID)), uint8(GlobalPoolRounds.RoundStatus.Cancelled));
    }

    function test_Cancel_CommittedRoundMeetingThresholdsCannotBeCancelled() public {
        _openAndCommitDemo();
        uint16 thresholds = rounds.REASON_THRESHOLDS_NOT_MET();
        uint16 operational = rounds.REASON_OPERATIONAL();
        vm.startPrank(operator);
        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.ThresholdsMet.selector, ROUND_ID));
        rounds.cancelRound(ROUND_ID, thresholds);
        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.ThresholdsMet.selector, ROUND_ID));
        rounds.cancelRound(ROUND_ID, operational);
        vm.stopPrank();
    }

    function test_Cancel_FailedRoundRequiresThresholdReason() public {
        _open(ROUND_ID);
        _commit(ROUND_ID, ENTRIES_ROOT, TOTAL_ENTRIES, 10);
        uint16 operational = rounds.REASON_OPERATIONAL();
        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.InvalidReasonCode.selector, operational));
        rounds.cancelRound(ROUND_ID, operational);
    }

    function test_Cancel_OpenRoundOnlyByOperatorWithOperationalReason() public {
        _open(ROUND_ID);
        uint16 compliance = rounds.REASON_COMPLIANCE();
        uint16 thresholds = rounds.REASON_THRESHOLDS_NOT_MET();
        bytes32 operatorRole = rounds.OPERATOR_ROLE();

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, operatorRole)
        );
        rounds.cancelRound(ROUND_ID, compliance);

        vm.startPrank(operator);
        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.InvalidReasonCode.selector, thresholds));
        rounds.cancelRound(ROUND_ID, thresholds);
        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.InvalidReasonCode.selector, uint16(0)));
        rounds.cancelRound(ROUND_ID, 0);
        rounds.cancelRound(ROUND_ID, compliance);
        vm.stopPrank();
        assertEq(rounds.getRound(ROUND_ID).cancelReason, compliance);
    }

    function test_Cancel_ImpossibleOnceDrawRequestedOrFulfilled() public {
        _toDrawRequested();
        uint16 operational = rounds.REASON_OPERATIONAL();
        uint16 thresholds = rounds.REASON_THRESHOLDS_NOT_MET();
        vm.startPrank(operator);
        vm.expectRevert(
            abi.encodeWithSelector(
                GlobalPoolRounds.InvalidStatus.selector, ROUND_ID, GlobalPoolRounds.RoundStatus.DrawRequested
            )
        );
        rounds.cancelRound(ROUND_ID, operational);
        vm.stopPrank();

        _fulfil(1);
        vm.prank(operator);
        vm.expectRevert(
            abi.encodeWithSelector(
                GlobalPoolRounds.InvalidStatus.selector, ROUND_ID, GlobalPoolRounds.RoundStatus.Fulfilled
            )
        );
        rounds.cancelRound(ROUND_ID, thresholds);
    }

    // -----------------------------------------------------------------------------------------------------------------
    // requestDraw / re-request / fulfilment
    // -----------------------------------------------------------------------------------------------------------------

    function test_RequestDraw_RevertsBeforeCommit() public {
        _open(ROUND_ID);
        vm.expectRevert(
            abi.encodeWithSelector(GlobalPoolRounds.InvalidStatus.selector, ROUND_ID, GlobalPoolRounds.RoundStatus.Open)
        );
        rounds.requestDraw(ROUND_ID);
    }

    function test_RequestDraw_CannotRequestTwice() public {
        _toDrawRequested();
        uint256 retryAt = uint256(CLOSES_AT) + rounds.DRAW_REQUEST_TIMEOUT();
        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.DrawRequestPending.selector, ROUND_ID, retryAt));
        rounds.requestDraw(ROUND_ID);
        vm.warp(retryAt - 1);
        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.DrawRequestPending.selector, ROUND_ID, retryAt));
        rounds.requestDraw(ROUND_ID);
    }

    function test_ReRequest_AfterTimeout_FirstFulfilmentWins() public {
        uint256 first = _toDrawRequested();
        vm.warp(uint256(CLOSES_AT) + rounds.DRAW_REQUEST_TIMEOUT());
        vm.expectEmit(true, true, false, true, address(rounds));
        emit GlobalPoolRounds.DrawRequested(
            ROUND_ID,
            first + 1,
            2,
            KEY_HASH,
            subId,
            REQUEST_CONFIRMATIONS,
            CALLBACK_GAS_LIMIT,
            ENTRIES_ROOT,
            TOTAL_ENTRIES
        );
        uint256 second = rounds.requestDraw(ROUND_ID);
        assertEq(second, first + 1);

        GlobalPoolRounds.Round memory r = rounds.getRound(ROUND_ID);
        assertEq(r.drawAttempts, 2);
        assertEq(r.lastRequestId, second);
        assertEq(r.entriesRoot, ENTRIES_ROOT); // same committed entries
        assertEq(r.totalEntries, TOTAL_ENTRIES);

        // The late original request is still valid and fulfils first ...
        _fulfilWith(first, 111);
        assertEq(rounds.getRound(ROUND_ID).randomWord, 111);
        assertEq(rounds.getRound(ROUND_ID).fulfilledRequestId, first);
        uint256[] memory winners = rounds.computeWinners(ROUND_ID);

        // ... and the re-request's fulfilment is ignored: no re-roll.
        vm.expectEmit(true, true, false, true, address(rounds));
        emit GlobalPoolRounds.FulfillmentIgnored(ROUND_ID, second);
        _fulfilWith(second, 222);
        assertEq(rounds.getRound(ROUND_ID).randomWord, 111);
        assertEq(rounds.computeWinners(ROUND_ID), winners);
    }

    function test_ReRequest_NewRequestMayFulfilFirst() public {
        uint256 first = _toDrawRequested();
        vm.warp(uint256(CLOSES_AT) + 2 days);
        uint256 second = rounds.requestDraw(ROUND_ID);
        _fulfilWith(second, 333);
        _fulfilWith(first, 444);
        GlobalPoolRounds.Round memory r = rounds.getRound(ROUND_ID);
        assertEq(r.randomWord, 333);
        assertEq(r.fulfilledRequestId, second);
    }

    function test_ReRequest_ImpossibleAfterFulfilment() public {
        _toFulfilled();
        uint256 word = rounds.getRound(ROUND_ID).randomWord;
        vm.warp(uint256(CLOSES_AT) + 30 days);
        vm.expectRevert(
            abi.encodeWithSelector(
                GlobalPoolRounds.InvalidStatus.selector, ROUND_ID, GlobalPoolRounds.RoundStatus.Fulfilled
            )
        );
        rounds.requestDraw(ROUND_ID);
        assertEq(rounds.getRound(ROUND_ID).randomWord, word);
    }

    function test_Fulfil_UnknownRequestIsIgnored() public {
        vm.expectEmit(true, true, false, true, address(rounds));
        emit GlobalPoolRounds.FulfillmentIgnored(0, 999);
        uint256[] memory words = new uint256[](1);
        words[0] = 1;
        vm.prank(address(coordinator));
        rounds.rawFulfillRandomWords(999, words);
    }

    function test_Fulfil_EmptyWordsIgnored() public {
        uint256 requestId = _toDrawRequested();
        vm.prank(address(coordinator));
        rounds.rawFulfillRandomWords(requestId, new uint256[](0));
        assertEq(uint8(_status(ROUND_ID)), uint8(GlobalPoolRounds.RoundStatus.DrawRequested));
    }

    function test_Fulfil_OnlyCoordinator() public {
        uint256 requestId = _toDrawRequested();
        uint256[] memory words = new uint256[](1);
        words[0] = 42;
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                VRFConsumerBaseV2Plus.OnlyCoordinatorCanFulfill.selector, stranger, address(coordinator)
            )
        );
        rounds.rawFulfillRandomWords(requestId, words);
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                VRFConsumerBaseV2Plus.OnlyCoordinatorCanFulfill.selector, admin, address(coordinator)
            )
        );
        rounds.rawFulfillRandomWords(requestId, words);
    }

    function test_Fulfil_CallbackGasWellBelowMinimumLimit() public {
        uint256 requestId = _toDrawRequested();
        uint256[] memory words = new uint256[](1);
        words[0] = type(uint256).max;
        vm.prank(address(coordinator));
        uint256 before = gasleft();
        rounds.rawFulfillRandomWords(requestId, words);
        uint256 used = before - gasleft();
        console.log("fulfillRandomWords gas", used);
        assertLt(used * 3, uint256(rounds.MIN_CALLBACK_GAS_LIMIT()) * 2); // >= 1.5x headroom
    }

    function test_Fulfil_SucceedsAtMinimumCallbackGasLimit() public {
        GlobalPoolRounds.VrfConfig memory cfg = _vrfConfig();
        cfg.callbackGasLimit = rounds.MIN_CALLBACK_GAS_LIMIT();
        vm.prank(admin);
        rounds.setVrfConfig(cfg);
        uint256 requestId = _toDrawRequested();
        _fulfil(requestId); // the mock forwards exactly callbackGasLimit and swallows failures
        assertEq(uint8(_status(ROUND_ID)), uint8(GlobalPoolRounds.RoundStatus.Fulfilled));
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Coordinator lock (no admin path to inject randomness)
    // -----------------------------------------------------------------------------------------------------------------

    function test_Lock_RequiredBeforeDraws() public {
        GlobalPoolRounds unlocked = _deploy();
        coordinator.addConsumer(subId, address(unlocked));
        assertFalse(unlocked.coordinatorLocked());
        vm.prank(operator);
        unlocked.openRound(
            ROUND_ID, CLOSES_AT, ENTRY_PRICE, FEE_PER_ENTRY, MIN_PARTICIPANTS, MIN_POOL, _demoSplit(), RULES_HASH
        );
        vm.warp(CLOSES_AT);
        vm.prank(operator);
        unlocked.commitEntries(ROUND_ID, ENTRIES_ROOT, TOTAL_ENTRIES, TOTAL_PARTICIPANTS, POOL);
        vm.expectRevert(GlobalPoolRounds.CoordinatorNotLocked.selector);
        unlocked.requestDraw(ROUND_ID);

        vm.prank(stranger); // permissionless
        unlocked.lockCoordinator();
        assertTrue(unlocked.coordinatorLocked());
        assertEq(unlocked.owner(), address(unlocked));
        unlocked.requestDraw(ROUND_ID);

        vm.expectRevert(bytes("Must be proposed owner"));
        unlocked.lockCoordinator();
    }

    function test_Lock_NobodyCanRedirectCoordinator() public {
        assertTrue(rounds.coordinatorLocked());
        address fake = makeAddr("fakeCoordinator");
        address[3] memory callers = [address(this), admin, operator];
        for (uint256 i; i < callers.length; ++i) {
            vm.prank(callers[i]);
            vm.expectRevert(
                abi.encodeWithSelector(
                    VRFConsumerBaseV2Plus.OnlyOwnerOrCoordinator.selector,
                    callers[i],
                    address(rounds),
                    address(coordinator)
                )
            );
            rounds.setCoordinator(fake);
        }
        // Ownership cannot be handed back to anyone.
        vm.prank(admin);
        vm.expectRevert(bytes("Only callable by owner"));
        rounds.transferOwnership(admin);
    }

    function test_Lock_MigratedCoordinatorCannotInjectWords() public {
        uint256 requestId = _toDrawRequested();
        address migrated = makeAddr("migratedCoordinator");
        vm.prank(address(coordinator)); // only Chainlink's coordinator can still migrate the consumer
        rounds.setCoordinator(migrated);
        assertFalse(rounds.coordinatorPinned());

        uint256[] memory words = new uint256[](1);
        words[0] = 7;
        vm.prank(migrated);
        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.UntrustedCoordinator.selector, migrated));
        rounds.rawFulfillRandomWords(requestId, words);

        vm.warp(uint256(CLOSES_AT) + 1 days);
        vm.expectRevert(
            abi.encodeWithSelector(GlobalPoolRounds.CoordinatorMismatch.selector, migrated, address(coordinator))
        );
        rounds.requestDraw(ROUND_ID);
        assertEq(uint8(_status(ROUND_ID)), uint8(GlobalPoolRounds.RoundStatus.DrawRequested));
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Winners
    // -----------------------------------------------------------------------------------------------------------------

    function test_Winners_RevertBeforeFulfilment() public {
        _toDrawRequested();
        vm.expectRevert(
            abi.encodeWithSelector(
                GlobalPoolRounds.InvalidStatus.selector, ROUND_ID, GlobalPoolRounds.RoundStatus.DrawRequested
            )
        );
        rounds.computeWinners(ROUND_ID);
    }

    function test_Winners_DeterministicDistinctInRange() public {
        uint256 requestId = _toDrawRequested();
        _fulfilWith(requestId, 0xC0FFEE);
        uint256[] memory a = rounds.computeWinners(ROUND_ID);
        uint256[] memory b = rounds.computeWinners(ROUND_ID);
        assertEq(a, b);
        assertEq(a, rounds.deriveWinners(ROUND_ID, 0xC0FFEE, TOTAL_ENTRIES, PRIZES));
        _assertDistinctInRange(a, TOTAL_ENTRIES);
        // Same word, different round id → different derivation (domain-bound to the round).
        assertTrue(
            keccak256(abi.encode(a))
                != keccak256(abi.encode(rounds.deriveWinners(ROUND_ID + 1, 0xC0FFEE, TOTAL_ENTRIES, PRIZES)))
        );
    }

    function test_Winners_ExactlyAsManyEntriesAsPrizes() public {
        vm.prank(operator);
        rounds.openRound(ROUND_ID, CLOSES_AT, ENTRY_PRICE, 0, 0, 0, _demoSplit(), RULES_HASH);
        _commit(ROUND_ID, ENTRIES_ROOT, 13, 13);
        uint256 requestId = rounds.requestDraw(ROUND_ID);
        _fulfil(requestId);
        uint256[] memory w = rounds.computeWinners(ROUND_ID);
        _assertDistinctInRange(w, 13);
        uint256 sum;
        for (uint256 i; i < w.length; ++i) {
            sum += w[i];
        }
        assertEq(sum, 78); // a permutation of 0..12
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Settlement
    // -----------------------------------------------------------------------------------------------------------------

    function test_Settlement_OnlyAfterFulfilment() public {
        _openAndCommitDemo();
        vm.prank(settler);
        vm.expectRevert(
            abi.encodeWithSelector(
                GlobalPoolRounds.InvalidStatus.selector, ROUND_ID, GlobalPoolRounds.RoundStatus.Committed
            )
        );
        rounds.recordSettlement(ROUND_ID, PAYOUTS_ROOT, POOL);

        uint256 requestId = rounds.requestDraw(ROUND_ID);
        vm.prank(settler);
        vm.expectRevert(
            abi.encodeWithSelector(
                GlobalPoolRounds.InvalidStatus.selector, ROUND_ID, GlobalPoolRounds.RoundStatus.DrawRequested
            )
        );
        rounds.recordSettlement(ROUND_ID, PAYOUTS_ROOT, POOL);

        _fulfil(requestId);
        vm.prank(settler);
        rounds.recordSettlement(ROUND_ID, PAYOUTS_ROOT, POOL);
    }

    function test_Settlement_ValidatesRootAndTotalAndIsFinal() public {
        _toFulfilled();
        vm.startPrank(settler);
        vm.expectRevert(GlobalPoolRounds.InvalidPayoutsRoot.selector);
        rounds.recordSettlement(ROUND_ID, bytes32(0), POOL);
        vm.expectRevert(abi.encodeWithSelector(GlobalPoolRounds.TotalPaidMismatch.selector, POOL, POOL - 1));
        rounds.recordSettlement(ROUND_ID, PAYOUTS_ROOT, POOL - 1);
        rounds.recordSettlement(ROUND_ID, PAYOUTS_ROOT, POOL);
        vm.expectRevert(
            abi.encodeWithSelector(
                GlobalPoolRounds.InvalidStatus.selector, ROUND_ID, GlobalPoolRounds.RoundStatus.Settled
            )
        );
        rounds.recordSettlement(ROUND_ID, keccak256("override attempt"), POOL);
        vm.stopPrank();
        assertEq(rounds.getRound(ROUND_ID).payoutsRoot, PAYOUTS_ROOT);
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Roles
    // -----------------------------------------------------------------------------------------------------------------

    function test_Roles_OperatorOnlyForOpenAndCommit() public {
        uint16[] memory split = _demoSplit();
        bytes32 role = rounds.OPERATOR_ROLE();
        address[3] memory others = [stranger, settler, admin];
        for (uint256 i; i < others.length; ++i) {
            vm.prank(others[i]);
            vm.expectRevert(
                abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, others[i], role)
            );
            rounds.openRound(
                ROUND_ID, CLOSES_AT, ENTRY_PRICE, FEE_PER_ENTRY, MIN_PARTICIPANTS, MIN_POOL, split, RULES_HASH
            );
        }
        _open(ROUND_ID);
        vm.warp(CLOSES_AT);
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, role)
        );
        rounds.commitEntries(ROUND_ID, ENTRIES_ROOT, TOTAL_ENTRIES, TOTAL_PARTICIPANTS, POOL);
    }

    function test_Roles_SettlerOnlyForSettlement() public {
        _toFulfilled();
        bytes32 role = rounds.SETTLER_ROLE();
        address[3] memory others = [stranger, operator, admin];
        for (uint256 i; i < others.length; ++i) {
            vm.prank(others[i]);
            vm.expectRevert(
                abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, others[i], role)
            );
            rounds.recordSettlement(ROUND_ID, PAYOUTS_ROOT, POOL);
        }
    }

    function test_Roles_AdminOnlyForVrfConfigAndUnpause() public {
        GlobalPoolRounds.VrfConfig memory cfg = _vrfConfig();
        bytes32 adminRole = rounds.DEFAULT_ADMIN_ROLE();
        vm.prank(operator);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, operator, adminRole)
        );
        rounds.setVrfConfig(cfg);

        bytes32 pauserRole = rounds.PAUSER_ROLE();
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, pauserRole)
        );
        rounds.pause();

        vm.prank(pauser);
        rounds.pause();
        vm.prank(pauser);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, pauser, adminRole)
        );
        rounds.unpause();
        vm.prank(admin);
        rounds.unpause();
        assertFalse(rounds.paused());
    }

    function test_Roles_AdminCanRotateOperator() public {
        address newOperator = makeAddr("newOperator");
        bytes32 role = rounds.OPERATOR_ROLE();
        vm.startPrank(admin);
        rounds.grantRole(role, newOperator);
        rounds.revokeRole(role, operator);
        vm.stopPrank();
        vm.prank(newOperator);
        rounds.openRound(
            ROUND_ID, CLOSES_AT, ENTRY_PRICE, FEE_PER_ENTRY, MIN_PARTICIPANTS, MIN_POOL, _demoSplit(), RULES_HASH
        );
        vm.prank(operator);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, operator, role)
        );
        rounds.openRound(
            ROUND_ID + 1, CLOSES_AT, ENTRY_PRICE, FEE_PER_ENTRY, MIN_PARTICIPANTS, MIN_POOL, _demoSplit(), RULES_HASH
        );
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Pause (circuit breaker)
    // -----------------------------------------------------------------------------------------------------------------

    function test_Pause_BlocksOpeningAndCommitting() public {
        _open(ROUND_ID);
        vm.prank(pauser);
        rounds.pause();

        vm.prank(operator);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        rounds.openRound(
            ROUND_ID + 1, CLOSES_AT, ENTRY_PRICE, FEE_PER_ENTRY, MIN_PARTICIPANTS, MIN_POOL, _demoSplit(), RULES_HASH
        );
        vm.warp(CLOSES_AT);
        vm.prank(operator);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        rounds.commitEntries(ROUND_ID, ENTRIES_ROOT, TOTAL_ENTRIES, TOTAL_PARTICIPANTS, POOL);

        vm.prank(admin);
        rounds.unpause();
        _commit(ROUND_ID, ENTRIES_ROOT, TOTAL_ENTRIES, TOTAL_PARTICIPANTS);
    }

    function test_Pause_DoesNotBlockDrawFulfilmentOrSettlement() public {
        _openAndCommitDemo();
        vm.prank(pauser);
        rounds.pause();
        uint256 requestId = rounds.requestDraw(ROUND_ID);
        _fulfil(requestId);
        uint256[] memory winners = rounds.computeWinners(ROUND_ID);
        vm.prank(settler);
        rounds.recordSettlement(ROUND_ID, PAYOUTS_ROOT, POOL);
        assertEq(uint8(_status(ROUND_ID)), uint8(GlobalPoolRounds.RoundStatus.Settled));
        assertEq(rounds.computeWinners(ROUND_ID), winners);
    }

    function test_Pause_DoesNotAlterFulfilledDraw() public {
        _toFulfilled();
        GlobalPoolRounds.Round memory beforePause = rounds.getRound(ROUND_ID);
        uint256[] memory winners = rounds.computeWinners(ROUND_ID);
        vm.prank(pauser);
        rounds.pause();
        vm.prank(admin);
        rounds.unpause();
        GlobalPoolRounds.Round memory afterPause = rounds.getRound(ROUND_ID);
        assertEq(afterPause.randomWord, beforePause.randomWord);
        assertEq(uint8(afterPause.status), uint8(GlobalPoolRounds.RoundStatus.Fulfilled));
        assertEq(rounds.computeWinners(ROUND_ID), winners);
    }

    function test_Pause_FailedRoundCanStillBeCancelled() public {
        _open(ROUND_ID);
        _commit(ROUND_ID, ENTRIES_ROOT, TOTAL_ENTRIES, 10);
        vm.prank(pauser);
        rounds.pause();
        rounds.cancelRound(ROUND_ID, rounds.REASON_THRESHOLDS_NOT_MET());
        assertEq(uint8(_status(ROUND_ID)), uint8(GlobalPoolRounds.RoundStatus.Cancelled));
    }

    // -----------------------------------------------------------------------------------------------------------------
    // VRF configuration & construction
    // -----------------------------------------------------------------------------------------------------------------

    function test_VrfConfig_BoundsEnforced() public {
        GlobalPoolRounds.VrfConfig memory cfg;
        vm.startPrank(admin);

        cfg = _vrfConfig();
        cfg.callbackGasLimit = rounds.MIN_CALLBACK_GAS_LIMIT() - 1;
        vm.expectRevert(GlobalPoolRounds.InvalidVrfConfig.selector);
        rounds.setVrfConfig(cfg);

        cfg = _vrfConfig();
        cfg.callbackGasLimit = rounds.MAX_CALLBACK_GAS_LIMIT() + 1;
        vm.expectRevert(GlobalPoolRounds.InvalidVrfConfig.selector);
        rounds.setVrfConfig(cfg);

        cfg = _vrfConfig();
        cfg.requestConfirmations = 0;
        vm.expectRevert(GlobalPoolRounds.InvalidVrfConfig.selector);
        rounds.setVrfConfig(cfg);

        cfg = _vrfConfig();
        cfg.requestConfirmations = rounds.MAX_REQUEST_CONFIRMATIONS() + 1;
        vm.expectRevert(GlobalPoolRounds.InvalidVrfConfig.selector);
        rounds.setVrfConfig(cfg);

        cfg = _vrfConfig();
        cfg.keyHash = bytes32(0);
        vm.expectRevert(GlobalPoolRounds.InvalidVrfConfig.selector);
        rounds.setVrfConfig(cfg);

        cfg = _vrfConfig();
        cfg.subscriptionId = 0;
        vm.expectRevert(GlobalPoolRounds.InvalidVrfConfig.selector);
        rounds.setVrfConfig(cfg);
        vm.stopPrank();
    }

    function test_VrfConfig_UpdateAppliesToNextRequestOnly() public {
        GlobalPoolRounds.VrfConfig memory cfg = _vrfConfig();
        cfg.callbackGasLimit = 300_000;
        cfg.requestConfirmations = 5;
        vm.expectEmit(false, false, false, true, address(rounds));
        emit GlobalPoolRounds.VrfConfigUpdated(KEY_HASH, subId, 300_000, 5);
        vm.prank(admin);
        rounds.setVrfConfig(cfg);
        GlobalPoolRounds.VrfConfig memory stored = rounds.vrfConfig();
        assertEq(stored.callbackGasLimit, 300_000);
        assertEq(stored.requestConfirmations, 5);

        _openAndCommitDemo();
        vm.expectEmit(true, true, false, true, address(rounds));
        emit GlobalPoolRounds.DrawRequested(ROUND_ID, 1, 1, KEY_HASH, subId, 5, 300_000, ENTRIES_ROOT, TOTAL_ENTRIES);
        rounds.requestDraw(ROUND_ID);
    }

    function test_Constructor_RejectsZeroAddressesAndBadConfig() public {
        GlobalPoolRounds.VrfConfig memory cfg = _vrfConfig();
        vm.expectRevert(VRFConsumerBaseV2Plus.ZeroAddress.selector);
        new GlobalPoolRounds(address(coordinator), cfg, address(0), operator, settler, pauser);
        vm.expectRevert(VRFConsumerBaseV2Plus.ZeroAddress.selector);
        new GlobalPoolRounds(address(coordinator), cfg, admin, address(0), settler, pauser);
        vm.expectRevert(VRFConsumerBaseV2Plus.ZeroAddress.selector);
        new GlobalPoolRounds(address(coordinator), cfg, admin, operator, address(0), pauser);
        vm.expectRevert(VRFConsumerBaseV2Plus.ZeroAddress.selector);
        new GlobalPoolRounds(address(coordinator), cfg, admin, operator, settler, address(0));
        vm.expectRevert(VRFConsumerBaseV2Plus.ZeroAddress.selector);
        new GlobalPoolRounds(address(0), cfg, admin, operator, settler, pauser);
        cfg.subscriptionId = 0;
        vm.expectRevert(GlobalPoolRounds.InvalidVrfConfig.selector);
        new GlobalPoolRounds(address(coordinator), cfg, admin, operator, settler, pauser);
    }

    function test_Constructor_GrantsRolesAndPinsCoordinator() public view {
        assertTrue(rounds.hasRole(rounds.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(rounds.hasRole(rounds.OPERATOR_ROLE(), operator));
        assertTrue(rounds.hasRole(rounds.SETTLER_ROLE(), settler));
        assertTrue(rounds.hasRole(rounds.PAUSER_ROLE(), pauser));
        assertFalse(rounds.hasRole(rounds.DEFAULT_ADMIN_ROLE(), address(this)));
        assertEq(rounds.vrfCoordinator(), address(coordinator));
        assertTrue(rounds.coordinatorPinned());
        assertEq(rounds.ACCOUNTING_DECIMALS(), 6);
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Views on non-existent / early rounds
    // -----------------------------------------------------------------------------------------------------------------

    function test_Views_EarlyRounds() public {
        assertEq(uint8(_status(ROUND_ID)), uint8(GlobalPoolRounds.RoundStatus.None));
        assertFalse(rounds.thresholdsMet(ROUND_ID));
        assertFalse(rounds.verifyEntry(ROUND_ID, 0, bytes32(0), bytes32(0), new bytes32[](0)));
        _open(ROUND_ID);
        vm.expectRevert(
            abi.encodeWithSelector(GlobalPoolRounds.InvalidStatus.selector, ROUND_ID, GlobalPoolRounds.RoundStatus.Open)
        );
        rounds.prizeAmounts(ROUND_ID);
        assertFalse(rounds.verifyPayout(ROUND_ID, 0, bytes32(0), bytes32(0), 0, new bytes32[](0)));
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------------------------------------------------

    function _assertDistinctInRange(uint256[] memory w, uint256 n) internal pure {
        for (uint256 i; i < w.length; ++i) {
            assertLt(w[i], n);
            for (uint256 j = i + 1; j < w.length; ++j) {
                assertTrue(w[i] != w[j], "duplicate winner");
            }
        }
    }
}
