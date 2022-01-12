// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import {Ownership, IERC173} from "@beandao/contracts/library/Ownership.sol";
import {ERC721, IERC721, IERC721Enumerable} from "@beandao/contracts/library/ERC721.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "base64-sol/base64.sol";
import "./lib/ColorUtils.sol";
import "./DixelSVGGenerator.sol";

/**
 * @dev DixelArt NFT token, including:
 *
 *  - ability for holders to burn (destroy) their tokens
 *  - a owner (Dixel contract) that allows for token minting (creation)
 *  - token ID and URI autogeneration
 */
contract DixelArt is Context, ERC721, Ownership, DixelSVGGenerator {
    IERC20 public baseToken;

    struct History {
        uint24[CANVAS_SIZE][CANVAS_SIZE] pixels;
        uint16 updatedPixelCount;
        uint96 reserveForRefund;
        bool burned;
    }
    History[] public history;

    event Burn(address player, uint256 tokenId, uint96 refundAmount);

    // solhint-disable-next-line func-visibility
    constructor(address baseTokenAddress) {
        name = "Dixel Collection";
        symbol = "dART";
        baseToken = IERC20(baseTokenAddress);
    }

    function getPixelsFor(uint256 tokenId) public view returns (uint24[CANVAS_SIZE][CANVAS_SIZE] memory) {
        return history[tokenId].pixels;
    }

    function generateSVG(uint256 tokenId) external view returns (string memory) {
        return _generateSVG(getPixelsFor(tokenId));
    }

    function generateBase64SVG(uint256 tokenId) public view returns (string memory) {
        return _generateBase64SVG(getPixelsFor(tokenId));
    }

    function generateJSON(uint256 tokenId) public view returns (string memory json) {
        // NOTE: We don't check token existence here,
        // so burnt tokens can also outputs this result unlike tokenURI function

        /* solhint-disable quotes */
        json = string(abi.encodePacked(
            '{"name":"Dixel Collection #',
            ColorUtils.uint2str(tokenId),
            '","description":"A single art canvas where users can overwrite price-compounded pixels to generate fully on-chain NFT via dixel.club',
            '","updated_pixel_count":"',
            ColorUtils.uint2str(history[tokenId].updatedPixelCount),
            '","reserve_for_refund":"',
            ColorUtils.uint2str(history[tokenId].reserveForRefund),
            '","image":"',
            generateBase64SVG(tokenId),
            '"}'
        ));
        /* solhint-enable quotes */
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
         require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

         return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(generateJSON(tokenId)))));
    }

    function mint(address to, uint24[CANVAS_SIZE][CANVAS_SIZE] memory pixelColors, uint16 updatedPixelCount, uint96 reserveForRefund) external onlyOwner {
        uint256 tokenId = _nextId();
        _mint(to, tokenId);

        history.push(History(pixelColors, updatedPixelCount, reserveForRefund, false));
    }

    function burn(uint256 tokenId) external {
        address msgSender = _msgSender();
        // This will also check `_exists(tokenId)`
        require(_isApprovedOrOwner(msgSender, tokenId), "ERC721Burnable: caller is not owner nor approved");

        _burn(tokenId);

        // Refund reserve amount
        history[tokenId].burned = true;
        require(safeTransfer(baseToken, msgSender, history[tokenId].reserveForRefund),"REFUND_FAILED");

        emit Burn(msgSender, tokenId, history[tokenId].reserveForRefund);
    }

    // MARK: - External utility functions

    function nextTokenId() external view returns (uint256) {
        return _nextId();
    }

    function exists(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Enumerable).interfaceId ||
            interfaceId == type(IERC173).interfaceId;
    }

    function safeTransfer(
        IERC20 tokenAddr,
        address to,
        uint256 amount
    ) internal returns (bool success) {
        bool callStatus;

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

            callStatus := call(gas(), tokenAddr, 0, freePointer, 68, 0, 0)

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
