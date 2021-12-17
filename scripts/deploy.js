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
  const token = await testToken.deploy('Test Dixel', 'TEST_DX');
  await token.deployed();
  await token.mint(deployer, '10000000000000000000000'); // 10,000 tokens

  console.log(`Test token is deployed at ${token.address}`);

  // MARK: - Deploy contract
  const Dixel = await hre.ethers.getContractFactory('Dixel');
  const dixel = await Dixel.deploy(token.address);
  await dixel.deployed();

  console.log('---');
  console.log(`- Test token: ${token.address}`);
  console.log(`- Dixel contract: ${dixel.address}`);
};

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

// npx hardhat compile && HARDHAT_NETWORK=bsctest node scripts/deploy.js
// npx hardhat verify --network bsctest 0xfF202bfD9fd0E5817e7236215B4589b203a3Fcd7 '0x29F750BD6854B43CB1eeF857452ddC29B9c6C5B5'