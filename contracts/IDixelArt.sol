// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

interface IDixelArt {
  function approve (address to, uint256 tokenId) external;
  function balanceOf (address owner) external view returns (uint256);
  function baseToken () external view returns (address);
  function burn (uint256 tokenId) external;
  function exists (uint256 tokenId) external view returns (bool);
  function generateBase64SVG (uint256 tokenId) external view returns (string memory);
  function generateJSON (uint256 tokenId) external view returns (string memory json);
  function generateSVG (uint256 tokenId) external view returns (string memory);
  function getApproved (uint256 tokenId) external view returns (address);
  function getPixelsFor (uint256 tokenId) external view returns (uint24[16][16] memory);
  function history (uint256) external view returns (uint16 updatedPixelCount, uint96 reserveForRefund, bool burned);
  function isApprovedForAll (address owner, address operator) external view returns (bool);
  function mint (address to, uint24[16][16] memory pixelColors, uint16 updatedPixelCount, uint96 reserveForRefund, uint96 totalPrice) external;
  function name () external view returns (string memory);
  function nextTokenId () external view returns (uint256);
  function owner () external view returns (address);
  function ownerOf (uint256 tokenId) external view returns (address);
  function renounceOwnership () external;
  function safeTransferFrom (address from, address to, uint256 tokenId) external;
  function safeTransferFrom (address from, address to, uint256 tokenId, bytes calldata data) external;
  function setApprovalForAll (address operator, bool approved) external;
  function supportsInterface (bytes4 interfaceId) external view returns (bool);
  function symbol () external view returns (string memory);
  function tokenByIndex (uint256 index) external view returns (uint256);
  function tokenOfOwnerByIndex (address owner, uint256 index) external view returns (uint256);
  function tokenURI (uint256 tokenId) external view returns (string memory);
  function totalSupply () external view returns (uint256);
  function transferFrom (address from, address to, uint256 tokenId) external;
  function transferOwnership (address newOwner) external;
}
