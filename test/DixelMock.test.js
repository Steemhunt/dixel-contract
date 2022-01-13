const { ether, BN, constants } = require("@openzeppelin/test-helpers");
const { MAX_UINT256 } = constants;
const { expect } = require("chai");
const fs = require("fs");

const Dixel = artifacts.require("DixelMock");
const DixelArt = artifacts.require("DixelArt");
const ERC20 = artifacts.require("ERC20PresetMinterPauser");

const GENESIS_PRICE = ether("1");
const ALICE_BALANCE = ether("100");

contract("DixelMock", function(accounts) {
  const [ deployer, alice, bob, carol ] = accounts;

  beforeEach(async function() {
    this.baseToken = await ERC20.new("Test Dixel", "TEST_PIXEL");
    await this.baseToken.mint(deployer, ether("10000"));
    await this.baseToken.mint(alice, ALICE_BALANCE);

    this.nft = await DixelArt.new(this.baseToken.address);
    this.dixel = await Dixel.new(this.baseToken.address, this.nft.address);
    await this.nft.transferOwnership(this.dixel.address); // Set owner as Dixel contract, so it can mint new NFTs
  });

  describe("update", function() {
    beforeEach(async function() {
      await this.baseToken.approve(this.dixel.address, MAX_UINT256, { from: alice });
    });

    it("should update pixel colors", async function() {

      this.receipt = await this.dixel.updatePixels([[1, 1, 16711680], [2, 0, 65280]], 0, { from: alice }); // #ff0000, #00ff00
      // expect(this.pixel1.color).to.be.bignumber.equal("16711680");
      // expect(this.pixel2.color).to.be.bignumber.equal("65280");
    });
  }); // update
});
