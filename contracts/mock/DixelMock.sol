// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "../Dixel.sol";
import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol"; // Fot test

contract DixelMock is Dixel {
    bool public constant IS_MOCK = true; // Prevent the same bytecode produced by verifier

    // solhint-disable-next-line func-visibility, no-empty-blocks
    constructor(address baseTokenAddress, address dixelArtAddress)
        Dixel(baseTokenAddress, dixelArtAddress)
    {}

    function getAccRewardPerContribution() external view returns (uint256) {
        return accRewardPerContribution;
    }
}
