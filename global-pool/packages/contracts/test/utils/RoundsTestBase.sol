// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {GlobalPoolRounds} from "../../src/GlobalPoolRounds.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";
import {Test} from "forge-std/Test.sol";

/// @notice Shared setup: VRF v2.5 mock + funded subscription + a locked GlobalPoolRounds, and DEMO round #1,248
///         numbers from design/figma-build/demo-data.md (all DEMO values).
abstract contract RoundsTestBase is Test {
    uint256 internal constant ROUND_ID = 1248;
    uint64 internal constant OPENED_AT = 1_795_766_400; // 27 Nov 2026 08:00 UTC
    uint64 internal constant CLOSES_AT = 1_795_809_600; // 27 Nov 2026 20:00 UTC
    uint128 internal constant ENTRY_PRICE = 10_000_000; // 10.00 USDT
    uint128 internal constant FEE_PER_ENTRY = 50_000; // 0.05 USDT
    uint64 internal constant MIN_PARTICIPANTS = 500;
    uint128 internal constant MIN_POOL = 50_000_000_000; // 50,000.00 USDT
    uint64 internal constant TOTAL_ENTRIES = 18_640;
    uint64 internal constant TOTAL_PARTICIPANTS = 3412;
    uint128 internal constant POOL = 186_400_000_000; // 186,400.00 USDT
    uint256 internal constant PLATFORM_FEES = 932_000_000; // 932.00 USDT — never part of the pool
    uint256 internal constant PRIZES = 13;

    /// @dev Arbitrum Sepolia 50 gwei key hash (the mock ignores it; see README).
    bytes32 internal constant KEY_HASH = 0x1770bdc7eec7771f7ba4ffd640f34260d7f095b79c92d34a5b2551d6f6cfd2be;
    uint32 internal constant CALLBACK_GAS_LIMIT = 200_000;
    uint16 internal constant REQUEST_CONFIRMATIONS = 3;
    bytes32 internal constant RULES_HASH = keccak256("GLOBAL POOL round #1,248 rules v1 (DEMO)");
    bytes32 internal constant ENTRIES_ROOT = keccak256("DEMO entries root #1,248");
    bytes32 internal constant PAYOUTS_ROOT = keccak256("DEMO payouts root #1,248");

    address internal admin = makeAddr("admin");
    address internal operator = makeAddr("operator");
    address internal settler = makeAddr("settler");
    address internal pauser = makeAddr("pauser");
    address internal stranger = makeAddr("stranger");

    VRFCoordinatorV2_5Mock internal coordinator;
    GlobalPoolRounds internal rounds;
    uint256 internal subId;

    function setUp() public virtual {
        vm.warp(OPENED_AT);
        coordinator = new VRFCoordinatorV2_5Mock(0.1 ether, 1 gwei, 4e15);
        subId = coordinator.createSubscription();
        coordinator.fundSubscription(subId, 1000 ether);
        rounds = _deploy();
        rounds.lockCoordinator();
        coordinator.addConsumer(subId, address(rounds));
    }

    function _vrfConfig() internal view returns (GlobalPoolRounds.VrfConfig memory) {
        return GlobalPoolRounds.VrfConfig({
            keyHash: KEY_HASH,
            subscriptionId: subId,
            callbackGasLimit: CALLBACK_GAS_LIMIT,
            requestConfirmations: REQUEST_CONFIRMATIONS
        });
    }

    function _deploy() internal returns (GlobalPoolRounds) {
        return new GlobalPoolRounds(address(coordinator), _vrfConfig(), admin, operator, settler, pauser);
    }

    /// @dev 1st 50%, 2nd 20%, 3rd 10%, 10 × runner-up 2%.
    function _demoSplit() internal pure returns (uint16[] memory bps) {
        bps = new uint16[](PRIZES);
        bps[0] = 5000;
        bps[1] = 2000;
        bps[2] = 1000;
        for (uint256 i = 3; i < PRIZES; ++i) {
            bps[i] = 200;
        }
    }

    function _open(uint256 roundId) internal {
        vm.prank(operator);
        rounds.openRound(
            roundId, CLOSES_AT, ENTRY_PRICE, FEE_PER_ENTRY, MIN_PARTICIPANTS, MIN_POOL, _demoSplit(), RULES_HASH
        );
    }

    function _commit(uint256 roundId, bytes32 root, uint64 entries, uint64 participants) internal {
        if (block.timestamp < CLOSES_AT) vm.warp(CLOSES_AT);
        vm.prank(operator);
        rounds.commitEntries(roundId, root, entries, participants, uint128(entries) * ENTRY_PRICE);
    }

    /// @dev Opens and commits the demo round (thresholds met).
    function _openAndCommitDemo() internal {
        _open(ROUND_ID);
        _commit(ROUND_ID, ENTRIES_ROOT, TOTAL_ENTRIES, TOTAL_PARTICIPANTS);
    }

    /// @dev Opens, commits and requests the draw for the demo round.
    function _toDrawRequested() internal returns (uint256 requestId) {
        _openAndCommitDemo();
        requestId = rounds.requestDraw(ROUND_ID);
    }

    function _fulfil(uint256 requestId) internal {
        coordinator.fulfillRandomWords(requestId, address(rounds));
    }

    function _fulfilWith(uint256 requestId, uint256 word) internal {
        uint256[] memory words = new uint256[](1);
        words[0] = word;
        coordinator.fulfillRandomWordsWithOverride(requestId, address(rounds), words);
    }

    /// @dev Opens, commits, requests and fulfils (mock-derived word) the demo round.
    function _toFulfilled() internal returns (uint256 requestId) {
        requestId = _toDrawRequested();
        _fulfil(requestId);
    }

    function _status(uint256 roundId) internal view returns (GlobalPoolRounds.RoundStatus) {
        return rounds.roundStatus(roundId);
    }
}
