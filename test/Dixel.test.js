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
    await this.baseToken.mint(bob, ether("200"));

    this.dixel = await Dixel.new(this.baseToken.address);
  });

  describe('admin features', function() {
    it('default owner should be the deployer', async function() {
      expect(await this.dixel.owner()).to.equal(deployer);
    });
  });

  describe('update', function() {
    it('should update a pixel', async function() {
      await this.dixel.updatePixel([1, 1, 16776960]); // #ffff00
      expect(await this.dixel.pixels(1,1)).to.be.bignumber.equal('16776960');
    });

    it('should update pixels', async function() {
      await this.dixel.updatePixels([[1, 1, 16711680], [2, 2, 65280]]); // #ff0000, #00ff00
      expect(await this.dixel.pixels(1,1)).to.be.bignumber.equal('16711680');
      expect(await this.dixel.pixels(2,2)).to.be.bignumber.equal('65280');
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
});
