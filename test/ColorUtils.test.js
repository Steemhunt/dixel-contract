const { ether, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { MAX_UINT256, ZERO_ADDRESS } = constants;
const { expect } = require("chai");

const ColorUtils = artifacts.require("ColorUtilsMock");

contract("ColorUtils", function(accounts) {
  beforeEach(async function() {
    this.colorUtils = await ColorUtils.new();
  });

  it("Integer to string", async function() {
    expect(await this.colorUtils.uint2str(12345678)).to.equal("12345678");
  });

  it("Integer to hex", async function() {
    expect(await this.colorUtils.uint2hex("16776960")).to.equal("ffff00");
    expect(await this.colorUtils.uint2hex("16777215")).to.equal("ffffff");
    expect(await this.colorUtils.uint2hex("65280")).to.equal("00ff00");
    expect(await this.colorUtils.uint2hex("15")).to.equal("00000f");
  });

  it("Integer to hex - revert on overflow", async function() {
    await expectRevert(
      this.colorUtils.uint2hex("16777216"),
      "value out-of-bounds"
    );
  });
});
