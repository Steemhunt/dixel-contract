const hre = require("hardhat");
const { ether } = require("@openzeppelin/test-helpers");
const fs = require('fs');

async function main() {
  const testToken = await hre.ethers.getContractFactory('ERC20PresetMinterPauser');
  const contract = await testToken.attach('0x3F65bc9DB05d64F8355A18fB4eaCb49868C82568');
  await contract.mint('', '10000000000000000000000');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

// HARDHAT_NETWORK=klaytntest node scripts/add-tokens.js