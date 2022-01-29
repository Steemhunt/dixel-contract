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

  // MARK: - Production testing
  const WHITELIST = [
    ['0x32A935f79ce498aeFF77Acd2F7f35B3aAbC31a2D', '10000000000000000000'], // 10 DIXEL tokens each
    ['0x91Ec1d18ed7a3587B87066F0Ab1a641dCBb84e9E', '10000000000000000000'],
    ['0xF6B02237E1EEe17EdC0c0733182929999e5B2b79', '10000000000000000000'],
  ];
  await airdrop.whitelist(WHITELIST, { gasLimit: 1000000 });


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


