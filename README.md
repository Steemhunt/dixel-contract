# Dixel
A single NFT canvas where users overwrite the previous edition with price-compounded pixels.

1. There is an universal art canvas with 16x16 pixels that anyone can overwrite
2. Whenever a user overwrites a pixel, the price of the pixel increases by 0.1% (Initial pixel price: 0.001 DIXEL)
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
- DixelClub: [0x5d6FB69Bf26090aDc60e1567f05947c486773f57](https://bscscan.com/address/0x5d6FB69Bf26090aDc60e1567f05947c486773f57)
- DixelArt NFT: [0x9F2659b0D2baD4C1D57819df58787cDFd391E3dF](https://bscscan.com/address/0x9F2659b0D2baD4C1D57819df58787cDFd391E3dF)
- DixelAirdrop: [0x0f56Bd665b1Df1eafab97D0A2393acC1dEA47a21](https://bscscan.com/address/0x0f56Bd665b1Df1eafab97D0A2393acC1dEA47a21)

### BSC Testnet
- Test token: 0x62c01AF8F8Ab997Acec06C3a71DC18594726ba24
- TestTokenFaucet: 0x0d5B2E37FB21A784FE26fD8d89Ea3Ce8F8BDc54d
- DixelClub: 0x3b7bd4FCcc630f025584f1F7e4874adB1f324AcE
- DixelArt NFT: 0x46cc5a12A3F58A837475C9BFe52C0C02274C0C0c
- DixelAirdrop: 0x7Fcb48b7AF75E47af89B328f99B681aCa93A7d10

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
|  Methods                                           ·                1 gwei/gas                ·       2435.54 usd/eth       │
····························|························|·············|·············|··············|···············|··············
|  Contract                 ·  Method                ·  Min        ·  Max        ·  Avg         ·  # calls      ·  usd (avg)  │
····························|························|·············|·············|··············|···············|··············
|  DixelAirdrop             ·  claim                 ·          -  ·          -  ·       69988  ·            8  ·       0.17  │
····························|························|·············|·············|··············|···············|··············
|  DixelAirdrop             ·  closeAirdrop          ·          -  ·          -  ·       78915  ·            3  ·       0.19  │
····························|························|·············|·············|··············|···············|··············
|  DixelAirdrop             ·  whitelist             ·          -  ·          -  ·       95119  ·           22  ·       0.23  │
····························|························|·············|·············|··············|···············|··············
|  DixelArt                 ·  burn                  ·          -  ·          -  ·       68181  ·            7  ·       0.17  │
····························|························|·············|·············|··············|···············|··············
|  DixelArt                 ·  transferOwnership     ·      28630  ·      28642  ·       28641  ·           90  ·       0.07  │
····························|························|·············|·············|··············|···············|··············
|  DixelMock                ·  claimReward           ·      55953  ·      73053  ·       57268  ·           52  ·       0.14  │
····························|························|·············|·············|··············|···············|··············
|  DixelMock                ·  updatePixels          ·    1157496  ·    1292627  ·     1242263  ·          202  ·       3.03  │
····························|························|·············|·············|··············|···············|··············
|  DixelMock                ·  updatePixelsNoChecks  ·          -  ·          -  ·     3008326  ·            1  ·       7.33  │
····························|························|·············|·············|··············|···············|··············
|  DixelMock                ·  updatePixelsOriginal  ·          -  ·          -  ·     3258586  ·            1  ·       7.94  │
····························|························|·············|·············|··············|···············|··············
|  ERC20PresetMinterPauser  ·  approve               ·      46608  ·      46620  ·       46619  ·          179  ·       0.11  │
····························|························|·············|·············|··············|···············|··············
|  ERC20PresetMinterPauser  ·  mint                  ·      55830  ·      72954  ·       62402  ·          292  ·       0.15  │
····························|························|·············|·············|··············|···············|··············
|  Deployments                                       ·                                          ·  % of limit   ·             │
·····················································|·············|·············|··············|···············|··············
|  ColorUtilsMock                                    ·          -  ·          -  ·      298677  ·        0.5 %  ·       0.73  │
·····················································|·············|·············|··············|···············|··············
|  DixelAirdrop                                      ·     794659  ·     794671  ·      794670  ·        1.3 %  ·       1.94  │
·····················································|·············|·············|··············|···············|··············
|  DixelArt                                          ·    2927148  ·    2927172  ·     2927171  ·        4.9 %  ·       7.13  │
·····················································|·············|·············|··············|···············|··············
|  DixelMock                                         ·    8076080  ·    8096016  ·     8076320  ·       13.5 %  ·      19.67  │
·····················································|·············|·············|··············|···············|··············
|  ERC20PresetMinterPauser                           ·          -  ·          -  ·     1951544  ·        3.3 %  ·       4.75  │
·----------------------------------------------------|-------------|-------------|--------------|---------------|-------------·
```
