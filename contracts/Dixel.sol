// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol"; // Fot test
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
* @title Dixel
*
* Crowd-sourced pixel art community
*/
contract Dixel is Ownable, ReentrancyGuard {
    IERC20 public baseToken;

    uint200 public constant GENESIS_PRICE = 1e18; // Initial price: 1 DX
    uint16 public constant PRICE_INCREASE_RATE = 500;
    // uint16 public constant BURN_RATE = 100; // NOTE: Remove for gas savings
    uint16 public constant MAX_RATE = 10000;

    struct Pixel {
        uint24 color; // 24bit integer (000000 - ffffff = 0 - 16777215)
        uint32 owner; // GAS_SAVING: player.id, max 42B users
        uint200 price; // GAS_SAVING
    }

    struct Player {
        uint32 id;
        uint224 pendingReward; // GAS_SAVING
    }

    struct PixelParams {
        uint8 x;
        uint8 y;
        uint24 color;
    }

    Pixel[16][16] public pixels;

    // GAS_SAVING: Store player's wallet addresses
    address[] playerWallets;
    mapping(address => Player) public players;

    constructor(address baseTokenAddress) {
        baseToken = IERC20(baseTokenAddress);
        _getOrAddPlayerId(baseTokenAddress); // players[0] = baseTokenAddress (burn)

        for (uint256 i = 0; i < 16; i++) {
            for (uint256 j = 0; j < 16; j++) {
                // omit initial owner because default value 0 is correct
                pixels[i][j].price = GENESIS_PRICE;
            }
        }
    }

    function _getOrAddPlayerId(address wallet) private returns (uint32) {
        if (players[wallet].id == 0) {
            playerWallets.push(wallet);
            players[wallet].id = uint32(playerWallets.length - 1);
        }

        return players[wallet].id;
    }

    function updatePixels(PixelParams[] calldata params) external nonReentrant {
        address msgSender = _msgSender();
        uint32 owner = _getOrAddPlayerId(msgSender);

        uint224 totalPrice = 0;
        for (uint256 i = 0; i < params.length; i++) {
            Pixel storage pixel = pixels[params[i].x][params[i].y];

            uint32 oldOwner = pixel.owner;
            address oldOwnerWallet = playerWallets[oldOwner];

            pixel.color = params[i].color;
            pixel.owner = owner;
            pixel.price = pixel.price + pixel.price * PRICE_INCREASE_RATE / MAX_RATE;

            players[oldOwnerWallet].pendingReward += pixel.price; // NOTE: Re-entrancy attack possible?
            totalPrice += pixel.price;
        }

        require(baseToken.transferFrom(msgSender, address(this), totalPrice), 'TOKEN_TRANSFER_FAILED');
    }

    function _uint8ToHexCharCode(uint8 i) private pure returns (uint8) {
        return (i > 9) ?
            (i + 87) : // ascii a-f
            (i + 48); // ascii 0-9
    }

    function int2hex(uint24 i) external pure returns (string memory) {
        bytes memory o = new bytes(6);
        uint24 mask = 0x00000f; // hex 15
        uint256 k = 6;
        do {
            k--;
            o[k] = bytes1(_uint8ToHexCharCode(uint8(i & mask)));
            i >>= 4;
        } while (k > 0);

        return string(o);
    }
}
