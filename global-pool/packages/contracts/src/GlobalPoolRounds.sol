// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DrawMath} from "./libraries/DrawMath.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title GlobalPoolRounds — verifiable, immutable draws for GLOBAL POOL rounds (hybrid custody, DEMO / testnet only)
/// @notice Under hybrid custody player funds, entries and payouts live in the platform's off-chain double-entry ledger.
///         This contract holds NO funds. It is the public, append-only record that makes every draw verifiable:
///         1. `openRound` publishes the round's rules (price, fee, thresholds, prize split, rules document hash).
///         2. After the close time, `commitEntries` freezes the Merkle root of the canonical entry list and the totals.
///         3. Thresholds are evaluated on-chain from the committed numbers: if met anyone may `requestDraw` (Chainlink
///            VRF v2.5), otherwise anyone may `cancelRound` with reason THRESHOLDS_NOT_MET (refunds happen off-chain).
///         4. `fulfillRandomWords` stores the single VRF word; `computeWinners` derives the distinct winning indices.
///         5. `recordSettlement` records the Merkle root of the payouts credited off-chain (must total the pool).
///         There is deliberately NO function that sets or overrides a random word, a winner, an entry list after
///         commitment or a settlement; pausing only stops new rounds and new commitments.
/// @dev    All amounts are accounting values in USDT base units (6 decimals, `ACCOUNTING_DECIMALS`); no token moves.
///         The VRF coordinator is pinned at deployment (`vrfCoordinator()`); see `setCoordinator` notes below.
contract GlobalPoolRounds is VRFConsumerBaseV2Plus, AccessControl, Pausable {
    // ---------------------------------------------------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------------------------------------------------

    /// @notice Lifecycle of a round. Transitions are one-way:
    ///         None → Open → Committed → DrawRequested → Fulfilled → Settled, or Open/Committed → Cancelled.
    enum RoundStatus {
        None,
        Open,
        Committed,
        DrawRequested,
        Fulfilled,
        Settled,
        Cancelled
    }

    /// @notice Full on-chain record of a round (returned by {getRound}).
    /// @dev    Field order is chosen for storage packing: slot 0 holds everything the VRF callback writes except the
    ///         word and request id (status + fulfilledAt), keeping the callback cheap.
    struct Round {
        RoundStatus status;
        uint16 cancelReason;
        uint32 drawAttempts;
        uint64 openedAt;
        uint64 closesAt;
        uint64 fulfilledAt;
        uint64 committedAt;
        uint64 lastRequestAt;
        uint64 settledAt;
        uint64 cancelledAt;
        uint128 entryPrice;
        uint128 feePerEntry;
        uint128 minPool;
        uint128 poolAmount;
        uint64 minParticipants;
        uint64 totalEntries;
        uint64 totalParticipants;
        uint128 totalPaid;
        bytes32 rulesHash;
        bytes32 entriesRoot;
        bytes32 payoutsRoot;
        uint256 lastRequestId;
        uint256 fulfilledRequestId;
        uint256 randomWord;
        uint16[] prizeSplitBps;
    }

    /// @notice Chainlink VRF v2.5 request parameters (subscription billing in LINK, `nativePayment = false`).
    struct VrfConfig {
        bytes32 keyHash;
        uint256 subscriptionId;
        uint32 callbackGasLimit;
        uint16 requestConfirmations;
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Constants & immutables
    // ---------------------------------------------------------------------------------------------------------------

    /// @notice Role that opens rounds, commits entry lists and may cancel a round that is still Open.
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    /// @notice Role that records the payouts Merkle root after a draw is fulfilled.
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");
    /// @notice Role that may trigger the circuit breaker (pause). Unpausing requires DEFAULT_ADMIN_ROLE.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Decimals of every amount stored here (USDT base units). Informational: the contract holds no tokens.
    uint8 public constant ACCOUNTING_DECIMALS = 6;
    /// @notice Basis-point denominator for prize splits.
    uint16 public constant BPS_DENOMINATOR = 10_000;
    /// @notice Upper bound on prizes per round (bounds winner derivation gas).
    uint256 public constant MAX_PRIZES = 100;
    /// @notice Minimum wait before an UNFULFILLED VRF request may be re-requested (same committed entries).
    uint256 public constant DRAW_REQUEST_TIMEOUT = 24 hours;
    /// @notice Number of VRF words requested per draw.
    uint32 public constant NUM_WORDS = 1;
    /// @notice Lower bound for the VRF callback gas limit (keeps the callback from running out of gas; see README).
    uint32 public constant MIN_CALLBACK_GAS_LIMIT = 150_000;
    /// @notice Upper bound for the VRF callback gas limit (Arbitrum Sepolia coordinator max is 2,500,000).
    uint32 public constant MAX_CALLBACK_GAS_LIMIT = 2_500_000;
    /// @notice Lower bound for VRF request confirmations.
    uint16 public constant MIN_REQUEST_CONFIRMATIONS = 1;
    /// @notice Upper bound for VRF request confirmations (coordinator MAX_REQUEST_CONFIRMATIONS).
    uint16 public constant MAX_REQUEST_CONFIRMATIONS = 200;

    /// @notice Cancel reason: committed totals do not meet the round thresholds (only valid once committed).
    uint16 public constant REASON_THRESHOLDS_NOT_MET = 1;
    /// @notice Cancel reason: operational incident before commitment.
    uint16 public constant REASON_OPERATIONAL = 2;
    /// @notice Cancel reason: compliance / regulatory instruction before commitment.
    uint16 public constant REASON_COMPLIANCE = 3;
    /// @notice Cancel reason: other, documented off-chain (audit log) before commitment.
    uint16 public constant REASON_OTHER = 4;

    /// @notice The VRF coordinator fixed at deployment. Requests go only here and only its callbacks are accepted.
    IVRFCoordinatorV2Plus private immutable i_coordinator;

    // ---------------------------------------------------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------------------------------------------------

    mapping(uint256 roundId => Round) private _rounds;
    mapping(uint256 requestId => uint256 roundId) private _requestToRound;
    VrfConfig private _vrfConfig;

    // ---------------------------------------------------------------------------------------------------------------
    // Events (carry everything an off-chain verifier needs)
    // ---------------------------------------------------------------------------------------------------------------

    /// @notice A round was opened with immutable rules.
    event RoundOpened(
        uint256 indexed roundId,
        uint64 openedAt,
        uint64 closesAt,
        uint128 entryPrice,
        uint128 feePerEntry,
        uint64 minParticipants,
        uint128 minPool,
        uint16[] prizeSplitBps,
        bytes32 rulesHash
    );

    /// @notice The canonical entry list of a closed round was frozen.
    /// @param platformFees `totalEntries * feePerEntry` — fees go to the platform fee ledger, never into the pool.
    event EntriesCommitted(
        uint256 indexed roundId,
        bytes32 entriesMerkleRoot,
        uint64 totalEntries,
        uint64 totalParticipants,
        uint128 poolAmount,
        uint256 platformFees,
        bool thresholdsMet
    );

    /// @notice A round was cancelled; refunds are handled by the off-chain ledger.
    event RoundCancelled(
        uint256 indexed roundId, uint16 indexed reasonCode, RoundStatus previousStatus, address cancelledBy
    );

    /// @notice Randomness was requested from Chainlink VRF v2.5 (attempt > 1 means a timed-out re-request).
    event DrawRequested(
        uint256 indexed roundId,
        uint256 indexed requestId,
        uint32 attempt,
        bytes32 keyHash,
        uint256 subscriptionId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit,
        bytes32 entriesMerkleRoot,
        uint64 totalEntries
    );

    /// @notice The VRF word for a round was stored; winners follow deterministically via {computeWinners}.
    event DrawFulfilled(uint256 indexed roundId, uint256 indexed requestId, uint256 randomWord);

    /// @notice A VRF callback was ignored (unknown request, or the round was already fulfilled by an earlier request).
    event FulfillmentIgnored(uint256 indexed roundId, uint256 indexed requestId);

    /// @notice Payouts credited off-chain were recorded for a fulfilled round.
    event RoundSettled(uint256 indexed roundId, bytes32 payoutsMerkleRoot, uint128 totalPaid, uint256[] winningIndices);

    /// @notice VRF request parameters were changed (affects future requests only).
    event VrfConfigUpdated(
        bytes32 keyHash, uint256 subscriptionId, uint32 callbackGasLimit, uint16 requestConfirmations
    );

    // ---------------------------------------------------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------------------------------------------------

    error InvalidRoundId();
    error RoundAlreadyExists(uint256 roundId);
    error InvalidCloseTime(uint64 closesAt);
    error InvalidEntryPrice();
    error InvalidPrizeSplit();
    error InvalidStatus(uint256 roundId, RoundStatus status);
    error RoundNotClosed(uint256 roundId, uint64 closesAt);
    error InconsistentEntries();
    error PoolMismatch(uint256 expected, uint256 actual);
    error ThresholdsNotMet(uint256 roundId);
    error ThresholdsMet(uint256 roundId);
    error InvalidReasonCode(uint16 reasonCode);
    error DrawRequestPending(uint256 roundId, uint256 retryAt);
    error CoordinatorMismatch(address current, address pinned);
    error CoordinatorNotLocked();
    error UntrustedCoordinator(address caller);
    error InvalidPayoutsRoot();
    error TotalPaidMismatch(uint256 expected, uint256 actual);
    error InvalidVrfConfig();
    error InvalidRank(uint256 rank, uint256 prizes);

    // ---------------------------------------------------------------------------------------------------------------
    // Construction & admin
    // ---------------------------------------------------------------------------------------------------------------

    /// @notice Deploys the round registry.
    /// @dev    The inherited Chainlink `ConfirmedOwner` owner can call `setCoordinator`, which is not virtual and so cannot
    ///         be overridden. An owner able to redirect the coordinator could make a pending fulfilment fail after its
    ///         output became public and then re-request (a re-roll). The constructor therefore offers ownership to the
    ///         contract itself and {lockCoordinator} accepts it, leaving no account able to call `setCoordinator`
    ///         except the coordinator (Chainlink migration). `requestDraw` refuses to run until the lock is in place,
    ///         and callbacks are accepted only from the coordinator pinned here.
    /// @param coordinator Chainlink VRF v2.5 coordinator (pinned forever).
    /// @param initialVrfConfig Initial VRF request parameters.
    /// @param admin       DEFAULT_ADMIN_ROLE holder (multisig): grants roles, unpauses, updates VRF config.
    /// @param operator    OPERATOR_ROLE holder (platform round service).
    /// @param settler     SETTLER_ROLE holder (platform settlement service).
    /// @param pauser      PAUSER_ROLE holder (on-call / incident response).
    constructor(
        address coordinator,
        VrfConfig memory initialVrfConfig,
        address admin,
        address operator,
        address settler,
        address pauser
    ) VRFConsumerBaseV2Plus(coordinator) {
        if (admin == address(0) || operator == address(0) || settler == address(0) || pauser == address(0)) {
            revert ZeroAddress();
        }
        i_coordinator = IVRFCoordinatorV2Plus(coordinator);
        _setVrfConfig(initialVrfConfig);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
        _grantRole(SETTLER_ROLE, settler);
        _grantRole(PAUSER_ROLE, pauser);
        transferOwnership(address(this));
    }

    /// @notice Makes this contract its own `ConfirmedOwner` owner, permanently removing every account's ability to
    ///         call the inherited `setCoordinator`. Permissionless; succeeds exactly once (afterwards it reverts with
    ///         "Must be proposed owner"). The deploy script calls it right after deployment; draws are blocked until then.
    function lockCoordinator() external {
        this.acceptOwnership();
    }

    /// @notice Updates the VRF request parameters used by FUTURE `requestDraw` calls. Pending and fulfilled draws are
    ///         unaffected. Bounds keep the callback from being starved of gas.
    /// @param newConfig New key hash, subscription id, callback gas limit and confirmations.
    function setVrfConfig(VrfConfig calldata newConfig) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setVrfConfig(newConfig);
    }

    /// @notice Circuit breaker: blocks `openRound` and `commitEntries`. Draw requests, VRF fulfilment, cancellation of
    ///         failed rounds and settlement recording keep working, and nothing recorded is altered.
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Lifts the circuit breaker.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Round lifecycle
    // ---------------------------------------------------------------------------------------------------------------

    /// @notice Opens a round and publishes its immutable rules.
    /// @param roundId         Platform round number (non-zero, unique), e.g. 1248.
    /// @param closesAt        Unix time after which entries can be committed (must be in the future).
    /// @param entryPrice      Price per entry in USDT base units (e.g. 10_000_000 = 10.00 USDT). Pool = entries × price.
    /// @param feePerEntry     Platform fee per qualifying entry in USDT base units (e.g. 50_000 = 0.05) — not pooled.
    /// @param minParticipants Minimum distinct participants for the round to draw.
    /// @param minPool         Minimum pool (USDT base units) for the round to draw.
    /// @param prizeSplitBps   Prize split per rank in basis points; each > 0, sum = 10_000, length 1..MAX_PRIZES.
    /// @param rulesHash       Hash of the published rules / terms document for this round.
    function openRound(
        uint256 roundId,
        uint64 closesAt,
        uint128 entryPrice,
        uint128 feePerEntry,
        uint64 minParticipants,
        uint128 minPool,
        uint16[] calldata prizeSplitBps,
        bytes32 rulesHash
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        if (roundId == 0) revert InvalidRoundId();
        Round storage r = _rounds[roundId];
        if (r.status != RoundStatus.None) revert RoundAlreadyExists(roundId);
        if (closesAt <= block.timestamp) revert InvalidCloseTime(closesAt);
        if (entryPrice == 0) revert InvalidEntryPrice();
        _validatePrizeSplit(prizeSplitBps);

        r.status = RoundStatus.Open;
        r.openedAt = _now();
        r.closesAt = closesAt;
        r.entryPrice = entryPrice;
        r.feePerEntry = feePerEntry;
        r.minParticipants = minParticipants;
        r.minPool = minPool;
        r.prizeSplitBps = prizeSplitBps;
        r.rulesHash = rulesHash;

        emit RoundOpened(
            roundId, _now(), closesAt, entryPrice, feePerEntry, minParticipants, minPool, prizeSplitBps, rulesHash
        );
    }

    /// @notice Freezes the canonical entry list of a closed round. Callable once, only after `closesAt`.
    /// @dev    Leaves are `keccak256(abi.encode(index, entryId, userCommitment))` for index 0..totalEntries-1 (see
    ///         {entryLeaf}); the full leaf list is published off-chain so anyone can rebuild the root. The pool must
    ///         equal `totalEntries × entryPrice` exactly.
    /// @param roundId           Round identifier.
    /// @param entriesMerkleRoot Root of the entries tree (zero iff there are no entries).
    /// @param totalEntries      Number of qualifying entries (the winner index space).
    /// @param totalParticipants Number of distinct participants (≤ totalEntries).
    /// @param poolAmount        Pool in USDT base units (= totalEntries × entryPrice; fees excluded).
    function commitEntries(
        uint256 roundId,
        bytes32 entriesMerkleRoot,
        uint64 totalEntries,
        uint64 totalParticipants,
        uint128 poolAmount
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        Round storage r = _rounds[roundId];
        if (r.status != RoundStatus.Open) revert InvalidStatus(roundId, r.status);
        if (block.timestamp < r.closesAt) revert RoundNotClosed(roundId, r.closesAt);
        if (totalParticipants > totalEntries) revert InconsistentEntries();
        if ((totalEntries == 0) != (totalParticipants == 0)) revert InconsistentEntries();
        if ((totalEntries == 0) != (entriesMerkleRoot == bytes32(0))) revert InconsistentEntries();
        uint256 expectedPool = uint256(totalEntries) * r.entryPrice;
        if (poolAmount != expectedPool) revert PoolMismatch(expectedPool, poolAmount);

        r.status = RoundStatus.Committed;
        r.committedAt = _now();
        r.entriesRoot = entriesMerkleRoot;
        r.totalEntries = totalEntries;
        r.totalParticipants = totalParticipants;
        r.poolAmount = poolAmount;

        emit EntriesCommitted(
            roundId,
            entriesMerkleRoot,
            totalEntries,
            totalParticipants,
            poolAmount,
            uint256(totalEntries) * r.feePerEntry,
            _thresholdsMet(r)
        );
    }

    /// @notice Cancels a round. Refunds are handled by the off-chain ledger.
    /// @dev    Two cases only, and never once a draw has been requested:
    ///         - `Open` round: OPERATOR_ROLE, reason OPERATIONAL / COMPLIANCE / OTHER (no randomness exists yet).
    ///         - `Committed` round whose committed totals fail the thresholds: ANYONE, reason THRESHOLDS_NOT_MET.
    ///         A committed round that meets its thresholds cannot be cancelled — it must be drawn.
    /// @param roundId    Round identifier.
    /// @param reasonCode One of the `REASON_*` constants.
    function cancelRound(uint256 roundId, uint16 reasonCode) external {
        Round storage r = _rounds[roundId];
        RoundStatus previous = r.status;
        if (previous == RoundStatus.Open) {
            _checkRole(OPERATOR_ROLE);
            if (reasonCode != REASON_OPERATIONAL && reasonCode != REASON_COMPLIANCE && reasonCode != REASON_OTHER) {
                revert InvalidReasonCode(reasonCode);
            }
        } else if (previous == RoundStatus.Committed) {
            if (_thresholdsMet(r)) revert ThresholdsMet(roundId);
            if (reasonCode != REASON_THRESHOLDS_NOT_MET) revert InvalidReasonCode(reasonCode);
        } else {
            revert InvalidStatus(roundId, previous);
        }

        r.status = RoundStatus.Cancelled;
        r.cancelReason = reasonCode;
        r.cancelledAt = _now();
        emit RoundCancelled(roundId, reasonCode, previous, msg.sender);
    }

    /// @notice Requests the round's randomness from Chainlink VRF v2.5. Permissionless: once entries are committed and
    ///         thresholds are met the draw is owed, so anyone (normally the platform keeper) may trigger it.
    /// @dev    One request per round. A re-request is allowed only while the round is still unfulfilled and at least
    ///         `DRAW_REQUEST_TIMEOUT` after the previous request; it reuses the same committed entries. Whichever
    ///         outstanding request for the round is fulfilled FIRST is final — a re-request never invalidates an
    ///         earlier request, and nothing can be re-rolled after fulfilment.
    /// @param roundId Round identifier.
    /// @return requestId The VRF request id.
    function requestDraw(uint256 roundId) external returns (uint256 requestId) {
        Round storage r = _rounds[roundId];
        if (r.status == RoundStatus.Committed) {
            if (!_thresholdsMet(r)) revert ThresholdsNotMet(roundId);
        } else if (r.status == RoundStatus.DrawRequested) {
            uint256 retryAt = uint256(r.lastRequestAt) + DRAW_REQUEST_TIMEOUT;
            if (block.timestamp < retryAt) revert DrawRequestPending(roundId, retryAt);
        } else {
            revert InvalidStatus(roundId, r.status);
        }
        if (owner() != address(this)) revert CoordinatorNotLocked();
        if (address(s_vrfCoordinator) != address(i_coordinator)) {
            revert CoordinatorMismatch(address(s_vrfCoordinator), address(i_coordinator));
        }

        VrfConfig memory cfg = _vrfConfig;
        uint32 attempt = r.drawAttempts + 1;
        r.status = RoundStatus.DrawRequested;
        r.drawAttempts = attempt;
        r.lastRequestAt = _now();

        requestId = i_coordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: cfg.keyHash,
                subId: cfg.subscriptionId,
                requestConfirmations: cfg.requestConfirmations,
                callbackGasLimit: cfg.callbackGasLimit,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
            })
        );
        r.lastRequestId = requestId;
        _requestToRound[requestId] = roundId;

        // The only external call is to the pinned Chainlink coordinator, and the request id it returns is part of the
        // event, so the event must follow the call.
        // forge-lint: disable-start(reentrancy-events)
        emit DrawRequested(
            roundId,
            requestId,
            attempt,
            cfg.keyHash,
            cfg.subscriptionId,
            cfg.requestConfirmations,
            cfg.callbackGasLimit,
            r.entriesRoot,
            r.totalEntries
        );
        // forge-lint: disable-end(reentrancy-events)
    }

    /// @notice VRF callback (via `rawFulfillRandomWords`): stores the round's random word. Kept minimal so it cannot
    ///         run out of gas; never reverts for unknown or late requests (they are ignored with an event).
    /// @dev    Only the pinned coordinator is accepted, even if the inherited `s_vrfCoordinator` was changed.
    /// @param requestId   The VRF request id.
    /// @param randomWords The random words (exactly `NUM_WORDS`; only the first is used).
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        if (msg.sender != address(i_coordinator)) revert UntrustedCoordinator(msg.sender);
        uint256 roundId = _requestToRound[requestId];
        Round storage r = _rounds[roundId];
        if (roundId == 0 || r.status != RoundStatus.DrawRequested || randomWords.length == 0) {
            emit FulfillmentIgnored(roundId, requestId);
            return;
        }
        r.status = RoundStatus.Fulfilled;
        r.randomWord = randomWords[0];
        r.fulfilledRequestId = requestId;
        r.fulfilledAt = _now();
        emit DrawFulfilled(roundId, requestId, randomWords[0]);
    }

    /// @notice Records the payouts credited by the off-chain ledger for a fulfilled round. Callable once.
    /// @dev    Payout leaves are `keccak256(abi.encode(roundId, rank, entryIndex, entryId, userCommitment, amount))`
    ///         (see {payoutLeaf}); `totalPaid` must equal the pool (prizes are 100% of the pool). Each leaf can be
    ///         checked against the on-chain winners and prize amounts with {verifyPayout}.
    /// @param roundId           Round identifier.
    /// @param payoutsMerkleRoot Root of the payouts tree (non-zero).
    /// @param totalPaid         Sum of credited prizes in USDT base units.
    function recordSettlement(uint256 roundId, bytes32 payoutsMerkleRoot, uint128 totalPaid)
        external
        onlyRole(SETTLER_ROLE)
    {
        Round storage r = _rounds[roundId];
        if (r.status != RoundStatus.Fulfilled) revert InvalidStatus(roundId, r.status);
        if (payoutsMerkleRoot == bytes32(0)) revert InvalidPayoutsRoot();
        if (totalPaid != r.poolAmount) revert TotalPaidMismatch(r.poolAmount, totalPaid);

        r.status = RoundStatus.Settled;
        r.payoutsRoot = payoutsMerkleRoot;
        r.totalPaid = totalPaid;
        r.settledAt = _now();

        emit RoundSettled(roundId, payoutsMerkleRoot, totalPaid, _winners(roundId, r));
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Views — results & verification
    // ---------------------------------------------------------------------------------------------------------------

    /// @notice Winning entry indices of a fulfilled (or settled) round, ordered by prize rank.
    /// @param roundId Round identifier.
    /// @return winners `prizeSplitBps.length` distinct indices in `[0, totalEntries)`.
    function computeWinners(uint256 roundId) external view returns (uint256[] memory winners) {
        Round storage r = _rounds[roundId];
        if (r.status != RoundStatus.Fulfilled && r.status != RoundStatus.Settled) {
            revert InvalidStatus(roundId, r.status);
        }
        return _winners(roundId, r);
    }

    /// @notice Prize amount per rank for a committed round (sums exactly to the pool; dust to 1st prize).
    /// @param roundId Round identifier.
    /// @return amounts Prize amounts in USDT base units.
    function prizeAmounts(uint256 roundId) public view returns (uint256[] memory amounts) {
        Round storage r = _rounds[roundId];
        if (r.status == RoundStatus.None || r.status == RoundStatus.Open) revert InvalidStatus(roundId, r.status);
        return DrawMath.splitPool(r.poolAmount, r.prizeSplitBps);
    }

    /// @notice Whether a committed round's totals meet its thresholds (participants, pool, entries ≥ prizes).
    /// @param roundId Round identifier.
    /// @return True if the committed numbers meet every threshold (false before commitment).
    function thresholdsMet(uint256 roundId) external view returns (bool) {
        Round storage r = _rounds[roundId];
        if (r.status == RoundStatus.None || r.status == RoundStatus.Open) return false;
        return _thresholdsMet(r);
    }

    /// @notice Checks that an entry is in the committed entries tree at `index`.
    /// @param roundId        Round identifier.
    /// @param index          Entry index.
    /// @param entryId        Entry identifier (bytes32).
    /// @param userCommitment Entry's user commitment.
    /// @param proof          Merkle proof (sorted-pair keccak256).
    /// @return True if the leaf is included and `index < totalEntries`.
    function verifyEntry(
        uint256 roundId,
        uint256 index,
        bytes32 entryId,
        bytes32 userCommitment,
        bytes32[] calldata proof
    ) public view returns (bool) {
        Round storage r = _rounds[roundId];
        if (r.entriesRoot == bytes32(0) || index >= r.totalEntries) return false;
        return MerkleProof.verifyCalldata(proof, r.entriesRoot, DrawMath.entryLeaf(index, entryId, userCommitment));
    }

    /// @notice Checks that `entryId`/`userCommitment` is the committed entry that won prize `rank`.
    /// @param roundId        Round identifier (must be fulfilled or settled).
    /// @param rank           Zero-based prize rank.
    /// @param entryId        Entry identifier (bytes32).
    /// @param userCommitment Entry's user commitment.
    /// @param proof          Merkle proof of the entry in the entries tree.
    /// @return True if the entry is committed at the index that won `rank`.
    function verifyWinningEntry(
        uint256 roundId,
        uint256 rank,
        bytes32 entryId,
        bytes32 userCommitment,
        bytes32[] calldata proof
    ) external view returns (bool) {
        uint256 entryIndex = _winnerAt(roundId, rank);
        return verifyEntry(roundId, entryIndex, entryId, userCommitment, proof);
    }

    /// @notice Checks a settled payout: leaf in the payouts tree, paid to the on-chain winner of `rank`, for exactly
    ///         the on-chain prize amount of `rank`.
    /// @param roundId        Round identifier (must be settled).
    /// @param rank           Zero-based prize rank.
    /// @param entryId        Winning entry identifier.
    /// @param userCommitment Winning entry's user commitment.
    /// @param amount         Credited amount in USDT base units.
    /// @param proof          Merkle proof of the payout leaf.
    /// @return True if the payout is consistent with the on-chain draw and recorded root.
    function verifyPayout(
        uint256 roundId,
        uint256 rank,
        bytes32 entryId,
        bytes32 userCommitment,
        uint256 amount,
        bytes32[] calldata proof
    ) external view returns (bool) {
        Round storage r = _rounds[roundId];
        if (r.status != RoundStatus.Settled) return false;
        uint256 entryIndex = _winnerAt(roundId, rank);
        if (amount != DrawMath.splitPool(r.poolAmount, r.prizeSplitBps)[rank]) return false;
        bytes32 leaf = DrawMath.payoutLeaf(roundId, rank, entryIndex, entryId, userCommitment, amount);
        return MerkleProof.verifyCalldata(proof, r.payoutsRoot, leaf);
    }

    /// @notice Pure winner derivation (same algorithm as {computeWinners}) for off-chain parity checks.
    /// @param roundId      Round identifier.
    /// @param randomWord   VRF word.
    /// @param totalEntries Index space size.
    /// @param count        Number of winners.
    /// @return Distinct winning indices ordered by rank.
    function deriveWinners(uint256 roundId, uint256 randomWord, uint256 totalEntries, uint256 count)
        external
        pure
        returns (uint256[] memory)
    {
        return DrawMath.deriveWinners(roundId, randomWord, totalEntries, count);
    }

    /// @notice Pure pool split (same as {prizeAmounts}).
    /// @param pool Pool amount.
    /// @param bps  Prize split in basis points.
    /// @return Prize amount per rank.
    function splitPool(uint256 pool, uint16[] calldata bps) external pure returns (uint256[] memory) {
        return DrawMath.splitPool(pool, bps);
    }

    /// @notice Entries-tree leaf encoding.
    /// @param index          Entry index.
    /// @param entryId        Entry identifier.
    /// @param userCommitment User commitment.
    /// @return The leaf hash.
    function entryLeaf(uint256 index, bytes32 entryId, bytes32 userCommitment) external pure returns (bytes32) {
        return DrawMath.entryLeaf(index, entryId, userCommitment);
    }

    /// @notice Payouts-tree leaf encoding.
    /// @param roundId        Round identifier.
    /// @param rank           Prize rank.
    /// @param entryIndex     Winning entry index.
    /// @param entryId        Entry identifier.
    /// @param userCommitment User commitment.
    /// @param amount         Credited amount.
    /// @return The leaf hash.
    function payoutLeaf(
        uint256 roundId,
        uint256 rank,
        uint256 entryIndex,
        bytes32 entryId,
        bytes32 userCommitment,
        uint256 amount
    ) external pure returns (bytes32) {
        return DrawMath.payoutLeaf(roundId, rank, entryIndex, entryId, userCommitment, amount);
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Views — state
    // ---------------------------------------------------------------------------------------------------------------

    /// @notice Full record of a round.
    /// @param roundId Round identifier.
    /// @return The round (status None if it does not exist).
    function getRound(uint256 roundId) external view returns (Round memory) {
        return _rounds[roundId];
    }

    /// @notice Status of a round.
    /// @param roundId Round identifier.
    /// @return The round status.
    function roundStatus(uint256 roundId) external view returns (RoundStatus) {
        return _rounds[roundId].status;
    }

    /// @notice Round a VRF request belongs to (0 if unknown).
    /// @param requestId VRF request id.
    /// @return The round identifier.
    function requestRound(uint256 requestId) external view returns (uint256) {
        return _requestToRound[requestId];
    }

    /// @notice Current VRF request parameters.
    /// @return The VRF configuration.
    function vrfConfig() external view returns (VrfConfig memory) {
        return _vrfConfig;
    }

    /// @notice The VRF coordinator pinned at deployment.
    /// @return The coordinator address.
    function vrfCoordinator() external view returns (address) {
        return address(i_coordinator);
    }

    /// @notice False if the inherited `s_vrfCoordinator` no longer equals the pinned coordinator (only possible through a
    ///         Chainlink-initiated migration once locked). Draws then stall — a new contract version must be deployed;
    ///         results cannot be affected. Monitored by the platform.
    /// @return True when `s_vrfCoordinator` equals the pinned coordinator.
    function coordinatorPinned() external view returns (bool) {
        return address(s_vrfCoordinator) == address(i_coordinator);
    }

    /// @notice True once {lockCoordinator} has run (this contract owns itself, so no account can redirect VRF).
    /// @return Whether the coordinator lock is in place.
    function coordinatorLocked() external view returns (bool) {
        return owner() == address(this);
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------------------------------------------------

    /// @dev Current block time as uint64 (cannot truncate before the year 292,277,026,596).
    function _now() private view returns (uint64) {
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint64(block.timestamp);
    }

    /// @dev Thresholds evaluated from committed numbers only.
    function _thresholdsMet(Round storage r) private view returns (bool) {
        return r.totalParticipants >= r.minParticipants && r.poolAmount >= r.minPool
            && r.totalEntries >= r.prizeSplitBps.length;
    }

    /// @dev Winners for a round whose random word is stored.
    function _winners(uint256 roundId, Round storage r) private view returns (uint256[] memory) {
        return DrawMath.deriveWinners(roundId, r.randomWord, r.totalEntries, r.prizeSplitBps.length);
    }

    /// @dev Winning index for `rank` of a fulfilled/settled round.
    function _winnerAt(uint256 roundId, uint256 rank) private view returns (uint256) {
        Round storage r = _rounds[roundId];
        if (r.status != RoundStatus.Fulfilled && r.status != RoundStatus.Settled) {
            revert InvalidStatus(roundId, r.status);
        }
        uint256 prizes = r.prizeSplitBps.length;
        if (rank >= prizes) revert InvalidRank(rank, prizes);
        return _winners(roundId, r)[rank];
    }

    /// @dev Validates a prize split: 1..MAX_PRIZES ranks, each > 0, summing to exactly 10_000 bps.
    function _validatePrizeSplit(uint16[] calldata bps) private pure {
        uint256 n = bps.length;
        if (n == 0 || n > MAX_PRIZES) revert InvalidPrizeSplit();
        uint256 sum;
        for (uint256 i; i < n; ++i) {
            if (bps[i] == 0) revert InvalidPrizeSplit();
            sum += bps[i];
        }
        if (sum != BPS_DENOMINATOR) revert InvalidPrizeSplit();
    }

    /// @dev Validates and stores VRF parameters.
    function _setVrfConfig(VrfConfig memory cfg) private {
        if (
            cfg.keyHash == bytes32(0) || cfg.subscriptionId == 0 || cfg.callbackGasLimit < MIN_CALLBACK_GAS_LIMIT
                || cfg.callbackGasLimit > MAX_CALLBACK_GAS_LIMIT || cfg.requestConfirmations < MIN_REQUEST_CONFIRMATIONS
                || cfg.requestConfirmations > MAX_REQUEST_CONFIRMATIONS
        ) revert InvalidVrfConfig();
        _vrfConfig = cfg;
        emit VrfConfigUpdated(cfg.keyHash, cfg.subscriptionId, cfg.callbackGasLimit, cfg.requestConfirmations);
    }
}
