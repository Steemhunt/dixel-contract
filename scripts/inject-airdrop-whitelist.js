const hre = require("hardhat");
const { ether } = require("@openzeppelin/test-helpers");
const fs = require('fs');

let data;

const load = function() {
  data = JSON.parse(fs.readFileSync(`${__dirname}/airdrop-whitelist.json`, 'utf-8'));
};

const save = function() {
  fs.writeFileSync(`${__dirname}/airdrop-whitelist.json`, JSON.stringify(data, null, 4));
}

async function main() {
  load();
  console.log(`Data loaded: ${data['total_bnb_spent']} BNB + ${data['total_mint_spent']} by ${data['total_users']} users`);

  const DixelAirdrop = await hre.ethers.getContractFactory("DixelAirdrop");
  const contract = await DixelAirdrop.attach('0x7Fcb48b7AF75E47af89B328f99B681aCa93A7d10'); // TODO: Change to production

  const uninjectedUsers = Object.keys(data['wallet_spent']).filter(k => !data['wallet_spent'][k]['whitelist_tx']);
  let batch = [];
  let batchCount = 0;
  for (const wallet of uninjectedUsers) {
    data['wallet_spent'][wallet]['whitelist_tx'] = 'pending';

    batch.push([
      wallet,
      String(ether(String(data['wallet_spent'][wallet]['dixel_amount'])))
    ]);
    batchCount++;

    if (batchCount % 800 === 0 || batchCount === uninjectedUsers.length) {
      save();

      console.log(`Inject ${batchCount} / ${uninjectedUsers.length} users`);

      const tx = await contract.whitelist(batch, { gasLimit: 29000000 });
      await tx.wait(1);

      console.log(`  -> tx: ${tx.hash}`);

      // Save TX data
      for (b of batch) {
        data['wallet_spent'][b[0]]['whitelist_tx'] = tx.hash;
      }
      save();

      batch = [];
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });


// HARDHAT_NETWORK=bsctest node scripts/inject-airdrop-whitelist.js