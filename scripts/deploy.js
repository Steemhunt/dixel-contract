// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { ether } = require("@openzeppelin/test-helpers");

async function main() {
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0].address;
  console.log(`Deploy from account: ${deployer}`);

  // MARK: - Deploy test token (only for testnet)
  const testToken = await hre.ethers.getContractFactory('ERC20PresetMinterPauser');
  const token = await testToken.deploy('Test Dixel', 'TEST_DIXEL');
  await token.deployed();
  await token.mint(deployer, '100000000000000000000000'); // 100,000 tokens
  await token.mint('0x32A935f79ce498aeFF77Acd2F7f35B3aAbC31a2D', '10000000000000000000000'); // 10k - tester 0
  await token.mint('0x91Ec1d18ed7a3587B87066F0Ab1a641dCBb84e9E', '10000000000000000000000'); // 10k -tester 1
  await token.mint('0xF6B02237E1EEe17EdC0c0733182929999e5B2b79', '10000000000000000000000'); // 10k -tester 2

  console.log(`Test token is deployed at ${token.address}`);

  // MARK: - Deploy NFT contract
  const DixelArt = await hre.ethers.getContractFactory('DixelArt');
  const nft = await DixelArt.deploy();
  await nft.deployed();

  console.log(`DixelArt contract deployed at ${nft.address}`);

  // MARK: - Deploy contract
  const Dixel = await hre.ethers.getContractFactory('Dixel');
  const dixel = await Dixel.deploy(token.address, nft.address);
  await dixel.deployed();

  console.log(`Dixel contract deployed at ${dixel.address}`);

  await nft.transferOwnership(dixel.address);
  console.log(`DixelArt contract ownership has changed`);

  // MARK: - Deploy Airdrop contract
  const DixelAirdrop = await hre.ethers.getContractFactory('DixelAirdrop');
  const airdrop = await DixelAirdrop.deploy(token.address);
  await airdrop.deployed();

  console.log(`DixelAirdrop contract deployed at ${airdrop.address}`);

  await this.airdrop.addTokens(1, "10000000000000000000000"); // 10k
  await this.airdrop.addTokens(2, "3000000000000000000000"); // 3k

  // Add whitelist (only for testnet)
  const WHITELIST = [
    ['0x32A935f79ce498aeFF77Acd2F7f35B3aAbC31a2D', '100000000000000000000', '200000000000000000000'],
    ['0x91Ec1d18ed7a3587B87066F0Ab1a641dCBb84e9E', '300000000000000000000', '100000000000000000000'],
    ['0xF6B02237E1EEe17EdC0c0733182929999e5B2b79', '0', '500000000000000000000'],
  ];
  await airdrop.whitelist(WHITELIST);

  console.log('---');
  console.log(`- Test token: ${token.address}`);
  console.log(`- DixelAirdrop: ${airdrop.address}`);
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
// DixelAirdrpo
// npx hardhat verify --network bsctest 0x3f26B11B4edf1BfE37CD4c5ef280FA55e5aE9fF3 '0xD60122dBd23348C84EFeF00856384f93aBCe23FF'
// DixelArt
// npx hardhat verify --network bsctest 0x30Aa35A94017447c992E862b5041d98C9d5eDe0e
// Dixel, BaseToken, DixelArt
// npx hardhat verify --network bsctest 0x804A01766428126d03560529cd376d86a199c1D6 '0xD60122dBd23348C84EFeF00856384f93aBCe23FF' '0x30Aa35A94017447c992E862b5041d98C9d5eDe0e'
