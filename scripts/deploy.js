// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0].address;
  console.log(`Deploy from account: ${deployer}`);

  // MARK: - Deploy test token (only for testnet)
  const testToken = await hre.ethers.getContractFactory('ERC20PresetMinterPauser');
  const token = await testToken.deploy('Test Dixel', 'TEST_DIXEL');
  await token.deployed();
  await token.mint(deployer, '10000000000000000000000'); // 10,000 tokens

  console.log(`Test token is deployed at ${token.address}`);

  // MARK: - Deploy NFT contract
  const DixelArt = await hre.ethers.getContractFactory('DixelArt');
  const nft = await DixelArt.deploy();
  await nft.deployed();

  // MARK: - Deploy contract
  const Dixel = await hre.ethers.getContractFactory('Dixel');
  const dixel = await Dixel.deploy(token.address, nft.address);
  await dixel.deployed();

  await nft.transferOwnership(dixel.address);

  console.log('---');
  console.log(`- Test token: ${token.address}`);
  console.log(`- DixelArt NFT: ${nft.address}`);
  console.log(`- Dixel contract: ${dixel.address}`);
};

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

// npx hardhat compile && HARDHAT_NETWORK=bsctest node scripts/deploy.js
// DixelArt
// npx hardhat verify --network bsctest 0xBD4a906b400331df7295220BB6C86dCEd645C40C
// Dixel, BaseToken, DixelArt
// npx hardhat verify --network bsctest 0x557B0c5a542Cf91179700C6d4ac16c565e1c3D04 '0xc6d3a8976AFa1C004B6fa4Ebf96bf90188586445' '0xBD4a906b400331df7295220BB6C86dCEd645C40C'
