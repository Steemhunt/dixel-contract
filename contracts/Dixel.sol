// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./lib/ColorUtils.sol";
import "./DixelSVGGenerator.sol";
import "./DixelArt.sol";

/**
* @title Dixel
*
* Crowd-sourced pixel art community
*/
contract Dixel is Context, ReentrancyGuard, DixelSVGGenerator {
    IERC20 public baseToken;
    DixelArt public dixelArt;

    uint200 internal constant GENESIS_PRICE = 1e15; // Initial price: 0.001 DIXEL (~$0.005)
    uint256 internal constant PRICE_INCREASE_RATE = 10; // 0.1% price increase on over-writing
    uint256 internal constant REWARD_RATE = 1000; // 10% goes to contributors & 90% goes to NFT contract for refund on burn
    uint256 internal constant MAX_RATE = 10000;
    uint256 public genesisBlock;

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

    struct Player {
        uint32 id;
        uint32 contribution;
        uint192 rewardClaimed;
        uint256 rewardDebt;
    }

    uint256 public totalContribution;
    uint256 internal accRewardPerContribution;

    // Fancy math here:
    //   - player.rewardDebt: Reward amount that should be deducted (the amount accumulated before I joined)
    //   - accRewardPerContribution: Accumulated reward per share (contribution)
    //     (use `accRewardPerContribution * 1e21` because the value is normally less than 1 with many decimals)

    // Example: accRewardPerContribution =
    //   1. reward: 100 (+100) & total contribution: 100 -> 0 + 100 / 100 = 1.0
    //   2. reward: 150 (+50) & total contribution: 200 (+100) -> 1 + 50 / 200 = 1.25
    //   3. reward: 250 (+100) & total contribution: 230 (+30) -> 1.25 + 100 / 230 = 1.68478
    //
    //   => claimableReward = (player.contribution * accRewardPerContribution) - player.rewardDebt
    //
    // Update `accRewardPerContribution` whenever a reward added (new NFT is minted)
    //   => accRewardPerContribution += reward generated / (new)totalContribution
    //
    // Update player's `rewardDebt` whenever the player claim reward or mint a new token (contribution changed)
    //   => player.rewardDebt = accRewardPerContribution * totalContribution

    Pixel[CANVAS_SIZE][CANVAS_SIZE] public pixels;

    // GAS_SAVING: Store player's wallet addresses
    address[] public playerWallets;
    mapping(address => Player) public players;

    event ClaimReward(address indexed player, uint256 rewardAmount);

    // solhint-disable-next-line func-visibility
    constructor(address baseTokenAddress, address dixelArtAddress, uint256 _genesisBlock) {
        baseToken = IERC20(baseTokenAddress);
        dixelArt = DixelArt(dixelArtAddress);
        genesisBlock = _genesisBlock;

        // players[0].id = baseTokenAddress (= token burning)
        playerWallets.push(baseTokenAddress);
        players[baseTokenAddress].id = 0;

        unchecked {
            for (uint256 x = 0; x < CANVAS_SIZE; x++) {
                for (uint256 y = 0; y < CANVAS_SIZE; y++) {
                    // omit initial owner because default value 0 is correct
                    pixels[x][y].price = GENESIS_PRICE;
                }
            }
        }
    }

    function _getOrAddPlayer(address wallet) internal returns (Player storage) {
        require(playerWallets.length < 0xffffffff, "MAX_USER_REACHED");

        if (players[wallet].id == 0 && wallet != playerWallets[0]) {
            playerWallets.push(wallet);
            players[wallet].id = uint32(playerWallets.length - 1);
        }

        return players[wallet];
    }

    function updatePixels(PixelParams[] calldata params, uint256 nextTokenId) external nonReentrant {
        require(block.number >= genesisBlock, "NOT_STARTED_YET");
        require(params.length > 0 && params.length <= CANVAS_SIZE * CANVAS_SIZE, "INVALID_PIXEL_PARAMS");
        require(nextTokenId == dixelArt.nextTokenId(), "NFT_EDITION_NUMBER_MISMATCHED");

        address msgSender = _msgSender();
        Player storage player = _getOrAddPlayer(msgSender);

        uint256 totalPrice = 0;
        uint8 prevX = 0;
        uint8 prevY = 0;
        unchecked {
            for (uint256 i = 0; i < params.length; i++) {
                if (i > 0) { // should not check for the first parameter
                    require(prevX * CANVAS_SIZE + prevY < params[i].x * CANVAS_SIZE + params[i].y, "PARAMS_NOT_SORTED");
                }

                prevX = params[i].x;
                prevY = params[i].y;

                Pixel storage pixel = pixels[params[i].x][params[i].y];
                // compare old color with incoming color
                require(pixel.color != params[i].color, "UNCHANGED_PIXEL_COLORS");
                uint200 oldPrice = pixel.price;

                pixel.color = params[i].color;
                pixel.owner = player.id;
                totalPrice += oldPrice;

                pixel.price = uint200(oldPrice + oldPrice * PRICE_INCREASE_RATE / MAX_RATE);
                assert(pixel.price > oldPrice);
            }
        }

        uint16 updatedPixelCount = uint16(params.length);

        // DIXEL total supply is 1M, so uint96 will be enough
        uint96 reserveForRefund = _updatePlayerReward(player, totalPrice, updatedPixelCount);

        // Mint NFT to the user
        dixelArt.mint(msgSender, getPixelColors(), updatedPixelCount, reserveForRefund, uint96(totalPrice));
    }

    function _updatePlayerReward(Player storage player, uint256 totalPrice, uint256 updatedPixelCount) internal returns (uint96) {
        address msgSender = playerWallets[player.id];

        unchecked {
            // 10% goes to the contributor reward pools
            uint256 reward = (totalPrice * REWARD_RATE) / MAX_RATE;
            require(baseToken.transferFrom(msgSender, address(this), reward), "REWARD_TRANSFER_FAILED");

            // 90% goes to the NFT contract for refund on burn
            require(baseToken.transferFrom(msgSender, address(dixelArt), totalPrice - reward), "RESERVE_TRANSFER_FAILED");

            // Keep the pending reward, so it can be deducted from debt at the end (No auto claiming)
            uint256 pendingReward = claimableReward(msgSender);

            // Calculate how much reward earned from new reward
            uint256 playerEarned;

            // Update acc values before updating contributions so players don't get rewards for their own penalties
            if (totalContribution != 0) { // The first reward will be permanently locked on the contract
                accRewardPerContribution += (1e21 * reward) / totalContribution; // multiply 1e21 to preserve decimals on calculation

                // If the same player already has some contribution, that should be added (= deducted from debt)
                playerEarned = player.contribution * reward / totalContribution;
            }

            totalContribution += updatedPixelCount;
            player.contribution += uint32(updatedPixelCount);

            // Update debt so user can only claim reward from after this event
            player.rewardDebt = _totalPlayerRewardSoFar(player.contribution) - pendingReward - playerEarned;

            return uint96(totalPrice - reward);
        }
    }

    function totalPlayerCount() external view returns (uint256) {
        return playerWallets.length - 1; // -1 for wallet[0] = baseToken (burn)
    }

    // MARK: - Reward by contributions

    function _totalPlayerRewardSoFar(uint32 playerContribution) private view returns (uint256) {
        return (accRewardPerContribution * playerContribution) / 1e21;
    }

    function claimableReward(address wallet) public view returns (uint256) {
        return _totalPlayerRewardSoFar(players[wallet].contribution) - players[wallet].rewardDebt;
    }

    function claimReward() external {
        address msgSender = _msgSender();
        uint256 amount = claimableReward(msgSender);
        require(amount > 0, "NOTHING_TO_CLAIM");

        Player storage player = players[msgSender];
        unchecked {
            player.rewardClaimed += uint192(amount);
        }
        player.rewardDebt = _totalPlayerRewardSoFar(player.contribution); // claimable becomes 0

        require(baseToken.transfer(msgSender, amount), 'TOKEN_TRANSFER_FAILED');

        emit ClaimReward(msgSender, amount);
    }

    // MARK: - Draw SVG

    function getPixelColors() public view returns (uint24[CANVAS_SIZE][CANVAS_SIZE] memory pixelColors) {
        for (uint256 x = 0; x < CANVAS_SIZE; x++) {
            for (uint256 y = 0; y < CANVAS_SIZE; y++) {
                pixelColors[x][y] = pixels[x][y].color;
            }
        }
    }

    function getPixelOwners() external view returns (address[CANVAS_SIZE][CANVAS_SIZE] memory pixelOwners) {
        for (uint256 x = 0; x < CANVAS_SIZE; x++) {
            for (uint256 y = 0; y < CANVAS_SIZE; y++) {
                pixelOwners[x][y] = playerWallets[pixels[x][y].owner];
            }
        }
    }

    function getPixelPrices() external view returns (uint200[CANVAS_SIZE][CANVAS_SIZE] memory pixelPrices) {
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
