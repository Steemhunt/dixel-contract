// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DixelAirdrop is Ownable {
    IERC20 public baseToken;

    uint256 public genesisBlock;
    bool public closed;

    struct WhiteListParams {
        address wallet;
        uint80 dixelAmount; // Max 1M
    }

    struct Claim {
        bool claimed;
        uint80 dixelAmount; // Max 1M
    }

    mapping(address => Claim) public userClaims;

    event ClaimAirdrop(address indexed user, uint256 amount);

    // solhint-disable-next-line func-visibility
    constructor(address baseTokenAddress, uint256 _genesisBlock) {
        baseToken = IERC20(baseTokenAddress);
        genesisBlock = _genesisBlock;
    }

    function closeAirdrop() external onlyOwner {
        closed = true;
        uint256 balance = baseToken.balanceOf(address(this));

        // Withdraw all leftover balance
        require(baseToken.transfer(msg.sender, balance), "TOKEN_TRANSFER_FAILED");
    }

    function whitelist(WhiteListParams[] calldata params) external onlyOwner {
        for (uint256 i = 0; i < params.length; i++) {
            require(userClaims[params[i].wallet].dixelAmount == 0, "DUPLICATED_RECORD");

            userClaims[params[i].wallet].dixelAmount = params[i].dixelAmount;
        }
    }

    // MARK: - User accessible methods

    function isWhiteList(address wallet) external view returns (bool) {
        return userClaims[wallet].dixelAmount > 0;
    }

    function airdropAmount(address wallet) external view returns (uint80) {
        return userClaims[wallet].dixelAmount;
    }

    function hasClaimed(address wallet) external view returns (bool) {
        return userClaims[wallet].claimed;
    }

    function claimableAmount(address wallet) public view returns (uint80) {
        if (block.number < genesisBlock || closed || userClaims[wallet].claimed) {
            return 0;
        }

        return userClaims[wallet].dixelAmount;
    }


    function claim() external {
        require(block.number >= genesisBlock, "AIRDROP_NOT_STARTED_YET");
        require(!closed, 'AIRDROP_ALREADY_CLOSED');

        uint80 amount = claimableAmount(msg.sender);

        require(amount > 0, 'NOTHING_TO_CLAIM');

        userClaims[msg.sender].claimed = true;
        require(baseToken.transfer(msg.sender, amount), "TOKEN_TRANSFER_FAILED");

        emit ClaimAirdrop(msg.sender, amount);
    }
}
