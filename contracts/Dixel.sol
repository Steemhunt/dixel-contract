// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./lib/ColorUtils.sol";
import "./lib/Base64.sol";
import "./DixelSVGGenerator.sol";
import "./DixelArt.sol";

/**
* @title Dixel
*
* Crowd-sourced pixel art community
*/
contract Dixel is Ownable, ReentrancyGuard, DixelSVGGenerator {
    IERC20 public baseToken;
    DixelArt public nft;

    uint256 private constant GENESIS_PRICE = 1e18; // Initial price: 1 DIXEL
    uint256 private constant PRICE_INCREASE_RATE = 500; // 5% price increase on over-writing
    uint256 private constant REWARD_RATE = 1000; // 10% goes to contributors & 90% goes to NFT contract for refund on burn
    uint256 private constant MAX_RATE = 10000;

    struct Pixel {
        uint24 color; // 24bit integer (000000 - ffffff = 0 - 16777215)
        uint32 owner; // GAS_SAVING: player.id, max 42B users
        uint200 price; // GAS_SAVING
    }

    struct PixelParams {
        uint8 x;
        uint8 y;
        uint24 color;
    }

    Pixel[CANVAS_SIZE][CANVAS_SIZE] public pixels;

    // GAS_SAVING: Store player's wallet addresses
    address[] public playerWallets;
    mapping(address => uint32) public players;

    event UpdatePixels(address player, uint16 pixelCount, uint96 totalPrice, uint96 rewardGenerated);

    constructor(address baseTokenAddress, address dixelArtAddress) {
        baseToken = IERC20(baseTokenAddress);
        nft = DixelArt(dixelArtAddress);

        // players[0] = baseTokenAddress (= token burning)
        playerWallets.push(baseTokenAddress);
        players[baseTokenAddress] = 0;

        for (uint256 x = 0; x < CANVAS_SIZE; x++) {
            for (uint256 y = 0; y < CANVAS_SIZE; y++) {
                // omit initial owner because default value 0 is correct
                pixels[x][y].price = GENESIS_PRICE;
            }
        }
    }

    // Approve token spending by this contract, should be called after construction
    function initApprove() external onlyOwner {
        require(baseToken.approve(address(this), 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff), 'APPROVE_FAILED');
    }

    function _getOrAddPlayerId(address wallet) private returns (uint32) {
        if (players[wallet] == 0 && wallet != playerWallets[0]) {
            playerWallets.push(wallet);
            players[wallet] = uint32(playerWallets.length - 1);
        }

        return players[wallet];
    }

    function updatePixels(PixelParams[] calldata params, uint256 nextTokenId) external nonReentrant {
        require(params.length <= CANVAS_SIZE * CANVAS_SIZE, 'TOO_MANY_PIXELS');
        require(nextTokenId == nft.nextTokenId(), 'NFT_EDITION_NUMBER_MISMATCHED');

        address msgSender = _msgSender();
        uint32 owner = _getOrAddPlayerId(msgSender);

        uint256 totalPrice = 0;
        for (uint256 i = 0; i < params.length; i++) {
            Pixel storage pixel = pixels[params[i].x][params[i].y];

            pixel.color = params[i].color;
            pixel.owner = owner;
            totalPrice += pixel.price;

            pixel.price = pixel.price + pixel.price * PRICE_INCREASE_RATE / MAX_RATE;
        }

        // 10% goes to the contributor reward pools
        uint256 reward = totalPrice * REWARD_RATE / MAX_RATE;
        require(baseToken.transferFrom(msgSender, address(this), reward), 'REWARD_TRANSFER_FAILED');

        // 90% goes to the NFT contract for refund on burn
        require(baseToken.transferFrom(msgSender, address(nft), totalPrice - reward), 'RESERVE_TRANSFER_FAILED');

        nft.mint(msgSender, getPixelColors(), uint16(params.length), uint96(totalPrice - reward));

        emit UpdatePixels(msgSender, uint16(params.length), totalPrice, reward);
    }

    function totalPlayerCount() external view returns (uint256) {
        return playerWallets.length;
    }

    // MARK: - Draw SVG

    function getPixelColors() public view returns (uint24[CANVAS_SIZE][CANVAS_SIZE] memory pixelColors) {
        for (uint256 x = 0; x < CANVAS_SIZE; x++) {
            for (uint256 y = 0; y < CANVAS_SIZE; y++) {
                pixelColors[x][y] = pixels[x][y].color;
            }
        }
    }

    function getPixelOwners() public view returns (address[CANVAS_SIZE][CANVAS_SIZE] memory pixelOwners) {
        for (uint256 x = 0; x < CANVAS_SIZE; x++) {
            for (uint256 y = 0; y < CANVAS_SIZE; y++) {
                pixelOwners[x][y] = playerWallets[pixels[x][y].owner];
            }
        }
    }

    function getPixelPrices() public view returns (uint200[CANVAS_SIZE][CANVAS_SIZE] memory pixelPrices) {
        for (uint256 x = 0; x < CANVAS_SIZE; x++) {
            for (uint256 y = 0; y < CANVAS_SIZE; y++) {
                pixelPrices[x][y] = pixels[x][y].price;
            }
        }
    }

    function generateSVG() external view returns (string memory) {
        return _generateSVG(getPixelColors());
    }

    function generateBase64SVG() external view returns (string memory) {
        return _generateBase64SVG(getPixelColors());
    }
}
