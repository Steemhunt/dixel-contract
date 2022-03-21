const hre = require("hardhat");
const { ether } = require("@openzeppelin/test-helpers");

async function main() {
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0].address;
  console.log(`Deploy from account: ${deployer}`);


  // Testnet
  // const DIXEL_TOKEN_CONTRACT = '0x62c01AF8F8Ab997Acec06C3a71DC18594726ba24';
  // const DIXEL_ART_CONTRACT = '0x46cc5a12A3F58A837475C9BFe52C0C02274C0C0c';

  // Mainnet
  const DIXEL_TOKEN_CONTRACT = '0xA4CB7f8c6659576F50A893C18F28765018f34E12';
  const DIXEL_ART_CONTRACT = '0x9F2659b0D2baD4C1D57819df58787cDFd391E3dF';

  const DixelTip = await hre.ethers.getContractFactory('DixelTip');
  const tip = await DixelTip.deploy(DIXEL_TOKEN_CONTRACT, DIXEL_ART_CONTRACT);
  await tip.deployed();

  console.log('---');
  console.log(`- DixelTip contract: ${tip.address}`);

  console.log(`
    # To verify:
    npx hardhat verify --network bsctest ${tip.address} '${DIXEL_TOKEN_CONTRACT}' '${DIXEL_ART_CONTRACT}'
  `);
};

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });


// npx hardhat compile && HARDHAT_NETWORK=bsctest node scripts/deploy-tip.js
