// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {GlobalPoolRounds} from "../src/GlobalPoolRounds.sol";
import {IVRFSubscriptionV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFSubscriptionV2Plus.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";
import {Script, console} from "forge-std/Script.sol";

/// @title Deploy — GlobalPoolRounds on Arbitrum Sepolia (421614) or a local Anvil node (31337). DEMO / testnet only.
/// @notice Reads every parameter from the environment (see `.env.example`). It never reads a private key: the signer is
///         chosen on the command line at broadcast time (`--account <keystore>` / `--ledger`), and nothing is broadcast
///         unless `--broadcast` is passed. Any other chain id (including every mainnet) is refused.
///
///         Simulate:  forge script script/Deploy.s.sol:Deploy --rpc-url arbitrum_sepolia
///         Broadcast: forge script script/Deploy.s.sol:Deploy --rpc-url arbitrum_sepolia --account gp-testnet-deployer \
///                      --broadcast --verify        (only after the README "verify before use" checklist)
contract Deploy is Script {
    uint256 internal constant ARBITRUM_SEPOLIA = 421_614;
    uint256 internal constant ANVIL = 31_337;

    /// @dev Values published in Chainlink's "VRF v2.5 Supported Networks" page for Arbitrum Sepolia (checked
    ///      28 Nov 2026 and on-chain via eth_call). VERIFY AGAIN BEFORE USE — see README.
    address internal constant ARB_SEPOLIA_VRF_COORDINATOR = 0x5CE8D5A2BC84beb22a398CCA51996F7930313D61;
    bytes32 internal constant ARB_SEPOLIA_KEY_HASH_50_GWEI =
        0x1770bdc7eec7771f7ba4ffd640f34260d7f095b79c92d34a5b2551d6f6cfd2be;

    error UnsupportedChain(uint256 chainId);
    error UnlistedVrfParameter(string name);
    error NoCoordinatorCode(address coordinator);

    /// @notice Deploys and locks the registry; optionally adds it as a consumer of the VRF subscription.
    /// @return rounds The deployed registry.
    function run() external returns (GlobalPoolRounds rounds) {
        if (block.chainid != ARBITRUM_SEPOLIA && block.chainid != ANVIL) revert UnsupportedChain(block.chainid);

        address admin = vm.envAddress("GP_ADMIN_ADDRESS");
        address operator = vm.envAddress("GP_OPERATOR_ADDRESS");
        address settler = vm.envAddress("GP_SETTLER_ADDRESS");
        address pauser = vm.envAddress("GP_PAUSER_ADDRESS");
        uint256 gasLimitRaw = vm.envOr("VRF_CALLBACK_GAS_LIMIT", uint256(250_000));
        uint256 confirmationsRaw = vm.envOr("VRF_REQUEST_CONFIRMATIONS", uint256(3));
        require(gasLimitRaw <= type(uint32).max, "VRF_CALLBACK_GAS_LIMIT too large");
        require(confirmationsRaw <= type(uint16).max, "VRF_REQUEST_CONFIRMATIONS too large");
        // forge-lint: disable-next-line(unsafe-typecast)
        uint32 callbackGasLimit = uint32(gasLimitRaw);
        // forge-lint: disable-next-line(unsafe-typecast)
        uint16 requestConfirmations = uint16(confirmationsRaw);

        vm.startBroadcast();

        address coordinator;
        bytes32 keyHash;
        uint256 subscriptionId;
        if (block.chainid == ANVIL && vm.envOr("VRF_COORDINATOR", address(0)) == address(0)) {
            // Local development: a funded VRF v2.5 mock subscription (fulfil manually via the mock).
            VRFCoordinatorV2_5Mock mock = new VRFCoordinatorV2_5Mock(0.1 ether, 1 gwei, 4e15);
            coordinator = address(mock);
            keyHash = ARB_SEPOLIA_KEY_HASH_50_GWEI;
            subscriptionId = mock.createSubscription();
            mock.fundSubscription(subscriptionId, 1000 ether);
        } else {
            coordinator = vm.envAddress("VRF_COORDINATOR");
            keyHash = vm.envBytes32("VRF_KEY_HASH");
            subscriptionId = vm.envUint("VRF_SUBSCRIPTION_ID");
            if (coordinator.code.length == 0) revert NoCoordinatorCode(coordinator);
            if (block.chainid == ARBITRUM_SEPOLIA && !vm.envOr("VRF_ALLOW_UNLISTED", false)) {
                if (coordinator != ARB_SEPOLIA_VRF_COORDINATOR) revert UnlistedVrfParameter("VRF_COORDINATOR");
                if (keyHash != ARB_SEPOLIA_KEY_HASH_50_GWEI) revert UnlistedVrfParameter("VRF_KEY_HASH");
            }
        }

        rounds = new GlobalPoolRounds(
            coordinator,
            GlobalPoolRounds.VrfConfig({
                keyHash: keyHash,
                subscriptionId: subscriptionId,
                callbackGasLimit: callbackGasLimit,
                requestConfirmations: requestConfirmations
            }),
            admin,
            operator,
            settler,
            pauser
        );
        rounds.lockCoordinator();

        // The broadcaster must own the subscription for this to succeed (true for the local mock).
        if (block.chainid == ANVIL || vm.envOr("VRF_ADD_CONSUMER", false)) {
            IVRFSubscriptionV2Plus(coordinator).addConsumer(subscriptionId, address(rounds));
        }

        vm.stopBroadcast();

        require(rounds.coordinatorLocked(), "coordinator not locked");
        require(rounds.coordinatorPinned(), "coordinator not pinned");
        console.log("chain id            ", block.chainid);
        console.log("GlobalPoolRounds    ", address(rounds));
        console.log("VRF coordinator     ", coordinator);
        console.log("VRF subscription id ", subscriptionId);
        console.log("callback gas limit  ", uint256(callbackGasLimit));
        console.log("request confirms    ", uint256(requestConfirmations));
        console.log("admin / operator    ", admin, operator);
        console.log("settler / pauser    ", settler, pauser);
    }
}
