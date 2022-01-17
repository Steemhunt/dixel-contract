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

async function diffAfterClaim(baseToken, dixel, player) {
  const oldBalance = await baseToken.balanceOf(player);
  await dixel.claimReward({ from: player });
  const newBalance = await baseToken.balanceOf(player);

  return newBalance.sub(oldBalance);
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
      this.receipt = await this.dixel.updatePixels([[0, 0, 16711680], [2, 0, 65280]], 0, { from: alice }); // #ff0000, #00ff00

      this.pixel1 = await this.dixel.pixels(0, 0);
      this.pixel2 = await this.dixel.pixels(2, 0);
      this.alicePlayer = await this.dixel.players(alice);

      this.cost = GENESIS_PRICE.mul(new BN("2"));
    });

    it("should update pixel colors", async function() {
      expect(this.pixel1.color).to.be.bignumber.equal("16711680");
      expect(this.pixel2.color).to.be.bignumber.equal("65280");
    });

    it("should revert with UNCHANGED_PIXEL_COLOR if no colors are changed", async function() {
      await expectRevert(
          this.dixel.updatePixels([[0, 0, 16711680]], 1, { from: alice }),
         'UNCHANGED_PIXEL_COLORS'
      );
    });

    it("should revert with PARAMS_NOT_SORTED if params are not sorted", async function() {
      await expectRevert(
          this.dixel.updatePixels([[3, 3, 255], [2, 3, 255]], 1, { from: alice }),
         'PARAMS_NOT_SORTED'
      );
    });

    it("should revert with PARAMS_NOT_SORTED if there is a duplicated parameter", async function() {
      await expectRevert(
          this.dixel.updatePixels([[3, 3, 255], [3, 3, 255]], 1, { from: alice }),
         'PARAMS_NOT_SORTED'
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
        this.receipt2 = await this.dixel.updatePixels([[0, 0, 255]], 1, { from: bob }); // #0000ff

        this.pixel1 = await this.dixel.pixels(0, 0);
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
          this.receipt3 = await this.dixel.updatePixels([[0, 0, 15658734]], 2, { from: carol }); // #eeeeee

          this.pixel1 = await this.dixel.pixels(0, 0);
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
            expectEvent(this.claimReceipt, "ClaimReward", { player: bob, rewardAmount: this.bobReward });
          });
        });

        it("carol should have 0 claimable reward", async function() {
          expect(await this.dixel.claimableReward(carol)).to.be.bignumber.equal("0");
        });

        it("should revert on carol's ClaimReward", async function() {
          await expectRevert(this.dixel.claimReward({ from: carol }), 'NOTHING_TO_CLAIM');
        });
      }); // Update again - carol
    }); // Update again - bob
  }); // update


  describe("reward test", function() {
    beforeEach(async function() {
      await this.baseToken.approve(this.dixel.address, MAX_UINT256, { from: alice });
      await this.baseToken.mint(bob, BOB_BALANCE);
      await this.baseToken.approve(this.dixel.address, MAX_UINT256, { from: bob });
      await this.baseToken.mint(carol, CAROL_BALANCE);
      await this.baseToken.approve(this.dixel.address, MAX_UINT256, { from: carol });
    });

    describe("1. Alice creates reward at the beginning -> No one is prior to Alice, so reward is just locked on the contract forever", function() {
      beforeEach(async function() {
        await this.dixel.updatePixels([[0, 0, 255]], 0, { from: alice });
        this.reward1 = rewardCut(GENESIS_PRICE);
      });

      it("alice should have 0 claimable reward", async function() {
        expect(await this.dixel.claimableReward(alice)).to.be.bignumber.equal("0");
      });

      it("the contract has the reward as its balance", async function() {
        expect(await this.baseToken.balanceOf(this.dixel.address)).to.be.bignumber.equal(this.reward1);
      });

      it("should revert on Alice claim", async function() {
        await expectRevert(this.dixel.claimReward({ from: alice }), 'NOTHING_TO_CLAIM');
      });

      describe("2. Alice creates another reward -> Alice gets all reward from her first update", function() {
        beforeEach(async function() {
          await this.dixel.updatePixels([[0, 1, 255], [0, 2, 255]], 1, { from: alice });
          this.reward2 = rewardCut(GENESIS_PRICE.mul(new BN("2")));
        });

        it("alice should have all claimable reward", async function() {
          expect(await this.dixel.claimableReward(alice)).to.be.bignumber.equal(this.reward2);
        });

        it("alice can claim all reward", async function() {
          expect(await diffAfterClaim(this.baseToken, this.dixel, alice)).to.be.bignumber.equal(this.reward2);
        });

        describe("3. Bob creates another reward -> Alice gets all because Bob shouldn't be rewarded by his own contribution", function() {
          beforeEach(async function() {
            await this.dixel.updatePixels([[1, 0, 255], [1, 1, 255], [1, 2, 255]], 2, { from: bob });
            this.reward3 = rewardCut(GENESIS_PRICE.mul(new BN("3")));
          });

          it("alice should have all claimable reward", async function() {
            expect(await this.dixel.claimableReward(alice)).to.be.bignumber.equal(this.reward2.add(this.reward3));
          });

          it("alice can claim all reward", async function() {
            expect(await diffAfterClaim(this.baseToken, this.dixel, alice)).to.be.bignumber.equal(this.reward2.add(this.reward3));
          });

          it("bob should have 0 claimable reward", async function() {
            expect(await this.dixel.claimableReward(bob)).to.be.bignumber.equal("0");
          });

          it("should revert on Bob claim", async function() {
            await expectRevert(this.dixel.claimReward({ from: bob }), 'NOTHING_TO_CLAIM');
          });

          describe("4. Bob creates another reward -> Alice contribution: 3 / Bob contribution: 3 -> Alice gets half and Bob gets half", function() {
            beforeEach(async function() {
              // This time, claim all alice reward so far to reset calculation
              await this.dixel.claimReward({ from: alice });

              await this.dixel.updatePixels([[2, 0, 255], [2, 1, 255], [2, 2, 255]], 3, { from: bob });
              this.reward4 = rewardCut(GENESIS_PRICE.mul(new BN("3")));
            });

            it("alice should have the half of generated reward", async function() {
              expect(await this.dixel.claimableReward(alice)).to.be.bignumber.equal(this.reward4.div(new BN("2")));
            });

            it("alice can claim the reward", async function() {
              expect(await diffAfterClaim(this.baseToken, this.dixel, alice)).to.be.bignumber.equal(this.reward4.div(new BN("2")));
            });

            it("bob should have the half of generated reward", async function() {
              expect(await this.dixel.claimableReward(bob)).to.be.bignumber.equal(this.reward4.div(new BN("2")));
            });

            it("bob can claim the reward", async function() {
              expect(await diffAfterClaim(this.baseToken, this.dixel, bob)).to.be.bignumber.equal(this.reward4.div(new BN("2")));
            });

            describe("5. Carol creates another reward -> Alice contribution: 3 / Bob contribution: 6 -> Alice gets 1/3 and Bob gets 2/3 and Carol gets nothing", function() {
              beforeEach(async function() {
                // This time, claim all alice reward so far to reset calculation
                await this.dixel.claimReward({ from: alice });
                await this.dixel.claimReward({ from: bob });

                await this.dixel.updatePixels([[3, 0, 255], [3, 1, 255], [3, 2, 255], [3, 3, 255]], 4, { from: carol });
                this.reward5 = rewardCut(GENESIS_PRICE.mul(new BN("4")));
              });

              it("alice should have 1/3 of generated reward", async function() {
                expect(await this.dixel.claimableReward(alice)).to.be.bignumber.equal(this.reward5.div(new BN("3")));
              });

              it("alice can claim the reward", async function() {
                expect(await diffAfterClaim(this.baseToken, this.dixel, alice)).to.be.bignumber.equal(this.reward5.div(new BN("3")));
              });

              it("bob should have the half of generated reward", async function() {
                expect(await this.dixel.claimableReward(bob)).to.be.bignumber.equal(this.reward5.mul(new BN("2")).div(new BN("3")));
              });

              it("bob can claim the reward", async function() {
                expect(await diffAfterClaim(this.baseToken, this.dixel, bob)).to.be.bignumber.equal(this.reward5.mul(new BN("2")).div(new BN("3")));
              });

              it("carol should have 0 claimable reward", async function() {
                expect(await this.dixel.claimableReward(carol)).to.be.bignumber.equal("0");
              });

              it("should revert on Carol claim", async function() {
                await expectRevert(this.dixel.claimReward({ from: carol }), 'NOTHING_TO_CLAIM');
              });

              describe("6. Carol creates another reward by overwriting pixels - Alice: 3 / Bob: 6 / Carol: 4", function() {
                beforeEach(async function() {
                  await this.dixel.updatePixels([[3, 0, 256], [3, 1, 256]], 5, { from: carol });
                  this.reward6 = rewardCut(increasedPrice(GENESIS_PRICE).mul(new BN("2")));
                });

                it("alice should have prev + 3/13 of generated reward", async function() {
                  const prev = this.reward5.div(new BN("3"));
                  const now = prev.add(this.reward6.mul(new BN("3")).div(new BN("13")));
                  expect(await this.dixel.claimableReward(alice)).to.be.bignumber.equal(now);
                });

                it("bob should have prev + 6/13 of generated reward", async function() {
                  const prev = this.reward5.mul(new BN("2")).div(new BN("3"));
                  const now = prev.add(this.reward6.mul(new BN("6")).div(new BN("13")));
                  expect(await this.dixel.claimableReward(bob)).to.be.bignumber.equal(now);
                });

                it("carol should have 4/13 of generated reward", async function() {
                  expect(await this.dixel.claimableReward(carol)).to.be.bignumber.equal(this.reward6.mul(new BN("4")).div(new BN("13")));
                });

                it("should only have genesis reward after everyone claimed", async function() {
                  await this.dixel.claimReward({ from: alice });
                  await this.dixel.claimReward({ from: bob });
                  await this.dixel.claimReward({ from: carol });

                  // Fuzzy matching due to truncation of the last digit
                  expect(await this.baseToken.balanceOf(this.dixel.address)).to.be.bignumber.at.least(this.reward1);
                  expect(await this.baseToken.balanceOf(this.dixel.address)).to.be.bignumber.at.most(this.reward1.add(new BN("3")));
                });
              }); // 6
            }); // 5
          }); // 4
        }); // 3
      }); // 2
    }); // 1
  }); // reward test

  // Another test case written by @assafom
  // FIXME: refactoring required - splitting test cases
  describe("correct calculation of rewards", function() {
    it("handles reward accumulation correctly", async function() {
      await this.baseToken.mint(bob, BOB_BALANCE);
      await this.baseToken.mint(carol, CAROL_BALANCE);

      await this.baseToken.approve(this.dixel.address, MAX_UINT256, { from: alice });
      await this.baseToken.approve(this.dixel.address, MAX_UINT256, { from: bob });
      await this.baseToken.approve(this.dixel.address, MAX_UINT256, { from: carol });

      // Alice creates reward at the beginning -> No one is prior to Alice, so reward is just locked on the contract forever
      this.receipt = await this.dixel.updatePixels([[0, 0, 1]], 0, { from: alice });
      updatePriceCurr = GENESIS_PRICE;
      rewardsInDixelCurr = await this.baseToken.balanceOf(this.dixel.address);
      rewardsForAliceCurr = await this.dixel.claimableReward(alice);
      rewardsForBobCurr = await this.dixel.claimableReward(bob);
      rewardsForCarolCurr = await this.dixel.claimableReward(carol);
      expect(rewardsInDixelCurr).to.be.bignumber.equal(rewardCut(updatePriceCurr)); // Genesis reward - locked
      expect(rewardsForAliceCurr).to.be.bignumber.equal(new BN("0"));
      expect(rewardsForBobCurr).to.be.bignumber.equal(new BN("0"));
      expect(rewardsForCarolCurr).to.be.bignumber.equal(new BN("0"));
      rewardsInDixelPrev = rewardsInDixelCurr;
      rewardsForAlicePrev = rewardsForAliceCurr;
      rewardsForBobPrev = rewardsForBobCurr;
      rewardsForCarolPrev = rewardsForCarolCurr;

      // Alice creates another reward -> Alice gets the reward from her first update
      this.receipt = await this.dixel.updatePixels([[0, 0, 2]], 1, { from: alice });
      updatePriceCurr = increasedPrice(updatePriceCurr);
      rewardsInDixelCurr = await this.baseToken.balanceOf(this.dixel.address);
      rewardsForAliceCurr = await this.dixel.claimableReward(alice);
      rewardsForBobCurr = await this.dixel.claimableReward(bob);
      rewardsForCarolCurr = await this.dixel.claimableReward(carol);
      expect(rewardsInDixelCurr).to.be.bignumber.equal(
              rewardsInDixelPrev.add(rewardCut(updatePriceCurr))); // New reward added
      expect(rewardsForAliceCurr).to.be.bignumber.equal(
              rewardsInDixelCurr.sub(rewardCut(GENESIS_PRICE))); // Alice gets all rewards minus genesis reward
      expect(rewardsForBobCurr).to.be.bignumber.equal(new BN("0"));
      expect(rewardsForCarolCurr).to.be.bignumber.equal(new BN("0"));
      rewardsInDixelPrev = rewardsInDixelCurr;
      rewardsForAlicePrev = rewardsForAliceCurr;
      rewardsForBobPrev = rewardsForBobCurr;
      rewardsForCarolPrev = rewardsForCarolCurr;

      // Bob creates another reward -> Alice gets all reward because Bob shouldn't be rewarded by his own contribution
      this.receipt = await this.dixel.updatePixels([[0, 0, 3]], 2, { from: bob });
      updatePriceCurr = increasedPrice(updatePriceCurr);
      rewardsInDixelCurr = await this.baseToken.balanceOf(this.dixel.address);
      rewardsForAliceCurr = await this.dixel.claimableReward(alice);
      rewardsForBobCurr = await this.dixel.claimableReward(bob);
      rewardsForCarolCurr = await this.dixel.claimableReward(carol);
      expect(rewardsInDixelCurr).to.be.bignumber.equal(
              rewardsInDixelPrev.add(rewardCut(updatePriceCurr))); // New reward added
      expect(rewardsForAliceCurr).to.be.bignumber.equal(
              rewardsInDixelCurr.sub(rewardCut(GENESIS_PRICE))); // Alice gets all rewards minus genesis reward
      expect(rewardsForBobCurr).to.be.bignumber.equal(new BN("0"));
      expect(rewardsForCarolCurr).to.be.bignumber.equal(new BN("0"));
      rewardsInDixelPrev = rewardsInDixelCurr;
      rewardsForAlicePrev = rewardsForAliceCurr;
      rewardsForBobPrev = rewardsForBobCurr;
      rewardsForCarolPrev = rewardsForCarolCurr;

      // Bob creates another reward -> So far, Alice contribution: 2 , Bob contribution: 1 -> Alice gets 2/3 , Bob gets 1/3
      this.receipt = await this.dixel.updatePixels([[0, 0, 4]], 3, { from: bob });
      updatePriceCurr = increasedPrice(updatePriceCurr);
      rewardsInDixelCurr = await this.baseToken.balanceOf(this.dixel.address);
      rewardsForAliceCurr = await this.dixel.claimableReward(alice);
      rewardsForBobCurr = await this.dixel.claimableReward(bob);
      rewardsForCarolCurr = await this.dixel.claimableReward(carol);
      expect(rewardsInDixelCurr).to.be.bignumber.equal(
              rewardsInDixelPrev.add(rewardCut(updatePriceCurr))); // New reward added
      expect(rewardsForAliceCurr).to.be.bignumber.equal(
              rewardsForAlicePrev.add((
                rewardCut(updatePriceCurr).mul(new BN("2")).div(new BN("3"))))); // Alice previous rewards + 2/3 of new reward
      expect(rewardsForBobCurr).to.be.bignumber.equal(
              rewardCut(updatePriceCurr).mul(new BN("1")).div(new BN("3"))); // Bob gets 1/3 of new reward
      expect(rewardsForCarolCurr).to.be.bignumber.equal(new BN("0"));
      rewardsInDixelPrev = rewardsInDixelCurr;
      rewardsForAlicePrev = rewardsForAliceCurr;
      rewardsForBobPrev = rewardsForBobCurr;
      rewardsForCarolPrev = rewardsForCarolCurr;

      // Carol creates reward -> Alice contribution: 2 / Bob contribution: 2 -> Alice gets 1/2, Bob gets 1/2 , Carol gets nothing because she doesn't have any previous updates
      this.receipt = await this.dixel.updatePixels([[0, 0, 5]], 4, { from: carol });
      updatePriceCurr = increasedPrice(updatePriceCurr);
      rewardsInDixelCurr = await this.baseToken.balanceOf(this.dixel.address);
      rewardsForAliceCurr = await this.dixel.claimableReward(alice);
      rewardsForBobCurr = await this.dixel.claimableReward(bob);
      rewardsForCarolCurr = await this.dixel.claimableReward(carol);
      expect(rewardsInDixelCurr).to.be.bignumber.equal(
                rewardsInDixelPrev.add(rewardCut(updatePriceCurr)));
      expect(rewardsForAliceCurr).to.be.bignumber.equal(
                rewardsForAlicePrev.add((
                  rewardCut(updatePriceCurr).mul(new BN("1")).div(new BN("2"))))); // Alice gets previous rewards + 1/2 of new reward
      expect(rewardsForBobCurr).to.be.bignumber.equal(
                rewardsForBobPrev.add((
                  rewardCut(updatePriceCurr).mul(new BN("1")).div(new BN("2"))))); // Bob gets previous rewards + 1/2 of new reward
      expect(rewardsForCarolCurr).to.be.bignumber.equal(new BN("0"));
    });
  });
});
