const hre = require("hardhat");
const { ether } = require("@openzeppelin/test-helpers");
const fs = require('fs');

async function main() {
  const testToken = await hre.ethers.getContractFactory('ERC20PresetMinterPauser');
  const contract = await testToken.attach('0xE8Aa938614F83Aa71B08e7f0085c71D01C3a3d77');
  await contract.mint('0xCDC4CC4244331125D1a550Ac76e8744397c1f458', '10000000000000000000000');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

// HARDHAT_NETWORK=klaytntest node scripts/add-tokens.js