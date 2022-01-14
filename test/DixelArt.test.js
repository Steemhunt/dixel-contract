const { ether, BN, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { MAX_UINT256 } = constants;
const { expect } = require("chai");
const fs = require("fs");

const Dixel = artifacts.require("DixelMock");
const DixelArt = artifacts.require("DixelArt");
const ERC20 = artifacts.require("ERC20PresetMinterPauser");

const GENESIS_PRICE = ether("1");
const ALICE_BALANCE = ether("100");

contract("DixelArt", function(accounts) {
  const [ deployer, alice, bob, carol ] = accounts;

  beforeEach(async function() {
    this.baseToken = await ERC20.new("Test Dixel", "TEST_PIXEL");
    await this.baseToken.mint(deployer, ether("10000"));
    await this.baseToken.mint(alice, ALICE_BALANCE);

    this.nft = await DixelArt.new(this.baseToken.address);
    this.dixel = await Dixel.new(this.baseToken.address, this.nft.address);
    await this.nft.transferOwnership(this.dixel.address); // Set owner as Dixel contract, so it can mint new NFTs
  });

  describe("generate SVG", function() {
    beforeEach(async function() {
      await this.baseToken.approve(this.dixel.address, MAX_UINT256, { from: alice });
      await this.dixel.updatePixels([[1, 1, 16711680], [2, 0, 65280]], 0, { from: alice }); // #ff0000, #00ff00
    });

    it("should generate SVG correctly", async function() {
      const testSVG = fs.readFileSync(`${__dirname}/fixtures/test-image.svg`, 'utf8');
      expect(await this.dixel.generateSVG()).to.equal(testSVG);
    });

    it("should encode SVG into Base64 correctly", async function() {
      const testBase64 = fs.readFileSync(`${__dirname}/fixtures/test-image-base64.txt`, 'utf8');
      expect(await this.dixel.generateBase64SVG()).to.equal(testBase64);
    });
  });

  describe("generate NFT", function() {
    beforeEach(async function() {
      await this.baseToken.approve(this.dixel.address, MAX_UINT256, { from: alice });
      this.receipt = await this.dixel.updatePixels([[1, 1, 16711680], [2, 0, 65280]], 0, { from: alice }); // #ff0000, #00ff00

      this.cost = GENESIS_PRICE.mul(new BN("2"));
      this.reserveForRefund = this.cost.mul(new BN("9")).div(new BN("10"));
    });

    it("should increase total supply", async function() {
      expect(await this.nft.totalSupply()).to.be.bignumber.equal("1");
    });

    it("should increase nextTokenId", async function() {
      expect(await this.nft.nextTokenId()).to.be.bignumber.equal("1");
    });

    it("outputs last pixel status correctly", async function() {
      const history = await this.nft.history(0);
      expect(history.updatedPixelCount).to.be.bignumber.equal("2");
      expect(history.reserveForRefund).to.be.bignumber.equal(this.reserveForRefund);
    });

    it("outputs all last pixels from history 0", async function() {
      const pixels = await this.nft.getPixelsFor(0);

      expect(pixels[1][1]).to.be.bignumber.equal("16711680");
      expect(pixels[2][0]).to.be.bignumber.equal("65280");
      expect(pixels[2][2]).to.be.bignumber.equal("0");
    });

    it("alice should have the nft balance", async function() {
      expect(await this.nft.balanceOf(alice)).to.be.bignumber.equal("1");
    });

    it("alice should be the owner of the NFT", async function() {
      expect(await this.nft.ownerOf(0)).to.equal(alice);
    });

    it("should outputs the SVG correctly", async function() {
      const testSVG = fs.readFileSync(`${__dirname}/fixtures/test-image.svg`, "utf8");
      expect(await this.nft.generateSVG(0)).to.equal(testSVG);
    });

    it("should outputs the SVG into Base64 correctly", async function() {
      const testBase64 = fs.readFileSync(`${__dirname}/fixtures/test-image-base64.txt`, "utf8");
      expect(await this.nft.generateBase64SVG(0)).to.equal(testBase64);
    });

    it("should generate tokenURI in JSON format", async function() {
      const testJSON = fs.readFileSync(`${__dirname}/fixtures/test-json.json`, "utf8");
      expect(await this.nft.generateJSON(0)).to.equal(testJSON);
    });

    it("should revert tokenURI in JSON format generation if tokenId has not been minted yet", async function() {
      const nextTokenId = await this.nft.nextTokenId();

      await expectRevert(
          this.nft.generateJSON(nextTokenId),
          'CANNOT_GENERATE_JSON_FOR_NOT_MINTED_TOKEN'
      );
    });

    it("should outputs tokenURI correctly", async function() {
      const testJSONBase64 = fs.readFileSync(`${__dirname}/fixtures/test-json-base64.txt`, "utf8");
      expect(await this.nft.tokenURI(0)).to.equal(testJSONBase64);
    });

    describe("burn", function() {
      beforeEach(async function() {
        this.receipt = await this.nft.burn(0, { from: alice });
      });

      it("should change the status to burned", async function() {
        expect((await this.nft.history(0)).burned).to.equal(true);
      });

      it("should refund 90% of total cost on burning", async function() {
        expect(await this.baseToken.balanceOf(alice)).to.be.bignumber.equal(
          ALICE_BALANCE.sub(this.cost).add(this.reserveForRefund)
        );
      });

      it("should emit Burn event", async function() {
        expectEvent(this.receipt, "Burn", {
          player: alice,
          tokenId: '0',
          refundAmount: this.reserveForRefund
        });
      });

      it("should destroy the token", async function() {
        expect((await this.nft.exists(0))).to.equal(false);
      });

      it("should decrease the total supply", async function() {
        expect(await this.nft.totalSupply()).to.be.bignumber.equal("0");
      });

      it("should leave nextTokenId to the same", async function() {
        expect(await this.nft.nextTokenId()).to.be.bignumber.equal("1");
      });
    }); // burn
  }); // generate NFT
});
