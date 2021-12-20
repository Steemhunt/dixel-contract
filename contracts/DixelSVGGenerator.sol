// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "./lib/ColorUtils.sol";
import "./lib/Base64.sol";

/**
* @title Dixel SVG image generator
*/
contract DixelSVGGenerator {
  uint16 internal constant CANVAS_SIZE = 16; // 16 x 16 pixels

  function _generateSVG(uint24[32][32] memory pixels) internal pure returns (string memory) {
      // TODO: Can we put these templates as constant instance vars to save gas?
      string memory svg = '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 640 640">';

      for (uint256 x = 0; x < CANVAS_SIZE; x++) {
          for (uint256 y = 0; y < CANVAS_SIZE; y++) {
              svg = string(abi.encodePacked(
                  svg,
                  '<rect width="40" height="40" x="',
                  ColorUtils.uint2str(x * 40),
                  '" y="',
                  ColorUtils.uint2str(y * 40),
                  '" fill="#',
                  ColorUtils.uint2hex(pixels[x][y]),
                  '"/>'
              ));
          }
      }

      return string(abi.encodePacked(svg, '</svg>'));
  }

  function _generateBase64SVG(uint24[32][32] memory pixels) internal pure returns (string memory) {
      return string(abi.encodePacked('data:image/svg+xml;base64,', Base64.encode(bytes(_generateSVG(pixels)))));
  }
}