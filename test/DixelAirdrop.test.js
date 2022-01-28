const { ether, constants, expectEvent, expectRevert, time } = require("@openzeppelin/test-helpers");
const { MAX_UINT256 } = constants;
const { expect } = require("chai");

const DixelAirdrop = artifacts.require("DixelAirdrop");
const ERC20 = artifacts.require("ERC20PresetMinterPauser");

contract("DixelAirdrop", function(accounts) {
  const [ deployer, alice, bob, carol, dan ] = accounts;
  const WHITELIST = [
    [alice, ether("100")], // 100
    [bob, ether("5")], // 5
    [carol, '10000000000000000'], // 0.01
  ];

  const INITIAL_BALANCE = ether("1000");

  beforeEach(async function() {
    this.genesisBlock = parseInt(await time.latestBlock()) + 10;
    this.baseToken = await ERC20.new("Test Dixel", "TEST_PIXEL");
    this.airdrop = await DixelAirdrop.new(this.baseToken.address, this.genesisBlock);

    await this.baseToken.mint(this.airdrop.address, INITIAL_BALANCE);
    await this.airdrop.whitelist(WHITELIST);
  });

  it("should have initial balance", async function() {
    expect(await this.baseToken.balanceOf(this.airdrop.address)).to.be.bignumber.equal(INITIAL_BALANCE);
  });

  it("alice should have correct airdrop amount", async function() {
    expect(await this.airdrop.airdropAmount(alice)).to.be.bignumber.equal(ether("100"));
  });

  it("bob should have correct airdrop amount", async function() {
    expect(await this.airdrop.airdropAmount(bob)).to.be.bignumber.equal(ether("5"));
  });

  it("carol should have correct airdrop amount", async function() {
    expect(await this.airdrop.airdropAmount(carol)).to.be.bignumber.equal(ether("0.01"));
  });

  it("dan should have no claimable amount", async function() {
    expect(await this.airdrop.airdropAmount(dan)).to.be.bignumber.equal("0");
  });

  it("everyone should have 0 claimable amount", async function() {
    expect(await this.airdrop.claimableAmount(alice)).to.be.bignumber.equal("0");
    expect(await this.airdrop.claimableAmount(bob)).to.be.bignumber.equal("0");
    expect(await this.airdrop.claimableAmount(carol)).to.be.bignumber.equal("0");
    expect(await this.airdrop.claimableAmount(dan)).to.be.bignumber.equal("0");
  });

  it("should return true on isWhiteList", async function() {
    expect(await this.airdrop.isWhiteList(alice)).to.equal(true);
  });

  it("should return false on hasClaimed", async function() {
    expect(await this.airdrop.hasClaimed(alice)).to.equal(false);
  });

  it("should return false on isWhiteList", async function() {
    expect(await this.airdrop.isWhiteList(dan)).to.equal(false);
  });

  it("should return false on hasClaimed", async function() {
    expect(await this.airdrop.hasClaimed(dan)).to.equal(false);
  });

  it("should prevent claim before starting", async function() {
    await expectRevert(
      this.airdrop.claim({ from: alice }),
      'AIRDROP_NOT_STARTED_YET'
    );
  });

  describe("claim", function() {
    beforeEach(async function() {
      const latestBlock = parseInt(await time.latestBlock());
      if (latestBlock < this.genesisBlock) {
        // console.log(`Latest block: ${latestBlock} -> Genesis block: ${this.genesisBlock}`);
        await time.advanceBlockTo(this.genesisBlock);
      }
    });

    it("alice should have correct claimable amount", async function() {
      expect(await this.airdrop.airdropAmount(alice)).to.be.bignumber.equal(ether("100"));
      expect(await this.airdrop.claimableAmount(alice)).to.be.bignumber.equal(ether("100"));
    });

    it("bob should have correct claimable amount", async function() {
      expect(await this.airdrop.airdropAmount(bob)).to.be.bignumber.equal(ether("5"));
      expect(await this.airdrop.claimableAmount(bob)).to.be.bignumber.equal(ether("5"));
    });

    it("should prevent claiming by non-whitelist users", async function() {
      await expectRevert(
        this.airdrop.claim({ from: dan }),
        'NOTHING_TO_CLAIM'
      );
    });

    describe("after claim", function() {
       beforeEach(async function() {
         await this.airdrop.claim({ from: alice });
       });

      it("should return true on hasClaimed", async function() {
        expect(await this.airdrop.hasClaimed(alice)).to.equal(true);
      });

      it("alice should have correct claimable amount", async function() {
        expect(await this.airdrop.airdropAmount(alice)).to.be.bignumber.equal(ether("100"));
        expect(await this.airdrop.claimableAmount(alice)).to.be.bignumber.equal("0");
      });

      it("should increase alice's balance", async function() {
        expect(await this.baseToken.balanceOf(alice)).to.be.bignumber.equal(ether("100"));
      });

      it("should decrease contract's balance", async function() {
        expect(await this.baseToken.balanceOf(this.airdrop.address)).to.be.bignumber.equal(INITIAL_BALANCE.sub(ether("100")));
      });

      it("should prevent claim again", async function() {
        await expectRevert(
          this.airdrop.claim({ from: alice }),
          'NOTHING_TO_CLAIM'
        );
      });

      describe("close airdrop", function() {
        beforeEach(async function() {
          await this.airdrop.closeAirdrop();
        });

        it("should refund all left-over balance to the deployer", async function() {
          expect(await this.baseToken.balanceOf(this.airdrop.address)).to.be.bignumber.equal(ether("0"));
          expect(await this.baseToken.balanceOf(deployer)).to.be.bignumber.equal(INITIAL_BALANCE.sub(ether("100")));
        });

        it("bob should have correct claimable amount", async function() {
          expect(await this.airdrop.airdropAmount(bob)).to.be.bignumber.equal(ether("5"));
          expect(await this.airdrop.claimableAmount(bob)).to.be.bignumber.equal("0");
        });

        it("should revert on claim", async function() {
          await expectRevert(
            this.airdrop.claim({ from: bob }),
            'AIRDROP_ALREADY_CLOSED'
          );
        });
      }); // close airdrop
    }); // after claim
  }); // claim
});
