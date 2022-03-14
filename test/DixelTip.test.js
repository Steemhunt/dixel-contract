const { ether, BN, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { MAX_UINT256 } = constants;
const { expect } = require("chai");
const fs = require("fs");

const Dixel = artifacts.require("DixelMock");
const DixelArt = artifacts.require("DixelArt");
const DixelTip = artifacts.require("DixelTip");
const ERC20 = artifacts.require("ERC20PresetMinterPauser");

const GENESIS_PRICE = ether("1").div(new BN("1000")); // 0.001 DIXEL;

contract.only("DixelTip", function(accounts) {
  const [ deployer, alice ] = accounts;

  beforeEach(async function() {
    this.baseToken = await ERC20.new("Test Dixel", "TEST_PIXEL");
    await this.baseToken.mint(deployer, ether("10000"));
    await this.baseToken.mint(alice, ether("10000"));

    this.nft = await DixelArt.new(this.baseToken.address);
    this.dixel = await Dixel.new(this.baseToken.address, this.nft.address, 0);
    await this.nft.transferOwnership(this.dixel.address); // Set owner as Dixel contract, so it can mint new NFTs

    this.dixelTip = await DixelTip.new(this.baseToken.address, this.nft.address);
    await this.baseToken.approve(this.dixelTip.address, MAX_UINT256);

    // Create #0 dixel art edition - 90% (0.0018 DIXEL) should be refundable
    await this.baseToken.approve(this.dixel.address, MAX_UINT256);
    await this.dixel.updatePixels([[1, 1, 16711680], [2, 0, 65280]], 0); // #ff0000, #00ff00

    this.refundAmount = ether("1.8").div(new BN("1000"));
  });

  describe("initial states", function() {
    it("should have 0.0018 DIXEL reserved for refund", async function() {
      const history = await this.nft.history(0);
      expect(history.reserveForRefund).to.be.bignumber.equal(this.refundAmount);
    });

    it("should have 0.0018 DIXEL total burn value", async function() {
      expect(await this.dixelTip.totalBurnValue(0)).to.be.bignumber.equal(this.refundAmount);
    });
  });

  it("should revert on 0 DIXEL tip amount", async function() {
    await expectRevert(
      this.dixelTip.tip(0, 0),
      "TIP_AMOUNT_MUST_BE_POSITIVE"
    );
  });

  describe("tip on dixel art #0", function() {
    beforeEach(async function() {
      await this.dixelTip.tip(0, ether("5"));
    });

    it("should have 5 DIXEL tip amount", async function() {
      expect(await this.dixelTip.accumulatedTipAmount(0)).to.be.bignumber.equal(ether("5"));
    });

    it("should have 5.0018 DIXEL total burn value", async function() {
      expect(await this.dixelTip.totalBurnValue(0)).to.be.bignumber.equal(ether("5.0018"));
    });

    describe("burn and refund tips", function() {
      beforeEach(async function() {
        this.oldBalance = await this.baseToken.balanceOf(deployer);

        await this.nft.approve(this.dixelTip.address, 0);
        await this.dixelTip.burnAndRefundTips(0);
      });

      it("should burn the nft", async function() {
        expect(await this.nft.exists(0)).to.equal(false);
      });

      it("should refund total burn value", async function() {
        expect(await this.baseToken.balanceOf(deployer)).to.be.bignumber.equal(this.oldBalance.add(ether("5.0018")));
      });

      it("should have 0 total burn value", async function() {
        expect(await this.dixelTip.totalBurnValue(0)).to.be.bignumber.equal(new BN(0));
      });
    });

    describe("edge cases", function() {
      it("should revert without calling the contract approval", async function() {
        await expectRevert(
          this.dixelTip.burnAndRefundTips(0), // alice try
          'CONTRACT_IS_NOT_APPROVED'
        );
      });

      it("should revert on someone else try to call refund", async function() {
        await this.nft.approve(this.dixelTip.address, 0); // deployer approves

        await expectRevert(
          this.dixelTip.burnAndRefundTips(0, { from: alice }), // alice try
          'CALLER_IS_NOT_APPROVED'
        );
      });

      it("should revert on already burned nfts", async function() {
        await this.nft.approve(this.dixelTip.address, 0);
        await this.dixelTip.burnAndRefundTips(0);

        await expectRevert(
          this.dixelTip.burnAndRefundTips(0),
          'TOKEN_HAS_ALREADY_BURNED'
        );
      });
    }); // edge cases
  }); // tip on dixel art #0

  it("should revert burnAndRefundTips if no tips accumulated", async function() {
    await expectRevert(
      this.dixelTip.burnAndRefundTips(0),
      'NO_TIPS_JUST_USE_BURN_FUNCTION'
    );
  });
});
