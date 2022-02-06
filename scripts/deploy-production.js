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

  const dixelTokenAddress = '0xA4CB7f8c6659576F50A893C18F28765018f34E12';
  console.log(` -> DIXEL token address: ${dixelTokenAddress}`);

  // MARK: - Deploy NFT contract
  const DixelArt = await hre.ethers.getContractFactory('DixelArt');
  const nft = await DixelArt.deploy(dixelTokenAddress);
  await nft.deployed();
  console.log(` -> DixelArt contract deployed at ${nft.address}`);

  // const GENESIS_BLOCK = '14953381'; // Test launching: 2022-02-04 15:22 +0900
  const GENESIS_BLOCK = '15040000'; // Launching Target: 2022-02-07 15:00:48.878004 +0900

  // MARK: - Deploy contract
  const Dixel = await hre.ethers.getContractFactory('Dixel');
  const dixel = await Dixel.deploy(dixelTokenAddress, nft.address, GENESIS_BLOCK); // Target launching date
  await dixel.deployed();
  console.log(` -> Dixel contract deployed at ${dixel.address} / Genesis Block: ${GENESIS_BLOCK}`);

  await nft.transferOwnership(dixel.address);
  console.log(` -> DixelArt contract ownership has changed`);

  // MARK: - Deploy Airdrop contract
  const DixelAirdrop = await hre.ethers.getContractFactory('DixelAirdrop');
  const airdrop = await DixelAirdrop.deploy(dixelTokenAddress, GENESIS_BLOCK);
  await airdrop.deployed();
  console.log(` -> DixelAirdrop contract deployed at ${airdrop.address} / Genesis Block: ${GENESIS_BLOCK}`);
  console.log(`   -> TODO: Transfer DIXEL tokens to airdrop address`);
  // console.log(`   -> TODO: inject-airdrop-whitelist`);

  console.log('---');
  console.log(`- DIXEL token: ${dixelTokenAddress}`);
  console.log(`- DixelAirdrop: ${airdrop.address}`);
  console.log(`- DixelArt NFT: ${nft.address}`);
  console.log(`- Dixel contract: ${dixel.address}`);

  console.log(`
    npx hardhat verify --network bscmain ${airdrop.address} '${dixelTokenAddress}' '${GENESIS_BLOCK}'
    npx hardhat verify --network bscmain ${nft.address} '${dixelTokenAddress}'
    npx hardhat verify --network bscmain ${dixel.address} '${dixelTokenAddress}' '${nft.address}' '${GENESIS_BLOCK}'
  `);
};

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });


// npx hardhat compile && HARDHAT_NETWORK=bscmain node scripts/deploy-production.js


