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

        require(safeTransferFrom(baseToken, _msgSender(), address(this), amount), "TOKEN_TRANSFER_FAILED");

        if (airdropCategory == 1) {
            unchecked {
                total.nftTotalAmount += amount;
            }
        }

        if (airdropCategory == 2) {
            unchecked {
                total.mintClubTotalAmount += amount;
            }
        }
    }

    function startAirdrop() external onlyOwner {
        canClaim = true;

        require(baseToken.approve(address(this), 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff), "APPROVE_FAILED");
    }

    function closeAirdrop() external onlyOwner {
        canClaim = false;
        uint256 balance = baseToken.balanceOf(address(this));

        // Withdraw all leftover balance
        require(safeTransfer(baseToken, _msgSender(), balance), "TOKEN_TRANSFER_FAILED");
    }

    function whitelist(WhiteListParams[] calldata params) external onlyOwner {
        require(!canClaim, "CANNOT_ADD_WHITELIST_DURING_CLAIMING");

        for (uint256 i = 0; i < params.length; i++) {
            require(userContributions[params[i].wallet].nftContribution == 0, "DUPLICATED_RECORD");
            require(userContributions[params[i].wallet].mintClubContribution == 0, "DUPLICATED_RECORD");

            userContributions[params[i].wallet].nftContribution = params[i].nftContribution;
            userContributions[params[i].wallet].mintClubContribution = params[i].mintClubContribution;

            total.nftTotalContribution += params[i].nftContribution;
            total.mintClubTotalContribution += params[i].mintClubContribution;
            total.whiteListCount += 1;
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
        require(safeTransfer(baseToken, msgSender, amount), "TOKEN_TRANSFER_FAILED");

        emit ClaimAirdrop(msgSender, amount);
    }

    /// @notice Modified from Gnosis
    /// (https://github.com/gnosis/gp-v2-contracts/blob/main/src/contracts/libraries/GPv2SafeERC20.sol)
    function safeTransferFrom(
        IERC20 tokenAddr,
        address from,
        address to,
        uint256 amount
    ) internal returns (bool success) {
        assembly {
            let freePointer := mload(0x40)
            mstore(
                freePointer,
                0x23b872dd00000000000000000000000000000000000000000000000000000000
            )
            mstore(
                add(freePointer, 4),
                and(from, 0xffffffffffffffffffffffffffffffffffffffff)
            )
            mstore(
                add(freePointer, 36),
                and(to, 0xffffffffffffffffffffffffffffffffffffffff)
            )
            mstore(add(freePointer, 68), amount)

            let callStatus := call(gas(), tokenAddr, 0, freePointer, 100, 0, 0)

            let returnDataSize := returndatasize()
            if iszero(callStatus) {
                // Copy the revert message into memory.
                returndatacopy(0, 0, returnDataSize)

                // Revert with the same message.
                revert(0, returnDataSize)
            }
            switch returnDataSize
            case 32 {
                // Copy the return data into memory.
                returndatacopy(0, 0, returnDataSize)

                // Set success to whether it returned true.
                success := iszero(iszero(mload(0)))
            }
            case 0 {
                // There was no return data.
                success := 1
            }
            default {
                // It returned some malformed input.
                success := 0
            }
        }
    }

    function safeTransfer(
        IERC20 tokenAddr,
        address to,
        uint256 amount
    ) internal returns (bool success) {
        assembly {
            let freePointer := mload(0x40)
            mstore(
                freePointer,
                0xa9059cbb00000000000000000000000000000000000000000000000000000000
            )
            mstore(
                add(freePointer, 4),
                and(to, 0xffffffffffffffffffffffffffffffffffffffff)
            )
            mstore(add(freePointer, 36), amount)

            let callStatus := call(gas(), tokenAddr, 0, freePointer, 68, 0, 0)

            let returnDataSize := returndatasize()
            if iszero(callStatus) {
                // Copy the revert message into memory.
                returndatacopy(0, 0, returnDataSize)

                // Revert with the same message.
                revert(0, returnDataSize)
            }
            switch returnDataSize
            case 32 {
                // Copy the return data into memory.
                returndatacopy(0, 0, returnDataSize)

                // Set success to whether it returned true.
                success := iszero(iszero(mload(0)))
            }
            case 0 {
                // There was no return data.
                success := 1
            }
            default {
                // It returned some malformed input.
                success := 0
            }
        }
    }
}
