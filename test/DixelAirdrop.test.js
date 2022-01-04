const { ether, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { MAX_UINT256 } = constants;
const { expect } = require("chai");

const DixelAirdrop = artifacts.require("DixelAirdrop");
const ERC20 = artifacts.require("ERC20PresetMinterPauser");

contract("DixelAirdrop", function(accounts) {
  const [ deployer, alice, bob, carol, dan ] = accounts;
  const WHITELIST = [
    [alice, ether("100"), ether("200")], // 10000 * 100 / 400 + 3000 * 200 / 800 = 3250
    [bob, ether("300"), ether("100")], // 10000 * 300 / 400 + 3000 * 100 / 800 = 7875
    [carol, ether("0"), ether("500")], // 0 + 3000 * 500 / 800 = 1875
  ];

  beforeEach(async function() {
    this.baseToken = await ERC20.new("Test Dixel", "TEST_PIXEL");
    await this.baseToken.mint(deployer, ether("13000"));

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
      expect(this.total.nftTotalContribution).to.be.bignumber.equal(ether("400"));
    });

    it("should set correct mintClubTotalContribution", async function() {
      expect(this.total.mintClubTotalContribution).to.be.bignumber.equal(ether("800"));
    });
  });

  it("should have tokens on the contract", async function() {
    expect(await this.baseToken.balanceOf(this.airdrop.address)).to.be.bignumber.equal(ether("13000"));
  });

  it("alice should have correct claimable amount", async function() {
    expect(await this.airdrop.airdropAmount({ from: alice })).to.be.bignumber.equal(ether("3250"));
  });

  it("alice should have no claimable amount because airdrop is not started yet", async function() {
    expect(await this.airdrop.claimableAmount({ from: alice })).to.be.bignumber.equal("0");
  });

  it("bob should have correct claimable amount", async function() {
    expect(await this.airdrop.airdropAmount({ from: bob })).to.be.bignumber.equal(ether("7875"));
  });

  it("carol should have correct claimable amount", async function() {
    expect(await this.airdrop.airdropAmount({ from: carol })).to.be.bignumber.equal(ether("1875"));
  });

  it("dan should have no claimable amount", async function() {
    expect(await this.airdrop.airdropAmount({ from: dan })).to.be.bignumber.equal("0");
    expect(await this.airdrop.claimableAmount({ from: dan })).to.be.bignumber.equal("0");
  });

  it("should return true on isWhiteList", async function() {
    expect(await this.airdrop.isWhiteList({ from: alice })).to.equal(true);
  });

  it("should return false on hasClaimed", async function() {
    expect(await this.airdrop.hasClaimed({ from: alice })).to.equal(false);
  });

  it("should prevent claim before starting", async function() {
    await expectRevert(
      this.airdrop.claim({ from: alice }),
      'AIRDROP_HAS_NOT_STARTED_OR_FINISHED'
    );
  });

  describe("claim", function() {
    beforeEach(async function() {
      await this.airdrop.startAirdrop();
      await this.airdrop.claim({ from: alice });
    });

    it("should return true on hasClaimed", async function() {
      expect(await this.airdrop.hasClaimed({ from: alice })).to.equal(true);
    });

    it("alice should have correct claimable amount", async function() {
      expect(await this.airdrop.airdropAmount({ from: alice })).to.be.bignumber.equal(ether("3250"));
      expect(await this.airdrop.claimableAmount({ from: alice })).to.be.bignumber.equal("0");
    });

    it("should increase alice's balance", async function() {
      expect(await this.baseToken.balanceOf(alice)).to.be.bignumber.equal(ether("3250"));
    });

    it("should decrease contract's balance", async function() {
      expect(await this.baseToken.balanceOf(this.airdrop.address)).to.be.bignumber.equal(ether("9750"));
    });

    it("should prevent claim again", async function() {
      await expectRevert(
        this.airdrop.claim({ from: alice }),
        'ALREADY_CLAIMED'
      );
    });

    it("should prevent claiming by non-whitelist users", async function() {
      await expectRevert(
        this.airdrop.claim({ from: dan }),
        'NOT_INCLUDED_IN_THE_WHITE_LIST'
      );
    });

    describe("close airdrop", function() {
      beforeEach(async function() {
        await this.airdrop.closeAirdrop();
      });

      it("should refund all left-over balance to the deployer", async function() {
        expect(await this.baseToken.balanceOf(this.airdrop.address)).to.be.bignumber.equal(ether("0"));
        expect(await this.baseToken.balanceOf(deployer)).to.be.bignumber.equal(ether("9750"));
      });

      it("bob should have correct claimable amount", async function() {
        expect(await this.airdrop.airdropAmount({ from: bob })).to.be.bignumber.equal(ether("7875"));
        expect(await this.airdrop.claimableAmount({ from: bob })).to.be.bignumber.equal("0");
      });

      it("should revert on claim", async function() {
        await expectRevert(
          this.airdrop.claim({ from: bob }),
          'AIRDROP_HAS_NOT_STARTED_OR_FINISHED'
        );
      });
    });
  });
});
