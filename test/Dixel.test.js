const { ether, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { MAX_UINT256, ZERO_ADDRESS } = constants;
const { expect } = require('chai');

const Dixel = artifacts.require('Dixel');
const ERC20 = artifacts.require("ERC20PresetMinterPauser");

contract('Dixel', function(accounts) {
  const [ deployer, alice, bob ] = accounts;

  beforeEach(async function() {
    this.baseToken = await ERC20.new("Test Dixel", "TEST_PIXEL");
    await this.baseToken.mint(deployer, ether("10000"));
    await this.baseToken.mint(alice, ether("100"));
    await this.baseToken.mint(bob, ether("100"));

    this.dixel = await Dixel.new(this.baseToken.address);
  });

  describe('admin features', function() {
    it('default owner should be the deployer', async function() {
      expect(await this.dixel.owner()).to.equal(deployer);
    });
  });

  describe('utility functions', function() {
    it('Integer to hex', async function() {
      expect(await this.dixel.int2hex('16776960')).to.equal('ffff00');
      expect(await this.dixel.int2hex('16777215')).to.equal('ffffff');
      expect(await this.dixel.int2hex('65280')).to.equal('00ff00');
      expect(await this.dixel.int2hex('15')).to.equal('00000f');
    });

    it('Integer to hex - revert on overflow', async function() {
      await expectRevert(
        this.dixel.int2hex('16777216'),
        'value out-of-bounds'
      );
    });
  });

  describe('update', function() {
    beforeEach(async function() {
      await this.baseToken.approve(this.dixel.address, MAX_UINT256, { from: alice });
      await this.dixel.updatePixels([[1, 1, 16711680], [2, 2, 65280]], { from: alice }); // #ff0000, #00ff00

      this.pixel1 = await this.dixel.pixels(1, 1);
      this.pixel2 = await this.dixel.pixels(2, 2);
      this.alicePlayer = await this.dixel.players(alice);
    });

    it('should update pixel colors', async function() {
      expect(this.pixel1.color).to.be.bignumber.equal('16711680');
      expect(this.pixel2.color).to.be.bignumber.equal('65280');
    });

    it('should update owner of pixels', async function() {
      expect(this.pixel1.owner).to.be.bignumber.equal(this.alicePlayer.id);
      expect(this.pixel2.owner).to.be.bignumber.equal(this.alicePlayer.id);
    });

    it("should increase pixels' price", async function() {
      expect(this.pixel1.price).to.be.bignumber.equal(ether('1.05'));
      expect(this.pixel2.price).to.be.bignumber.equal(ether('1.05'));
    });

    it("should transfer tokens from alice", async function() {
      expect(await this.baseToken.balanceOf(alice)).to.be.bignumber.equal(ether('97.9'));
    });

    it("should transfer tokens to the contract", async function() {
      expect(await this.baseToken.balanceOf(this.dixel.address)).to.be.bignumber.equal(ether('2.1'));
    });

    it("should update original owner's pending rewards", async function() {
      const originalOwner = await this.dixel.players(this.baseToken.address);
      expect(originalOwner.pendingReward).to.be.bignumber.equal(ether('2.1'));
    });


    describe('update again', function() {
      beforeEach(async function() {
        await this.baseToken.approve(this.dixel.address, MAX_UINT256, { from: bob });
        await this.dixel.updatePixels([[1, 1, 255]], { from: bob }); // #0000ff

        this.pixel1 = await this.dixel.pixels(1, 1);
        this.bobPlayer = await this.dixel.players(bob);
      });

      it('should update pixel colors', async function() {
        expect(this.pixel1.color).to.be.bignumber.equal('255');
      });

      it('should update owner of pixels', async function() {
        expect(this.pixel1.owner).to.be.bignumber.equal(this.bobPlayer.id);
      });

      it("should increase pixels' price", async function() {
        expect(this.pixel1.price).to.be.bignumber.equal(ether('1.1025'));
      });

      it("should transfer tokens from bob", async function() {
        expect(await this.baseToken.balanceOf(bob)).to.be.bignumber.equal(ether('98.8975'));
      });

      it("should transfer tokens to the contract", async function() {
        expect(await this.baseToken.balanceOf(this.dixel.address)).to.be.bignumber.equal(ether('3.2025'));
      });

      it("should update original owner's pending rewards", async function() {
        const originalOwner = await this.dixel.players(alice);
        expect(originalOwner.pendingReward).to.be.bignumber.equal(ether('1.1025'));
      });

      it("should let alice to claim rewards", async function() {
        await this.dixel.claimReward({ from: alice });
        expect(await this.baseToken.balanceOf(alice)).to.be.bignumber.equal(ether('99.0025')); // 97.9 + 1.1025
      });
    });
  });

});
