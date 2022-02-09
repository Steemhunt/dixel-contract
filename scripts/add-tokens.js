const hre = require("hardhat");
const { ether } = require("@openzeppelin/test-helpers");
const fs = require('fs');

async function main() {
  const testToken = await hre.ethers.getContractFactory('ERC20PresetMinterPauser');
  const contract = await testToken.attach('0x62c01AF8F8Ab997Acec06C3a71DC18594726ba24');
  await contract.mint('0x91Ec1d18ed7a3587B87066F0Ab1a641dCBb84e9E', '1000000000000000000000000');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

// HARDHAT_NETWORK=bsctest node scripts/add-tokens.js