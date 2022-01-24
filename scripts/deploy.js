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

  console.log(` -> Test token is deployed at ${token.address}`);

  const TestTokenFaucet = await hre.ethers.getContractFactory('TestTokenFaucet');
  const faucet = await TestTokenFaucet.deploy(token.address);
  await faucet.deployed();
  await token.mint(faucet.address, '1000000000000000000000000'); // 1M tokens

  console.log(` -> TestTokenFaucet contract deployed at ${faucet.address}`);

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
  console.log(` -> DixelArt contract ownership has changed`);

  // MARK: - Deploy Airdrop contract
  const DixelAirdrop = await hre.ethers.getContractFactory('DixelAirdrop');
  const airdrop = await DixelAirdrop.deploy(token.address);
  await airdrop.deployed();

  console.log(` -> DixelAirdrop contract deployed at ${airdrop.address}`);

  await token.approve(airdrop.address, "999999999999999999999999999999999999999999999999");
  await airdrop.addTokens(1, "10000000000000000000000", { gasLimit: 100000 });
  await airdrop.addTokens(2, "3000000000000000000000", { gasLimit: 100000 });

  console.log(` -> Airdrop tokens are added`)

  // Add whitelist (only for testnet)
  // const WHITELIST = [
  //   ['0x32A935f79ce498aeFF77Acd2F7f35B3aAbC31a2D', '100000000000000000000', '200000000000000000000'],
  //   ['0x91Ec1d18ed7a3587B87066F0Ab1a641dCBb84e9E', '300000000000000000000', '100000000000000000000'],
  //   ['0xF6B02237E1EEe17EdC0c0733182929999e5B2b79', '0', '500000000000000000000'],
  // ];
  // await airdrop.whitelist(WHITELIST, { gasLimit: 1000000 });

  console.log('---');
  console.log(`- Test token: ${token.address}`);
  console.log(`- TestTokenFaucet: ${faucet.address}`);
  console.log(`- DixelAirdrop: ${airdrop.address}`);
  console.log(`- DixelArt NFT: ${nft.address}`);
  console.log(`- Dixel contract: ${dixel.address}`);

  console.log(`
    npx hardhat verify --network bsctest ${faucet.address} '${token.address}'
    npx hardhat verify --network bsctest ${airdrop.address} '${token.address}'
    npx hardhat verify --network bsctest ${nft.address} '${token.address}'
    npx hardhat verify --network bsctest ${dixel.address} '${token.address}' '${nft.address}'
  `);
};

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });


// npx hardhat compile && HARDHAT_NETWORK=bsctest node scripts/deploy.js



