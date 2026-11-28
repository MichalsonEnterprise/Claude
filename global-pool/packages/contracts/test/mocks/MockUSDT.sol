// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDT — TEST ONLY 6-decimal ERC-20 for local Anvil end-to-end tests (DEMO / testnet only, no value)
/// @notice Used by the API e2e suite to exercise the deposit watcher (Transfer logs) and the withdrawal broadcaster
///         against a local chain. Never deploy to a public network as "USDT": it has an unrestricted owner mint.
///         `setBlocked` lets a test make transfers to an address revert (exercises the withdrawal failure path).
contract MockUSDT is ERC20 {
    address public immutable owner;
    mapping(address account => bool) public blocked;

    error NotOwner();
    error RecipientBlocked(address to);

    constructor() ERC20("Mock Test USDT (DEMO)", "tUSDT") {
        owner = msg.sender;
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != owner) revert NotOwner();
        _mint(to, amount);
    }

    function setBlocked(address account, bool isBlocked) external {
        if (msg.sender != owner) revert NotOwner();
        blocked[account] = isBlocked;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (blocked[to]) revert RecipientBlocked(to);
        super._update(from, to, value);
    }
}
