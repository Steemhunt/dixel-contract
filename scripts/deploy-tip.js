const hre = require("hardhat");
const { ether } = require("@openzeppelin/test-helpers");

async function main() {
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0].address;
  console.log(`Deploy from account: ${deployer}`);


  // Testnet
  const DIXEL_TOKE_CONTRACT = '0x62c01AF8F8Ab997Acec06C3a71DC18594726ba24';
  const DIXEL_ART_CONTRACT = '0x46cc5a12A3F58A837475C9BFe52C0C02274C0C0c';

  // TODO: Mainnet

  const DixelTip = await hre.ethers.getContractFactory('DixelTip');
  const tip = await DixelTip.deploy(DIXEL_TOKE_CONTRACT, DIXEL_ART_CONTRACT);
  await tip.deployed();

  console.log('---');
  console.log(`- DixelTip contract: ${tip.address}`);

  console.log(`
    # To verify:
    npx hardhat verify --network bsctest ${tip.address} '${DIXEL_TOKE_CONTRACT}' '${DIXEL_ART_CONTRACT}'
  `);
};

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });


// npx hardhat compile && HARDHAT_NETWORK=bsctest node scripts/deploy-tip.js
