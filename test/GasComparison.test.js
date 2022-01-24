const { ether, BN, constants } = require("@openzeppelin/test-helpers");
const { MAX_UINT256 } = constants;
const { expect } = require("chai");
const fs = require("fs");

const Dixel = artifacts.require("DixelMock");
const DixelArt = artifacts.require("DixelArt");
const ERC20 = artifacts.require("ERC20PresetMinterPauser");

const GENESIS_PRICE = ether("1");
const ALICE_BALANCE = ether("10000");

contract("GasComparison", function(accounts) {
  const [ deployer, alice ] = accounts;

  beforeEach(async function() {
    this.baseToken = await ERC20.new("Test Dixel", "TEST_PIXEL");
    await this.baseToken.mint(deployer, ether("10000"));
    await this.baseToken.mint(alice, ALICE_BALANCE);

    this.nft = await DixelArt.new(this.baseToken.address);
    this.dixel = await Dixel.new(this.baseToken.address, this.nft.address, 0);
    await this.nft.transferOwnership(this.dixel.address); // Set owner as Dixel contract, so it can mint new NFTs

    await this.baseToken.approve(this.dixel.address, MAX_UINT256, { from: alice });

    // Prepare params for updating all 256 pixels
    this.params = [];
    this.pixelColors = [];
    for (let x = 0; x < 16; x++) {
      this.pixelColors[x] = [];
      for (let y = 0; y < 16; y++) {
        this.params.push([x, y, x * y]);
        this.pixelColors[x].push(new BN(String(x * y)));
      }
    }
  });

  it("original", async function() {
    await this.dixel.updatePixelsOriginal(this.params, 0, { from: alice });
    const colors = await this.dixel.getPixelColors();

    expect(colors[5][5]).to.be.bignumber.equal(this.pixelColors[5][5]);
  });

  it("with no checks", async function() {
    await this.dixel.updatePixelsNoChecks(this.params, 0, { from: alice });
    const colors = await this.dixel.getPixelColors();

    expect(colors[5][5]).to.be.bignumber.equal(this.pixelColors[5][5]);
  });
});
