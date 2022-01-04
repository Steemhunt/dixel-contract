const { ether, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { MAX_UINT256 } = constants;
const { expect } = require("chai");

const DixelAirdrop = artifacts.require("DixelAirdrop");
const ERC20 = artifacts.require("ERC20PresetMinterPauser");

contract("DixelAirdrop", function(accounts) {
  const [ deployer, alice, bob, carol ] = accounts;
  const WHITELIST = [
    [alice, ether("100"), ether("200")], // 10000 * 100 / 400 + 3000 * 200 / 800 = 3250
    [bob, ether("300"), ether("100")], // 10000 * 300 / 400 + 3000 * 100 / 800 = 7875
    [carol, ether("0"), ether("500")], // 0 + 3000 * 500 / 800 = 1875
  ];

  beforeEach(async function() {
    this.baseToken = await ERC20.new("Test Dixel", "TEST_PIXEL");
    await this.baseToken.mint(deployer, ether("20000"));

    this.airdrop = await DixelAirdrop.new(this.baseToken.address);

    await this.baseToken.approve(this.airdrop.address, MAX_UINT256);

    await this.airdrop.addTokens(1, ether("10000"));
    await this.airdrop.addTokens(2, ether("3000"));

    await this.airdrop.whitelist(WHITELIST);
  });

  describe("initial state", function() {
    beforeEach(async function() {
      this.total = await this.airdrop.total();
    });

    it("should set correct nftTotalAmount", async function() {
      expect(this.total.nftTotalAmount).to.be.bignumber.equal(ether("10000"));
    });

    it("should set correct mintClubTotalAmount", async function() {
      expect(this.total.mintClubTotalAmount).to.be.bignumber.equal(ether("3000"));
    });

    it("should set correct nftTotalAmount", async function() {
      expect(this.total.whiteListCount).to.be.bignumber.equal("3");
    });

    it("should set correct nftTotalContribution", async function() {
      expect(this.total.nftTotalContribution).to.be.bignumber.equal(ether("300"));
    });

    it("should set correct mintClubTotalContribution", async function() {
      expect(this.total.mintClubTotalContribution).to.be.bignumber.equal(ether("800"));
    });
  });

  it("should have tokens on the contract", async function() {
    expect(await this.baseToken.balanceOf(this.airdrop.address)).to.be.bignumber.equal(ether("13000"));
  });

  it("alice should have correct claimable amount", async function() {
    // expect(await this.airdrop. ).to.be.bignumber.equal(ether("800"));
  });

});
