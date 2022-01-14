// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

interface IPixelParams {

    struct PixelParams {
        uint8 x;
        uint8 y;
        uint24 color;
    }
}