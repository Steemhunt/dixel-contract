// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./lib/ColorUtils.sol";
import "./lib/Base64.sol";

/**
* @title Dixel
*
* Crowd-sourced pixel art community
*/
contract Dixel is Ownable, ReentrancyGuard {
    IERC20 public baseToken;

    uint16 private constant CANVAS_SIZE = 16; // 16 x 16 pixels
    uint200 private constant GENESIS_PRICE = 1e18; // Initial price: 1 DX
    uint16 private constant PRICE_INCREASE_RATE = 500;
    // uint16 private constant BURN_RATE = 100; // NOTE: Remove for gas savings
    uint16 private constant MAX_RATE = 10000;

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

    Pixel[CANVAS_SIZE][CANVAS_SIZE] public pixels;

    // GAS_SAVING: Store player's wallet addresses
    address[] playerWallets;
    mapping(address => Player) public players;

    event UpdatePixels(address player, uint16 pixelCount, uint224 totalPrice);
    event ClaimReward(address player, uint224 rewardAmount);

    constructor(address baseTokenAddress) {
        baseToken = IERC20(baseTokenAddress);
        _getOrAddPlayerId(baseTokenAddress); // players[0] = baseTokenAddress (burn)

        for (uint256 x = 0; x < CANVAS_SIZE; x++) {
            for (uint256 y = 0; y < CANVAS_SIZE; y++) {
                // omit initial owner because default value 0 is correct
                pixels[x][y].price = GENESIS_PRICE;
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
        require(params.length <= CANVAS_SIZE * CANVAS_SIZE, 'TOO_MANY_PIXELS');

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

        emit UpdatePixels(msgSender, uint16(params.length), totalPrice);
    }

    function claimReward() external {
        address msgSender = _msgSender();

        uint224 pendingReward = players[msgSender].pendingReward;
        players[msgSender].pendingReward = 0;
        require(baseToken.transfer(msgSender, pendingReward), 'TOKEN_TRANSFER_FAILED');

        emit ClaimReward(msgSender, pendingReward);
    }

    function totalPlayerCount() external view returns (uint256) {
        return playerWallets.length;
    }

    // MARK: - Draw SVG

    function generateSVG() public view returns (string memory) {
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
                    ColorUtils.uint2hex(pixels[x][y].color),
                    '"/>'
                ));
            }
        }

        return string(abi.encodePacked(svg, '</svg>'));
    }

    function generateBase64SVG() external view returns (string memory) {
        return string(abi.encodePacked('data:image/svg+xml;base64,', Base64.encode(bytes(generateSVG()))));
    }
}
