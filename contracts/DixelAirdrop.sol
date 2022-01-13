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
        uint224 nftContribution;
        uint224 mintClubContribution;
    }

    struct Contribution {
        bool claimed;
        uint224 nftContribution; // category: 1
        uint224 mintClubContribution; // category: 2
    }

    struct Total {
        uint24 whiteListCount;
        uint224 nftTotalAmount;
        uint224 mintClubTotalAmount;
        uint224 nftTotalContribution;
        uint224 mintClubTotalContribution;
    }

    Total public total;
    mapping(address => Contribution) public userContributions;

    event ClaimAirdrop(address user, uint256 amount);

    // solhint-disable-next-line func-visibility
    constructor(address baseTokenAddress) {
        baseToken = IERC20(baseTokenAddress);
    }

    function addTokens(uint8 airdropCategory, uint80 amount) external onlyOwner {
        require(!canClaim, "CANNOT_CHANGE_TOTAL_SHARE_DURING_CLAIMING");
        require(airdropCategory == 1 || airdropCategory == 2, "INVALID_CATEGORY");

        assert(baseToken.transferFrom(_msgSender(), address(this), amount));

        unchecked {
            if (airdropCategory == 1) {
                total.nftTotalAmount += amount;
            } else if (airdropCategory == 2) {
                total.mintClubTotalAmount += amount;
            }
        }
    }

    function startAirdrop() external onlyOwner {
        canClaim = true;
    }

    function closeAirdrop() external onlyOwner {
        canClaim = false;
        uint256 balance = baseToken.balanceOf(address(this));

        // Withdraw all leftover balance
        assert(baseToken.transfer(_msgSender(), balance));
    }

    function whitelist(WhiteListParams[] calldata params) external onlyOwner {
        require(!canClaim, "CANNOT_ADD_WHITELIST_DURING_CLAIMING");

        for (uint256 i = 0; i < params.length; i++) {
            require(userContributions[params[i].wallet].nftContribution == 0, "DUPLICATED_RECORD");
            require(userContributions[params[i].wallet].mintClubContribution == 0, "DUPLICATED_RECORD");

            userContributions[params[i].wallet].nftContribution = params[i].nftContribution;
            userContributions[params[i].wallet].mintClubContribution = params[i].mintClubContribution;

            unchecked {
                total.nftTotalContribution += params[i].nftContribution;
                total.mintClubTotalContribution += params[i].mintClubContribution;
                total.whiteListCount += 1;
            }
        }
    }

    // MARK: - User accessible methods

    function isWhiteList(address wallet) public view returns (bool) {
        Contribution memory c = userContributions[wallet];

        return c.nftContribution > 0 || c.mintClubContribution > 0;
    }

    function airdropAmount(address wallet) public view returns (uint256) {
        Contribution memory c = userContributions[wallet];

        unchecked {
            return
                (total.nftTotalAmount * c.nftContribution) / total.nftTotalContribution +
                (total.mintClubTotalAmount * c.mintClubContribution) / total.mintClubTotalContribution;
        }
    }

    function claimableAmount(address wallet) public view returns (uint256) {
        if (!canClaim || hasClaimed(wallet)) {
            return 0;
        }

        return airdropAmount(wallet);
    }

    function hasClaimed(address wallet) public view returns (bool) {
        return userContributions[wallet].claimed;
    }

    function claim() external {
        address msgSender = _msgSender();
        require(canClaim, "AIRDROP_HAS_NOT_STARTED_OR_FINISHED");
        require(isWhiteList(msgSender), "NOT_INCLUDED_IN_THE_WHITE_LIST");
        require(!hasClaimed(msgSender), "ALREADY_CLAIMED");

        uint256 amount = claimableAmount(msgSender);

        userContributions[msgSender].claimed = true;
        assert(baseToken.transfer(msgSender, amount));

        emit ClaimAirdrop(msgSender, amount);
    }
}
