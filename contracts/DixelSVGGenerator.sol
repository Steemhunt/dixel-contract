// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "base64-sol/base64.sol";
import "./lib/ColorUtils.sol";

/**
* @title Dixel SVG image generator
*/
contract DixelSVGGenerator {
    uint16 internal constant CANVAS_SIZE = 16; // 16 x 16 pixels

    /* solhint-disable quotes */
    string private constant HEADER = '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" viewBox="0 0 640 640"><rect id="p" width="40" height="40"/>';
    string private constant FOOTER = '</svg>';
    /* solhint-enable quotes */

    function _generateSVG(uint24[CANVAS_SIZE][CANVAS_SIZE] memory pixels) internal pure returns (string memory) {
        string memory svg = HEADER;

        /* solhint-disable quotes */
        for (uint256 x = 0; x < CANVAS_SIZE; x++) {
            svg = string(abi.encodePacked(
                svg,
                '<svg x="',
                ColorUtils.uint2str(x * 40),
                '">'
            ));
            for (uint256 y = 0; y < CANVAS_SIZE; y++) {
                svg = string(abi.encodePacked(
                    svg,
                    '<use href="#p" ',
                    'y="',
                    ColorUtils.uint2str(y * 40),
                    '" fill="#',
                    ColorUtils.uint2hex(pixels[x][y]),
                    '"/>'
                ));
            }
            svg = string(abi.encodePacked(
                svg,
                FOOTER
            ));
        }
        /* solhint-enable quotes */

        return string(abi.encodePacked(svg, FOOTER));
    }

    function _generateBase64SVG(uint24[CANVAS_SIZE][CANVAS_SIZE] memory pixels) internal pure returns (string memory) {
        return string(abi.encodePacked("data:image/svg+xml;base64,", Base64.encode(bytes(_generateSVG(pixels)))));
    }
}