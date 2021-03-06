// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TestTokenFaucet {
    IERC20 public baseToken;

    address[] testers;
    mapping(address => bool) public testersClaimed;

    uint256 public constant AMOUNT = 2e20; // 200 TEST_DIXEL tokens

    event ClaimTestToken(address indexed user, uint256 amount);

    // solhint-disable-next-line func-visibility
    constructor(address baseTokenAddress) {
        baseToken = IERC20(baseTokenAddress);
    }

    function hasClaimed(address wallet) public view returns (bool) {
        return testersClaimed[wallet];
    }

    function testerCount() external view returns (uint256) {
        return testers.length;
    }

    function tokenBalance() public view returns (uint256) {
        return baseToken.balanceOf(address(this));
    }

    function claim() external {
        require(!hasClaimed(msg.sender), "TEST_TOKEN_ALREADY_CLAIMED");
        require(tokenBalance() >= AMOUNT, "NO_TEST_TOKENS_LEFT");

        testers.push(msg.sender);
        testersClaimed[msg.sender] = true;
        require(baseToken.transfer(msg.sender, AMOUNT), "TOKEN_TRANSFER_FAILED");

        emit ClaimTestToken(msg.sender, AMOUNT);
    }
}
