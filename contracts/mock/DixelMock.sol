// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "../Dixel.sol";
import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol"; // Fot test

contract DixelMock is Dixel {
    constructor(address baseTokenAddress) Dixel(baseTokenAddress) {}
}