// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DixelArt.sol";

/**
* @title DixelTip
*
* Crowd-sourced pixel art community
*/
contract DixelTip is Context {
    IERC20 public baseToken;
    DixelArt public dixelArt;

    struct TipCount {
        uint32 likeCount;
        uint96 tipAmount; // baseToken max supply = 1M
    }

    // tokenId -> TipCount
    mapping(uint256 => TipCount) public tips;

    event Tip(address indexed sender, uint256 indexed tokenId, uint96 tipAmount);
    event BurnAndRefundTips(address indexed player, uint256 indexed tokenId, uint96 tipAmount);

    constructor(address baseTokenAddress, address dixelArtAddress) {
        baseToken = IERC20(baseTokenAddress);
        dixelArt = DixelArt(dixelArtAddress);
    }

    function tip(uint256 tokenId, uint96 tipAmount) external {
        require(dixelArt.exists(tokenId), "CANNOT_TIP_ON_BURNED_TOKEN");

        address msgSender = _msgSender();
        unchecked {
            tips[tokenId].likeCount += 1;

            if (tipAmount > 0) {
                require(baseToken.transferFrom(msgSender, address(this), tipAmount), "TIP_TRANSFER_FAILED");
                tips[tokenId].tipAmount += tipAmount;
            }
        }

        emit Tip(msgSender, tokenId, tipAmount);
    }

    // NOTE: Should approve first - `dixelArt.approve(address(this), tokenId)`
    function burnAndRefundTips(uint256 tokenId) external {
        require(dixelArt.exists(tokenId), "TOKEN_HAS_ALREADY_BURNED");
        require(tips[tokenId].tipAmount > 0, "NO_TIPS_JUST_USE_BURN_FUNCTION");

        require(dixelArt.getApproved(tokenId) == address(this), "CONTRACT_IS_NOT_APPROVED");

        address msgSender = _msgSender();
        address owner = dixelArt.ownerOf(tokenId);

        // NOTE: `dixelArt.burn` will check approvals for `address(this)` (caller = this contract)
        // so we need to check token approvals of msgSender here to prevent users from burning someone else's NFT
        require(msgSender == owner || dixelArt.isApprovedForAll(owner, msgSender), "CALLER_IS_NOT_APPROVED");

        // keep this before burning for later use
        uint96 toRefund = totalBurnValue(tokenId);

        // NOTE: will refund tokens to this contract
        dixelArt.burn(tokenId);
        require(!dixelArt.exists(tokenId), "TOKEN_BURN_FAILED"); // double check

        // Let's keep the data for the reference,
        // and following the behavior that DixelArt.burn keeps `reserveForRefund` data
        // tips[tokenId].likeCount = 0;
        // tips[tokenId].tipAmount = 0;

        // Pay accumulated tips to the user in addition to "burn refund" amount
        require(baseToken.transfer(msgSender, toRefund), "TIP_REFUND_TRANSFER_FAILED");
    }

    // MARK: - Utility view functions

    function likeCount(uint256 tokenId) external view returns(uint32) {
        return tips[tokenId].likeCount;
    }

    function accumulatedTipAmount(uint256 tokenId) external view returns(uint96) {
        return tips[tokenId].tipAmount;
    }

    function totalBurnValue(uint256 tokenId) public view returns(uint96) {
        if (!dixelArt.exists(tokenId)) {
            return 0;
        }

        (, uint96 reserveForRefund,) = dixelArt.history(tokenId);

        return reserveForRefund + tips[tokenId].tipAmount;
    }
}
