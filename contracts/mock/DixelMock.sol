// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "../Dixel.sol";
import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol"; // Fot test

contract DixelMock is Dixel {
    bool public constant IS_MOCK = true; // Prevent the same bytecode produced by verifier

    // solhint-disable-next-line func-visibility, no-empty-blocks
    constructor(address baseTokenAddress, address dixelArtAddress) Dixel(baseTokenAddress, dixelArtAddress) {}

    function getAccRewardPerContribution() external view returns (uint256) {
        return accRewardPerContribution;
    }

    function updatePixelsOriginal(PixelParams[] calldata params, uint256 nextTokenId) external nonReentrant {
        require(params.length > 0 && params.length <= CANVAS_SIZE * CANVAS_SIZE, "INVALID_PIXEL_PARAMS");
        require(nextTokenId == dixelArt.nextTokenId(), "NFT_EDITION_NUMBER_MISMATCHED");

        address msgSender = _msgSender();
        Player storage player = _getOrAddPlayer(msgSender);

        uint256 totalPrice = 0;
        uint8 prevX = 0;
        uint8 prevY = 0;
        unchecked {
            for (uint256 i = 0; i < params.length; i++) {
                if (i > 0) { // should not check for the first parameter
                    require(prevX * CANVAS_SIZE + prevY < params[i].x * CANVAS_SIZE + params[i].y, "PARAMS_NOT_SORTED");
                }

                prevX = params[i].x;
                prevY = params[i].y;

                Pixel storage pixel = pixels[params[i].x][params[i].y];
                uint200 oldPrice = pixel.price;

                pixel.color = params[i].color;
                pixel.owner = player.id;
                totalPrice += oldPrice;

                pixel.price = uint200(oldPrice + oldPrice * PRICE_INCREASE_RATE / MAX_RATE);
                require(pixel.price > oldPrice, "MAX_PRICE_REACHED");
            }
        }

        uint16 updatedPixelCount = uint16(params.length);
        uint96 reserveForRefund = _updatePlayerReward(player, totalPrice, updatedPixelCount);

        // Mint NFT to the user
        dixelArt.mint(msgSender, getPixelColors(), updatedPixelCount, reserveForRefund, uint96(totalPrice));
    }

    function updatePixelsNoChecks(PixelParams[] calldata params, uint256 nextTokenId) external {
        require(params.length > 0 && params.length <= CANVAS_SIZE * CANVAS_SIZE, "INVALID_PIXEL_PARAMS");
        require(nextTokenId == dixelArt.nextTokenId(), "NFT_EDITION_NUMBER_MISMATCHED");

        address msgSender = _msgSender();
        Player storage player = _getOrAddPlayer(msgSender);

        uint256 totalPrice = 0;
        unchecked {
            for (uint256 i = 0; i < params.length; i++) {
                Pixel storage pixel = pixels[params[i].x][params[i].y];

                pixel.color = params[i].color;
                pixel.owner = player.id;
                totalPrice += pixel.price;

                pixel.price = uint200(pixel.price + pixel.price * PRICE_INCREASE_RATE / MAX_RATE);
            }
        }

        uint16 updatedPixelCount = uint16(params.length);
        uint96 reserveForRefund = _updatePlayerReward(player, totalPrice, updatedPixelCount);

        // Mint NFT to the user
        dixelArt.mint(msgSender, getPixelColors(), updatedPixelCount, reserveForRefund, uint96(totalPrice));
    }
}
