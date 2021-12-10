const { ether, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { MAX_UINT256, ZERO_ADDRESS } = constants;
const { expect } = require('chai');

const Pixel = artifacts.require('Pixel');
const ERC20 = artifacts.require("ERC20PresetMinterPauser");

contract('Pixel', function(accounts) {
  const [ deployer, alice, bob ] = accounts;

  beforeEach(async function() {
    this.baseToken = await ERC20.new("Test Pixel", "TEST_PIXEL");
    await this.baseToken.mint(deployer, ether("10000"));
    await this.baseToken.mint(alice, ether("100"));
    await this.baseToken.mint(bob, ether("200"));

    this.pixel = await Pixel.new(this.baseToken.address);
  });

  describe('admin features', function() {
    it('default owner should be the deployer', async function() {
      expect(await this.pixel.owner()).to.equal(deployer);
    });
  });
});