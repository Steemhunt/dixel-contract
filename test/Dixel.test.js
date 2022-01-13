const { ether, BN, constants, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { MAX_UINT256 } = constants;
const { expect } = require("chai");
const fs = require("fs");

const Dixel = artifacts.require("DixelMock");
const DixelArt = artifacts.require("DixelArt");
const ERC20 = artifacts.require("ERC20PresetMinterPauser");

const GENESIS_PRICE = ether("1");
const ALICE_BALANCE = ether("100");
const BOB_BALANCE = ether("200");
const CAROL_BALANCE = ether("300");

function increasedPrice(bn) {
  return bn.mul(new BN("105")).div(new BN("100"));
}

function nftCut(bn) {
  return bn.mul(new BN("9")).div(new BN("10"));
}

function rewardCut(bn) {
  return bn.mul(new BN("1")).div(new BN("10"));
}


contract("Dixel", function(accounts) {
  const [ deployer, alice, bob, carol ] = accounts;

  beforeEach(async function() {
    this.baseToken = await ERC20.new("Test Dixel", "TEST_PIXEL");
    await this.baseToken.mint(deployer, ether("10000"));
    await this.baseToken.mint(alice, ALICE_BALANCE);

    this.nft = await DixelArt.new(this.baseToken.address);
    this.dixel = await Dixel.new(this.baseToken.address, this.nft.address);
    await this.nft.transferOwnership(this.dixel.address); // Set owner as Dixel contract, so it can mint new NFTs
  });

  describe("admin features", function() {
    it("default owner should be the deployer", async function() {
      expect(await this.dixel.owner()).to.equal(deployer);
    });
  });

  describe("update", function() {
    beforeEach(async function() {
      await this.baseToken.approve(this.dixel.address, MAX_UINT256, { from: alice });
      this.receipt = await this.dixel.updatePixels([[1, 1, 16711680], [2, 0, 65280]], 0, { from: alice }); // #ff0000, #00ff00

      this.pixel1 = await this.dixel.pixels(1, 1);
      this.pixel2 = await this.dixel.pixels(2, 0);
      this.alicePlayer = await this.dixel.players(alice);

      this.cost = GENESIS_PRICE.mul(new BN("2"));
    });

    it("should update pixel colors", async function() {
      expect(this.pixel1.color).to.be.bignumber.equal("16711680");
      expect(this.pixel2.color).to.be.bignumber.equal("65280");
    });

    it("should revert with INVALID_PIXEL_PARAMS if params are not sorted", async function() {
      await expectRevert(
          this.dixel.updatePixels([[3, 3, 255], [2, 3, 255]], 1, { from: alice }),
         'INVALID_PIXEL_PARAMS'
      );
    });

    it("should revert with INVALID_PIXEL_PARAMS if there is a duplicated parameter", async function() {
      await expectRevert(
          this.dixel.updatePixels([[3, 3, 255], [3, 3, 255]], 1, { from: alice }),
         'INVALID_PIXEL_PARAMS'
      );
    });

    it("should revert with NFT_EDITION_NUMBER_MISMATCHED if edition number is smaller", async function() {
      await expectRevert(
          this.dixel.updatePixels([[3, 3, 255]], 0, { from: alice }),
         'NFT_EDITION_NUMBER_MISMATCHED'
      );
    });

    it("should revert with NFT_EDITION_NUMBER_MISMATCHED if edition number is larger", async function() {
      await expectRevert(
          this.dixel.updatePixels([[3, 3, 255]], 2, { from: alice }),
         'NFT_EDITION_NUMBER_MISMATCHED'
      );
    });

    it("should update owner of pixels", async function() {
      expect(this.pixel1.owner).to.be.bignumber.equal(this.alicePlayer.id);
      expect(this.pixel2.owner).to.be.bignumber.equal(this.alicePlayer.id);
    });

    it("should add alice into playerWallets", async function() {
      expect(await this.dixel.playerWallets(this.alicePlayer.id)).to.be.bignumber.equal(alice);
    });

    it("should transfer tokens from alice", async function() {
      expect(await this.baseToken.balanceOf(alice)).to.be.bignumber.equal(ALICE_BALANCE.sub(this.cost));
    });

    it("should transfer 90% of DIXEL tokens to the NFT contract for refund reserve", async function() {
      expect(await this.baseToken.balanceOf(this.nft.address)).to.be.bignumber.equal(this.cost.mul(new BN("9")).div(new BN("10")));
    });

    it("should transfer 10% of DIXEL tokens to the Dixel contract for reward", async function() {
      expect(await this.baseToken.balanceOf(this.dixel.address)).to.be.bignumber.equal(this.cost.mul(new BN("1")).div(new BN("10")));
    });

    it("should increase pixels prices", async function() {
      expect(this.pixel1.price).to.be.bignumber.equal(increasedPrice(GENESIS_PRICE));
      expect(this.pixel2.price).to.be.bignumber.equal(increasedPrice(GENESIS_PRICE));
    });

    it("should have 1 player count", async function() {
      expect(await this.dixel.totalPlayerCount()).to.be.bignumber.equal("1");
    });

    it("should emit UpdatePixels event", async function() {
      expectEvent(this.receipt, "UpdatePixels", {
        player: alice,
        pixelCount: '2',
        totalPrice: this.cost
      });
    });

    it("should have 0 claimable reward (first reward should be permanently locked)", async function() {
      expect(await this.dixel.claimableReward(alice)).to.be.bignumber.equal("0");
    });

    it("should revert on ClaimReward", async function() {
      await expectRevert(
         this.dixel.claimReward({ from: alice }),
         'NOTHING_TO_CLAIM'
      );
    });

    describe("update again by bob", function() {
      beforeEach(async function() {
        await this.baseToken.mint(bob, BOB_BALANCE);
        await this.baseToken.approve(this.dixel.address, MAX_UINT256, { from: bob });
        this.receipt2 = await this.dixel.updatePixels([[1, 1, 255]], 1, { from: bob }); // #0000ff

        this.pixel1 = await this.dixel.pixels(1, 1);
        this.bobPlayer = await this.dixel.players(bob);

        this.cost2 = increasedPrice(GENESIS_PRICE);
      });

      it("should update pixel colors", async function() {
        expect(this.pixel1.color).to.be.bignumber.equal("255");
      });

      it("should update owner of pixels", async function() {
        expect(this.pixel1.owner).to.be.bignumber.equal(this.bobPlayer.id);
      });

      it("should transfer tokens from bob", async function() {
        expect(await this.baseToken.balanceOf(bob)).to.be.bignumber.equal(BOB_BALANCE.sub(this.cost2));
      });

      it("should increase pixels' price", async function() {
        expect(this.pixel1.price).to.be.bignumber.equal(increasedPrice(this.cost2));
      });

      it("should transfer 90% of DIXEL tokens to the NFT contract for refund reserve", async function() {
        expect(await this.baseToken.balanceOf(this.nft.address)).to.be.bignumber.equal(nftCut(this.cost.add(this.cost2)));
      });

      it("should transfer 10% of DIXEL tokens to the Dixel contract for reward", async function() {
        expect(await this.baseToken.balanceOf(this.dixel.address)).to.be.bignumber.equal(rewardCut(this.cost.add(this.cost2)));
      });

      it("should emit UpdatePixels event", async function() {
        expectEvent(this.receipt2, "UpdatePixels", {
          player: bob,
          pixelCount: '1',
          totalPrice: this.cost2
        });
      });

      it("should have 2 player count", async function() {
        expect(await this.dixel.totalPlayerCount()).to.be.bignumber.equal("2");
      });

      it("alice should have 10% of bob's cost as claimable reward", async function() {
        expect(await this.dixel.claimableReward(alice)).to.be.bignumber.equal(rewardCut(this.cost2));
      });

      describe("alice claim", function() {
        beforeEach(async function() {
          this.claimReceipt = await this.dixel.claimReward({ from: alice });
        });

        it("should claim the reward correctly", async function() {
          expect(await this.baseToken.balanceOf(alice)).to.be.bignumber.equal(ALICE_BALANCE.sub(this.cost).add(rewardCut(this.cost2)));
        });

        it("should emit ClaimReward event", async function() {
          expectEvent(this.claimReceipt, "ClaimReward", {
            player: alice,
            rewardAmount: rewardCut(this.cost2)
          });
        });
      });

      it("bob should have 0 claimable reward", async function() {
        expect(await this.dixel.claimableReward(bob)).to.be.bignumber.equal("0");
      });

      it("should revert on bob's ClaimReward", async function() {
        await expectRevert(
           this.dixel.claimReward({ from: bob }),
           'NOTHING_TO_CLAIM'
        );
      });

      describe("update again by carol", function() {
        beforeEach(async function() {
          await this.baseToken.mint(carol, CAROL_BALANCE);
          await this.baseToken.approve(this.dixel.address, MAX_UINT256, { from: carol });
          this.receipt3 = await this.dixel.updatePixels([[1, 1, 15658734]], 2, { from: carol }); // #eeeeee

          this.pixel1 = await this.dixel.pixels(1, 1);
          this.carolPlayer = await this.dixel.players(carol);

          this.cost3 = increasedPrice(this.cost2);
        });

        it("should update pixel colors", async function() {
          expect(this.pixel1.color).to.be.bignumber.equal("15658734");
        });

        it("should update owner of pixels", async function() {
          expect(this.pixel1.owner).to.be.bignumber.equal(this.carolPlayer.id);
        });

        it("should transfer tokens from carol", async function() {
          expect(await this.baseToken.balanceOf(carol)).to.be.bignumber.equal(CAROL_BALANCE.sub(this.cost3));
        });

        it("should increase pixels' price", async function() {
          expect(this.pixel1.price).to.be.bignumber.equal(increasedPrice(this.cost3));
        });

        it("should transfer 90% of DIXEL tokens to the NFT contract for refund reserve", async function() {
          expect(await this.baseToken.balanceOf(this.nft.address)).to.be.bignumber.equal(
            nftCut(this.cost.add(this.cost2.add(this.cost3)))
          );
        });

        it("should transfer 10% of DIXEL tokens to the Dixel contract for reward", async function() {
          expect(await this.baseToken.balanceOf(this.dixel.address)).to.be.bignumber.equal(
            rewardCut(this.cost.add(this.cost2.add(this.cost3)))
          );
        });

        it("should emit UpdatePixels event", async function() {
          expectEvent(this.receipt3, "UpdatePixels", {
            player: carol,
            pixelCount: '1',
            totalPrice: this.cost3
          });
        });

        it("should have 3 player count", async function() {
          expect(await this.dixel.totalPlayerCount()).to.be.bignumber.equal("3");
        });

        it("alice's reward = 100% of bob's + 2/3 of carols", async function() {
          expect(await this.dixel.claimableReward(alice)).to.be.bignumber.equal(
            rewardCut(this.cost2).add(rewardCut(this.cost3).mul(new BN("2")).div(new BN("3")))
          );
        });

        describe("alice claim", function() {
          beforeEach(async function() {
            this.claimReceipt = await this.dixel.claimReward({ from: alice });
            this.aliceReward = rewardCut(this.cost2).add(
              rewardCut(this.cost3).mul(new BN("2")).div(new BN("3"))
            );
          });

          it("should claim the reward correctly", async function() {
            expect(await this.baseToken.balanceOf(alice)).to.be.bignumber.equal(
              ALICE_BALANCE.sub(this.cost).add(this.aliceReward)
            );
          });

          it("should emit ClaimReward event", async function() {
            expectEvent(this.claimReceipt, "ClaimReward", {
              player: alice,
              rewardAmount: this.aliceReward
            });
          });
        });

        describe("bob claim", function() {
          beforeEach(async function() {
            this.claimReceipt = await this.dixel.claimReward({ from: bob });
            this.bobReward = rewardCut(this.cost3).mul(new BN("1")).div(new BN("3"));
          });

          it("should claim the reward correctly", async function() {
            expect(await this.baseToken.balanceOf(bob)).to.be.bignumber.equal(
              BOB_BALANCE.sub(this.cost2).add(this.bobReward)
            );
          });

          it("should emit ClaimReward event", async function() {
            expectEvent(this.claimReceipt, "ClaimReward", {
              player: bob,
              rewardAmount: this.bobReward
            });
          });
        });

        it("carol should have 0 claimable reward", async function() {
          expect(await this.dixel.claimableReward(carol)).to.be.bignumber.equal("0");
        });

        it("should revert on carol's ClaimReward", async function() {
          await expectRevert(
             this.dixel.claimReward({ from: carol }),
             'NOTHING_TO_CLAIM'
          );
        });
      }); // Update again - carol
    }); // Update again - bob
  }); // update
});
