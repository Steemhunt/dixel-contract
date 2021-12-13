// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol"; // Fot test

/**
* @title Dixel
*
* Crowd-sourced pixel art community
*/
contract Dixel is Ownable {
    // 32x32 matrix of 24bit integer (000000 - ffffff = 0 - 16777215)
    uint24[32][32] public pixels;

    struct PixelData {
        uint8 x;
        uint8 y;
        uint24 color;
    }

    function updatePixel(PixelData calldata pd) external {
        pixels[pd.x][pd.y] = pd.color;
    }

    function updatePixels(PixelData[] calldata pds) external {
        for (uint256 i = 0; i < pds.length; i++) {
            pixels[pds[i].x][pds[i].y] = pds[i].color;
        }
    }

    function _uint8ToHexCharCode(uint8 i) private pure returns (uint8) {
        return (i > 9) ?
            (i + 87) : // ascii a-f
            (i + 48); // ascii 0-9
    }

    function int2hex(uint24 i) public pure returns (string memory) {
        bytes memory o = new bytes(6);
        uint24 mask = 0x00000f; // hex 15
        uint k = 6;
        do {
            k--;
            o[k] = bytes1(_uint8ToHexCharCode(uint8(i & mask)));
            i >>= 4;
        } while (k > 0);

        return string(o);
    }
}
