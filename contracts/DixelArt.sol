// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
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
contract DixelArt is Context, ERC721, ERC721Enumerable, Ownable, DixelSVGGenerator {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdTracker;

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
    constructor(address baseTokenAddress) ERC721("Dixel Collection", "dART") {
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
        // We cannot just use balanceOf to create the new tokenId because tokens
        // can be burned (destroyed), so we need a separate counter.
        uint256 tokenId = _tokenIdTracker.current();
        _mint(to, tokenId);

        history.push(History(pixelColors, updatedPixelCount, reserveForRefund, false));

        _tokenIdTracker.increment();
    }

    function burn(uint256 tokenId) external {
        address msgSender = _msgSender();

        // Check if token has already been burned, distinguishing it from revert due to non existing tokenId
        require(history[tokenId].burned != true, "ERC721Burnable: token has already been burned");

        // This will also check `_exists(tokenId)`
        require(_isApprovedOrOwner(msgSender, tokenId), "ERC721Burnable: caller is not owner nor approved");

        _burn(tokenId);

        // Refund reserve amount
        history[tokenId].burned = true;
        assert(baseToken.transfer(msgSender, history[tokenId].reserveForRefund));

        emit Burn(msgSender, tokenId, history[tokenId].reserveForRefund);
    }

    // MARK: - External utility functions

    function nextTokenId() external view returns (uint256) {
        return _tokenIdTracker.current();
    }

    function exists(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }
}
