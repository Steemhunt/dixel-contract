# Dixel
A single NFT canvas where users overwrite the previous edition with price-compounded pixels.

1. There is an universal art canvas with 16x16 pixels that anyone can overwrite
2. Whenever a user overwrites a pixel, the price of the pixel increases by 5% (Initial pixel price: 1 DIXEL)
3. A new NFT edition with the current canvas state will be minted to the updater (image data is encoded as SVG, 100% on-chain)
4. Total cost that user paid to overwrite pixels goes to:
    - 10% -> all contributors proportional to their contribution count (total pixel count a user has updated so far)
    - 90% -> reserve for refund when the NFT gets burned
5. If a user burn a NFT they own, reserve amount (DIXEL tokens) gets refunded to the user (90% of total minting cost)

## Run Tests
```bash
npx hardhat test
```

## Contracts

### BSC Production
- DIXEL token: [0xA4CB7f8c6659576F50A893C18F28765018f34E12](https://bscscan.com/token/0xA4CB7f8c6659576F50A893C18F28765018f34E12)
- DixelAirdrop: TBA
- DixelArt NFT: TBA
- Dixel contract: TBA

### BSC Testnet
- Test token: 0x0aE4E4A16872C06e855265Eb15c0584A867944Aa
- TestTokenFaucet: 0x0527687657B66d72903519307c6f8BECFf2e221d
- DixelAirdrop: 0xBDd8Ea413Dd602a8f963153E96C8D577FcEEcf9d
- DixelArt NFT: 0xa3e7b509B4cd613fC7543CCb4932e3da0974Ab7e
- Dixel contract: 0x99Ac77ab6C35E1b79B8e460C876cd3CF29694f8c

## Deploy
```bash
npx hardhat compile

HARDHAT_NETWORK=bscmain node scripts/deploy.js

# Verify source code on Etherscan
npx hardhat verify --network bscmain {contract address} "parameter 1" "parameter 2"
```

## Gas Consumption
```
·----------------------------------------------------|---------------------------|--------------|-----------------------------·
|                Solc version: 0.8.10                ·  Optimizer enabled: true  ·  Runs: 1500  ·  Block limit: 60000000 gas  │
·····················································|···························|··············|······························
|  Methods                                           ·                1 gwei/gas                ·       3060.11 usd/eth       │
····························|························|·············|·············|··············|···············|··············
|  Contract                 ·  Method                ·  Min        ·  Max        ·  Avg         ·  # calls      ·  usd (avg)  │
····························|························|·············|·············|··············|···············|··············
|  DixelAirdrop             ·  addTokens             ·      69103  ·      90972  ·       80038  ·           46  ·       0.24  │
····························|························|·············|·············|··············|···············|··············
|  DixelAirdrop             ·  claim                 ·          -  ·          -  ·       77355  ·            9  ·       0.24  │
····························|························|·············|·············|··············|···············|··············
|  DixelAirdrop             ·  closeAirdrop          ·          -  ·          -  ·       59767  ·            3  ·       0.18  │
····························|························|·············|·············|··············|···············|··············
|  DixelAirdrop             ·  startAirdrop          ·          -  ·          -  ·       28419  ·            9  ·       0.09  │
····························|························|·············|·············|··············|···············|··············
|  DixelAirdrop             ·  whitelist             ·          -  ·          -  ·      199568  ·           23  ·       0.61  │
····························|························|·············|·············|··············|···············|··············
|  DixelArt                 ·  burn                  ·          -  ·          -  ·       68181  ·            7  ·       0.21  │
····························|························|·············|·············|··············|···············|··············
|  DixelArt                 ·  transferOwnership     ·      28630  ·      28642  ·       28641  ·           89  ·       0.09  │
····························|························|·············|·············|··············|···············|··············
|  DixelMock                ·  claimReward           ·      55953  ·      73053  ·       57349  ·           49  ·       0.18  │
····························|························|·············|·············|··············|···············|··············
|  DixelMock                ·  updatePixels          ·    1155371  ·    1290502  ·     1240488  ·          199  ·       3.80  │
····························|························|·············|·············|··············|···············|··············
|  DixelMock                ·  updatePixelsNoChecks  ·          -  ·          -  ·     3008326  ·            1  ·       9.21  │
····························|························|·············|·············|··············|···············|··············
|  DixelMock                ·  updatePixelsOriginal  ·          -  ·          -  ·     3258563  ·            1  ·       9.97  │
····························|························|·············|·············|··············|···············|··············
|  ERC20PresetMinterPauser  ·  approve               ·      46608  ·      46620  ·       46620  ·          202  ·       0.14  │
····························|························|·············|·············|··············|···············|··············
|  ERC20PresetMinterPauser  ·  mint                  ·      55830  ·      72954  ·       62426  ·          291  ·       0.19  │
····························|························|·············|·············|··············|···············|··············
|  Deployments                                       ·                                          ·  % of limit   ·             │
·····················································|·············|·············|··············|···············|··············
|  ColorUtilsMock                                    ·          -  ·          -  ·      298677  ·        0.5 %  ·       0.91  │
·····················································|·············|·············|··············|···············|··············
|  DixelAirdrop                                      ·    1201527  ·    1201539  ·     1201538  ·          2 %  ·       3.68  │
·····················································|·············|·············|··············|···············|··············
|  DixelArt                                          ·    2873551  ·    2873563  ·     2873562  ·        4.8 %  ·       8.79  │
·····················································|·············|·············|··············|···············|··············
|  DixelMock                                         ·    8048133  ·    8048157  ·     8048156  ·       13.4 %  ·      24.63  │
·····················································|·············|·············|··············|···············|··············
|  ERC20PresetMinterPauser                           ·          -  ·          -  ·     1951544  ·        3.3 %  ·       5.97  │
·----------------------------------------------------|-------------|-------------|--------------|---------------|-------------·
```
