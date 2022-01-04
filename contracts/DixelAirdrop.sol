// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DixelAirdrop is Ownable, ReentrancyGuard {
    IERC20 public baseToken;

    bool public canClaim;

    struct WhiteListParams {
        address wallet;
        uint120 nftContribution;
        uint120 mintClubContribution;
    }

    struct Contribution {
        uint120 nftContribution; // category: 1
        uint120 mintClubContribution; // category: 2
        bool claimed;
    }

    struct Total {
        uint80 nftTotalAmount; // Max 1M
        uint80 mintClubTotalAmount;
        uint24 whiteListCount;
        uint128 nftTotalContribution;
        uint128 mintClubTotalContribution;
    }

    Total public total;
    mapping(address => Contribution) public userContributions;

    event ClaimAirdrop(address user, uint256 amount);

    constructor(address baseTokenAddress) {
        baseToken = IERC20(baseTokenAddress);
    }

    function addTokens(uint8 airdropCategory, uint80 amount) external onlyOwner {
        require(!canClaim, 'CANNOT_CHANGE_TOTAL_SHARE_DURING_CLAIMING');
        require(airdropCategory == 1 || airdropCategory == 2, 'INVALID_CATEGORY');

        if (airdropCategory == 1) {
            require(baseToken.transferFrom(_msgSender(), address(this), amount), 'TOKEN_TRANSFER_FAILED');
            total.nftTotalAmount += amount;
        }

        if (airdropCategory == 2) {
            require(baseToken.transferFrom(_msgSender(), address(this), amount), 'TOKEN_TRANSFER_FAILED');
            total.mintClubTotalAmount += amount;
        }
    }

    function startAirdrop() external onlyOwner {
        canClaim = true;
    }

    function closeAirdrop() external onlyOwner {
        canClaim = false;

        // Withdraw all leftover balance
        require(baseToken.transferFrom(address(this), _msgSender(), baseToken.balanceOf(address(this))), 'TOKEN_TRANSFER_FAILED');
    }

    function whitelist(WhiteListParams[] calldata params) external onlyOwner {
        require(!canClaim, 'CANNOT_ADD_WHITELIST_DURING_CLAIMING');

        for (uint256 i = 0; i < params.length; i++) {
            require(userContributions[params[i].wallet].nftContribution == 0, 'DUPLICATED_RECORD');
            require(userContributions[params[i].wallet].mintClubContribution == 0, 'DUPLICATED_RECORD');

            userContributions[params[i].wallet].nftContribution = params[i].nftContribution;
            userContributions[params[i].wallet].mintClubContribution = params[i].mintClubContribution;

            total.nftTotalContribution += params[i].nftContribution;
            total.mintClubTotalContribution += params[i].mintClubContribution;
            total.whiteListCount += 1;
        }
    }

    function isWhiteList() public view returns (bool) {
        Contribution memory c = userContributions[_msgSender()];

        return c.nftContribution > 0 || c.mintClubContribution > 0;
    }

    function airdropAmount() public view returns (uint256) {
        Contribution memory c = userContributions[_msgSender()];

        return total.nftTotalAmount * c.nftContribution / total.nftTotalContribution +
            total.mintClubTotalAmount * c.mintClubContribution / total.mintClubTotalContribution;
    }

    function hasClaimed() public view returns (bool) {
        return userContributions[_msgSender()].claimed;
    }

    function claim() external {
        require(canClaim, 'AIRDROP_HAS_NOT_STARTED_OR_FINISHED');
        require(isWhiteList(), 'NOT_INCLUDED_IN_THE_WHITE_LIST');
        require(!hasClaimed(), 'ALREADY_CLAIMED');

        // TODO: Refactor _msgSender() function to see if saving gas

        uint256 amount = airdropAmount();

        userContributions[_msgSender()].claimed = true;
        require(baseToken.transferFrom(address(this), _msgSender(), amount), 'TOKEN_TRANSFER_FAILED');

        emit ClaimAirdrop(_msgSender(), amount);
    }

}
