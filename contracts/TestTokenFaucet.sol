// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TestTokenFaucet {
    IERC20 public baseToken;

    address[] testers;
    mapping(address => bool) public testersClaimed;

    uint256 public constant AMOUNT = 5e20; // 500 TEST_DIXEL tokens

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

    function tokenBalance() external view returns (uint256) {
        return baseToken.balanceOf(address(this));
    }

    function claim() external {
        require(!hasClaimed(msg.sender), "ALREADY_CLAIMED");

        testers.push(msg.sender);
        testersClaimed[msg.sender] = true;
        require(baseToken.transfer(msg.sender, AMOUNT), "TOKEN_TRANSFER_FAILED");

        emit ClaimTestToken(msg.sender, AMOUNT);
    }
}
