// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DixelAirdrop is Ownable, ReentrancyGuard {
    IERC20 public baseToken;

    struct WhiteListParams {
        address wallet;
        uint8 airdropCategory; // contribution category
        uint128 contribution;
    }

    struct Contribution {
        uint128 nftContribution; // category: 1
        uint128 mintClubContribution; // category: 2
    }

    struct Total {
        uint128 nftTotalShare;
        uint128 mintClubTotalShare;
        uint128 nftTotalContribution;
        uint128 mintClubTotalContribution;
    }

    mapping(address => Contribution) userContributions;

    // TODO:

    // // GAS_SAVING: Store player's wallet addresses
    // address[] public playerWallets;
    // mapping(address => uint32) public players;

    // event UpdatePixels(address player, uint16 pixelCount, uint224 totalPrice);

    // constructor(address baseTokenAddress, address dixelArtAddress) {
    //     baseToken = IERC20(baseTokenAddress);
    //     nft = DixelArt(dixelArtAddress);

    //     // players[0] = baseTokenAddress (= token burning)
    //     playerWallets.push(baseTokenAddress);
    //     players[baseTokenAddress] = 0;

    //     for (uint256 x = 0; x < CANVAS_SIZE; x++) {
    //         for (uint256 y = 0; y < CANVAS_SIZE; y++) {
    //             // omit initial owner because default value 0 is correct
    //             pixels[x][y].price = GENESIS_PRICE;
    //         }
    //     }
    // }

    // function _getOrAddPlayerId(address wallet) private returns (uint32) {
    //     if (players[wallet] == 0 && wallet != playerWallets[0]) {
    //         playerWallets.push(wallet);
    //         players[wallet] = uint32(playerWallets.length - 1);
    //     }

    //     return players[wallet];
    // }

    // function updatePixels(PixelParams[] calldata params, uint256 nextTokenId) external nonReentrant {
    //     require(params.length <= CANVAS_SIZE * CANVAS_SIZE, 'TOO_MANY_PIXELS');
    //     require(nextTokenId == nft.nextTokenId(), 'NFT_EDITION_NUMBER_MISMATCHED');

    //     address msgSender = _msgSender();
    //     uint32 owner = _getOrAddPlayerId(msgSender);

    //     uint224 totalPrice = 0;
    //     for (uint256 i = 0; i < params.length; i++) {
    //         Pixel storage pixel = pixels[params[i].x][params[i].y];

    //         pixel.color = params[i].color;
    //         pixel.owner = owner;
    //         pixel.price = pixel.price + pixel.price * PRICE_INCREASE_RATE / MAX_RATE;

    //         totalPrice += pixel.price;
    //     }

    //     // Burn all tokens spent on creating a new edition of NFT
    //     require(baseToken.transferFrom(msgSender, address(baseToken), totalPrice), 'TOKEN_BURN_FAILED');

    //     nft.mint(msgSender, getPixelColors());

    //     emit UpdatePixels(msgSender, uint16(params.length), totalPrice);
    // }

    // function totalPlayerCount() external view returns (uint256) {
    //     return playerWallets.length;
    // }

    // // MARK: - Draw SVG

    // function getPixelColors() public view returns (uint24[CANVAS_SIZE][CANVAS_SIZE] memory pixelColors) {
    //     for (uint256 x = 0; x < CANVAS_SIZE; x++) {
    //         for (uint256 y = 0; y < CANVAS_SIZE; y++) {
    //             pixelColors[x][y] = pixels[x][y].color;
    //         }
    //     }
    // }

    // function getPixelOwners() public view returns (address[CANVAS_SIZE][CANVAS_SIZE] memory pixelOwners) {
    //     for (uint256 x = 0; x < CANVAS_SIZE; x++) {
    //         for (uint256 y = 0; y < CANVAS_SIZE; y++) {
    //             pixelOwners[x][y] = playerWallets[pixels[x][y].owner];
    //         }
    //     }
    // }

    // function getPixelPrices() public view returns (uint200[CANVAS_SIZE][CANVAS_SIZE] memory pixelPrices) {
    //     for (uint256 x = 0; x < CANVAS_SIZE; x++) {
    //         for (uint256 y = 0; y < CANVAS_SIZE; y++) {
    //             pixelPrices[x][y] = pixels[x][y].price;
    //         }
    //     }
    // }

    // function generateSVG() external view returns (string memory) {
    //     return _generateSVG(getPixelColors());
    // }

    // function generateBase64SVG() external view returns (string memory) {
    //     return _generateBase64SVG(getPixelColors());
    // }
}
