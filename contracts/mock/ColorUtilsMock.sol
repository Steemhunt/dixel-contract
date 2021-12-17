// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "../lib/ColorUtils.sol";

contract ColorUtilsMock {
    function uint2str(uint256 i) external pure returns (string memory) {
        return ColorUtils.uint2str(i);
    }

    function uint2hex(uint24 i) external pure returns (string memory) {
        return ColorUtils.uint2hex(i);
    }
}
