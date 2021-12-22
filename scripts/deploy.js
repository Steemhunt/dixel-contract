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

// DIXEL token
// npx hardhat verify --network bsctest 0xAC7755f5CEDb18C82DA2273082C88477f7Bf43a4 'Test Dixel', 'TEST_DIXEL'
// DixelArt
// npx hardhat verify --network bsctest 0xAC7755f5CEDb18C82DA2273082C88477f7Bf43a4
// Dixel, BaseToken, DixelArt
// npx hardhat verify --network bsctest 0x866399B1444e245245bC032E6E64DA6884bab90C '0x79144866Fe78169D5fC08069ede7d36006B96DE9' '0xAC7755f5CEDb18C82DA2273082C88477f7Bf43a4'
