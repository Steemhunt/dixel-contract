// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./lib/Base64.sol";
import "./lib/ColorUtils.sol";

/**
 * @dev DixelArt NFT token, including:
 *
 *  - ability for holders to burn (destroy) their tokens
 *  - a owner (Dixel contract) that allows for token minting (creation)
 *  - token ID and URI autogeneration
 */
contract DixelArt is
    Context,
    ERC721Enumerable,
    ERC721Burnable,
    Ownable
{
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdTracker;

    uint24[32][32][] pixelHistory;

    constructor() ERC721("Dixel Collection", "DXART") {}

    function getPixelsFor(uint256 tokenId) public view returns (uint24[32][32] memory) {
        return pixelHistory[tokenId];
    }

    function generateJSON(uint256 tokenId) public view returns (string memory json) {
        // json = string(abi.encodePacked(
        //     '{"name": "Dixel Collection #',
        //     ColorUtils.uint2str(tokenId),
        //     '",',
        //     ColorUtils.uint2str(y * 40),
        //     '" fill="#',
        //     ColorUtils.uint2hex(pixels[x][y].color),
        //     '"/>'
        // ));

        // TODO:
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        return string(abi.encodePacked('data:application/json;base64,', Base64.encode(bytes(generateJSON(tokenId)))));
    }

    function mint(address to, uint24[32][32] memory pixelColors) public onlyOwner {
        // We cannot just use balanceOf to create the new tokenId because tokens
        // can be burned (destroyed), so we need a separate counter.
        uint256 tokenId = _tokenIdTracker.current();
        _mint(to, tokenId);
        pixelHistory.push(pixelColors);
        _tokenIdTracker.increment();
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }
}