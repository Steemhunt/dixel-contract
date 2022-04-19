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

  console.log(` -> Test token is deployed at ${token.address}`);

  // MARK: - Deploy NFT contract
  const DixelArt = await hre.ethers.getContractFactory('DixelArt');
  const nft = await DixelArt.deploy(token.address);
  await nft.deployed();

  console.log(` -> DixelArt contract deployed at ${nft.address}`);

  // MARK: - Deploy contract
  const Dixel = await hre.ethers.getContractFactory('Dixel');
  const dixel = await Dixel.deploy(token.address, nft.address, 0); // TODO: Set genesis block
  await dixel.deployed();

  console.log(` -> Dixel contract deployed at ${dixel.address}`);

  await nft.transferOwnership(dixel.address);
  console.log(`   -> DixelArt contract ownership has changed`);

  const DixelTip = await hre.ethers.getContractFactory('DixelTip');
  const tip = await DixelTip.deploy(token.address, nft.address);
  await tip.deployed();

  console.log(` -> DixelTip contract: ${tip.address}`);

  console.log('---');
  console.log(`- Test token: ${token.address}`);
  console.log(`- DixelArt NFT: ${nft.address}`);
  console.log(`- Dixel contract: ${dixel.address}`);
  console.log(`- DixelTip contract: ${tip.address}`);

  console.log(`
    npx hardhat verify --network bsctest ${nft.address} '${token.address}'
    npx hardhat verify --network bsctest ${dixel.address} '${token.address}' '${nft.address}'
    npx hardhat verify --network bsctest ${tip.address} '${token.address}' '${nft.address}'
  `);
};

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });


// npx hardhat compile && HARDHAT_NETWORK=klaytntest node scripts/deploy-klaytn.js



