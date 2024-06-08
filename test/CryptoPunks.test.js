const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Crypto Punks Test Script", async function () {
  let owner, addr1, addr2, addrs, cryptopunks, cryptoPunksMarket;
  beforeEach(async function () {
    cryptoPunksMarket = await ethers.getContractFactory("CryptoPunksMarket");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    cryptopunks = await cryptoPunksMarket.deploy();
  });

  describe("Set Initial Token Owner", async function () {
    it("Should revert if self transaction detected", async function () {
      expect(
        await cryptopunks.connect(addr2).setInitialOwners([addr2.address], [1])
      ).to.be.revertedWith("Self transaction detected");
    });

    it("Should set initial token owner", async function () {
      const amountSent = 5;

      let initialBalance = await cryptopunks
        .connect(addr2)
        .balanceOf(addr1.address);

      await cryptopunks
        .connect(owner)
        .setInitialOwners([addr1.address], [amountSent]);

      expect(await cryptopunks.balanceOf(addr1.address)).to.equal(1);
    });
  });

  describe("Set all initial owners to true", async function () {
    it("Should set and verify all initial owners have been set", async function () {
      await cryptopunks.connect(owner).allInitialOwnersAssigned();

      expect(await cryptopunks.allPunksAssigned()).to.equal(true);
    });

    it("Should revert if caller is not admin", async function () {
      expect(
        cryptopunks.connect(addr1).allInitialOwnersAssigned()
      ).to.revertedWith("Unauthorized");
    });
  });

  describe("Should mint a punk", async function () {
    it("Should mint a token (free mint)", async function () {
      let initialPunnksRemainingToAssign =
        await cryptopunks.punksRemainingToAssign();
      const punksExpectedToBeLeft = initialPunnksRemainingToAssign - 1n;

      await cryptopunks.connect(addr1).getPunk(99);
      expect(await cryptopunks.balanceOf(addr1.address)).to.equal(1);
      expect(await cryptopunks.punksRemainingToAssign()).to.equal(
        Number(punksExpectedToBeLeft)
      );
    });
  });

  describe("Transfer Punks to another user", async function () {
    it("Should revert when token is not listed for sale", async function () {
      await expect(
        cryptopunks.connect(addr1).transferPunk(addr2.address, 33)
      ).to.be.revertedWith("Token not listed for sale");
    });
    it("Should revert when wallet does not hold the punk", async function () {
      const tokenId = 4;
      const minSalesPrice = 20;

      await cryptopunks.connect(owner).setInitialOwner(addr1.address, tokenId);

      await cryptopunks.connect(owner).allInitialOwnersAssigned();

      await cryptopunks.connect(addr1).offerPunkForSale(tokenId, minSalesPrice);

      expect(
        cryptopunks.connect(addr1).transferPunk(addr2.address, tokenId)
      ).to.be.revertedWith("Sender not token owner");
    });
    it("Should mint and transfer punks to another user", async function () {
      const tokenId = 4;
      const minSalesPrice = 20;

      await cryptopunks.connect(owner).setInitialOwner(addr1.address, tokenId);

      await cryptopunks.connect(owner).allInitialOwnersAssigned();

      await cryptopunks.connect(addr1).offerPunkForSale(tokenId, minSalesPrice);

      await cryptopunks.connect(addr1).transferPunk(addr2.address, tokenId);

      expect(await cryptopunks.balanceOf(addr1.address)).to.equal(0);
      expect(await cryptopunks.balanceOf(addr2.address)).to.equal(1);
    });

    it("Should revert when token is no longer sellable", async function () {
      const tokenId = 4;
      const minSalesPrice = 20;

      await cryptopunks.connect(owner).setInitialOwner(addr1.address, tokenId);

      await cryptopunks.connect(owner).allInitialOwnersAssigned();

      await cryptopunks.connect(addr1).offerPunkForSale(tokenId, minSalesPrice);
      await cryptopunks.connect(addr1).punkNoLongerForSale(tokenId);

      expect(
        cryptopunks.connect(addr1).transferPunk(addr2.address, tokenId)
      ).to.be.revertedWith("Token not listed for sale");
    });
  });

  describe("Offer punk for sale to address", async function () {
    const tokenIndex = 56;

    it("Should revert if non-token owner offer sales", async function () {
      await cryptopunks.connect(owner).allInitialOwnersAssigned();
      expect(
        cryptopunks
          .connect(addr1)
          .offerPunkForSaleToAddress(tokenIndex, 20, addr2.address)
      ).to.revertedWith("Not authorized");
    });

    it("Should offer token for sale to address", async function () {
      // Set owner for tokenIndex 4 (adjust as needed)
      await cryptopunks.connect(owner).setInitialOwner(addr1.address, 4);
      await cryptopunks.connect(owner).allInitialOwnersAssigned();
      await cryptopunks
        .connect(addr1)
        .offerPunkForSaleToAddress(4, 10, addr2.address);

      // Option 1: Manual comparison with return value (modify if using different assertion library)
      const punksOffered = await cryptopunks.punksOfferedForSale(4);
      const expectedData = [true, 4n, addr1.address, 10n, addr2.address];

      // console.log({ punksOffered });

      const isDataEqual = await cryptopunks
        .punksOfferedForSale(4)
        .then((res) => {
          let allEqual = true;
          for (let i = 0; i < res.length; i++) {
            if (res[i] !== expectedData[i]) {
              allEqual = false;
              break;
            }
          }
          // console.log(allEqual);
          return allEqual;
        });

      expect(isDataEqual).to.equal(true); // Assert the returned boolean value

      // Option 2: Using assertions within the test framework (modify based on your assertion library)
      // const punksOffered = await cryptopunks.punksOfferedForSale(4);
      // const expectedData = [true, 4n, addr1.address, 20n, addr2.address];

      // await punksOffered.then((res) => {
      //   expect(res[0]).to.equal(expectedData[0]);
      //   expect(res[1]).to.be.bignumber.equal(expectedData[1]); // Handle BigInt comparison
      //   expect(res[2]).to.equal(expectedData[2]);
      //   expect(res[3]).to.be.bignumber.equal(expectedData[3]);
      //   expect(res[4]).to.equal(expectedData[4]);
      // });
    });
  });
  describe("Buy punk", async function () {
    const tokenIndex = Math.floor(Math.random() * 10000);

    it("Should revert if token is not up for sale", async function () {
      await cryptopunks.connect(owner).allInitialOwnersAssigned();
      expect(cryptopunks.connect(addr1).buyPunk(tokenIndex)).to.revertedWith(
        "Token not listed for sale"
      );
    });

    it("Should buy Punk from seller", async function () {
      await cryptopunks
        .connect(owner)
        .setInitialOwner(addr1.address, tokenIndex);
      await cryptopunks.connect(owner).allInitialOwnersAssigned();
      await cryptopunks.connect(addr1).offerPunkForSale(tokenIndex, 20);

      await cryptopunks
        .connect(addr2)
        .buyPunk(tokenIndex, { value: ethers.parseEther("20") });

      // confirm new token owner
      expect(await cryptopunks.punkIndexToAddress(tokenIndex)).to.equal(
        addr2.address
      );
    });
  });

  describe("Withdraw earnings from token sales", async function () {
    const tokenIndex = 6;

    it("Should revert when request is not from contract owner", async function () {
      expect(cryptopunks.connect(addr1).withdraw()).to.be.revertedWith(
        "Unauthorized"
      );
    });

    it("Should revert if amount exceed earnings stored in contract", async function () {
      // create an offer for a token
      await cryptopunks
        .connect(owner)
        .setInitialOwner(addr1.address, tokenIndex);
      await cryptopunks.connect(owner).allInitialOwnersAssigned();

      expect(cryptopunks.connect(addr1).withdraw()).to.revertedWith(
        "No pending withdrawal"
      );
    });
    it("Should Withdraw earnings from contract", async function () {
      // create an offer for a token
      await cryptopunks
        .connect(owner)
        .setInitialOwner(addr1.address, tokenIndex);
      await cryptopunks.connect(owner).allInitialOwnersAssigned();
      await cryptopunks.connect(addr1).offerPunkForSale(tokenIndex, 20);

      // buy the token from wallet 2
      await cryptopunks
        .connect(addr2)
        .buyPunk(tokenIndex, { value: ethers.parseEther("30") });
      // withdraw earnings from previous sale
      const amount = await cryptopunks.pendingWithdrawals(addr1.address);

      expect(amount).to.equal(ethers.parseEther("30"));
    });
  });

  describe("Transfer ownership of contract", async function () {
    it("Should revert if non admin call function", async function () {
      expect(cryptopunks.connect(addr2).SetNewOwner(addr1)).to.be.revertedWith(
        "Unauthorized"
      );
    });
    it("Should transfer ownership of the contract", async function () {
      await cryptopunks.connect(owner).SetNewOwner(addr2);
      expect(await cryptopunks._owner()).to.equal(addr2.address);
    });
  });

  describe("Enter Bid for a token", async function () {
    const tokenIndex = 404;

    it("Should enter bid for a specified token", async function () {
      const options = { value: ethers.parseEther("20") };
      await cryptopunks.connect(owner).allInitialOwnersAssigned();
      await cryptopunks
        .connect(owner)
        .setInitialOwner(addr1.address, tokenIndex);
      // check active bids

      await cryptopunks
        .connect(addr1)
        .enterBidForPunk(tokenIndex, { value: ethers.parseEther("7") });

      const activeBids = await cryptopunks.punkBids(tokenIndex);
      const expectedBid = [true, 404n, addr1.address, ethers.parseEther("7")];

      let bidMatch = true;

      for (let i = 0; i < activeBids.length; i++) {
        if (activeBids[i] !== expectedBid[i]) {
          bidMatch = false;
          break;
        }
      }

      expect(bidMatch).to.be.equal(true);
    });
  });

  describe("Accept bid made for a punk", async function () {
    it("Should revert if non token owner attempts to accept bid", async function () {
      await cryptopunks.connect(owner).allPunksAssigned();
      await cryptopunks.connect(owner).allInitialOwnersAssigned();
      await cryptopunks.connect(owner).setInitialOwner(addr2.address, 2222);
      await cryptopunks
        .connect(addr1)
        .enterBidForPunk(2222, { value: ethers.parseEther("2") });

      // console.log(await cryptopunks.punkBids(2222))

      await expect(
        cryptopunks
          .connect(addr1)
          .acceptBidForPunk(2222, ethers.parseEther("0.2"))
      ).to.revertedWith("Not authorized");
    });

    it("Should revert when bid amount is below minimum", async function () {
      await cryptopunks.connect(owner).allPunksAssigned();
      await cryptopunks.connect(owner).allInitialOwnersAssigned();
      await cryptopunks.connect(owner).setInitialOwner(addr2.address, 2222);
      await cryptopunks
        .connect(addr1)
        .enterBidForPunk(2222, { value: ethers.parseEther("2") });

      await expect(
        cryptopunks
          .connect(addr2)
          .acceptBidForPunk(2222, ethers.parseEther("5"))
      ).to.revertedWith("Bid amount below minimum");
    });

    it("Should accept highest bid made for the requested punk", async function () {
      await cryptopunks.connect(owner).allPunksAssigned();
      await cryptopunks.connect(owner).allInitialOwnersAssigned();
      await cryptopunks.connect(owner).setInitialOwner(addr2.address, 2222);
      await cryptopunks
        .connect(addr1)
        .enterBidForPunk(2222, { value: ethers.parseEther("2") });

      await cryptopunks
        .connect(addr2)
        .acceptBidForPunk(2222, ethers.parseEther("1"));

      const newOwner = await cryptopunks.punkIndexToAddress(2222);

      expect(newOwner).to.equal(addr1.address);
    });
  });

  describe("Should withdraw bid made on punk", async function () {
    it("Should withdraw bid", async function () {
      await cryptopunks.connect(owner).allPunksAssigned();
      await cryptopunks.connect(owner).allInitialOwnersAssigned();
      await cryptopunks.connect(owner).setInitialOwner(addr2.address, 2222);

      await cryptopunks
        .connect(addr1)
        .enterBidForPunk(2222, { value: ethers.parseEther("2") });

      await cryptopunks.connect(addr1).withdrawBidForPunk(2222);

      const bid = await cryptopunks.punkBids(2222);
      const expectedBidData = [
        false,
        "2222",
        "0x0000000000000000000000000000000000000000",
        "0",
      ];

      let bidsMatched = true;

      for (let i; i < bid.length; i++) {
        if (expectedBidData[i] !== bid[i]) {
          bidsMatched = false;
          break;
        }
      }

      expect().to.equal();
    });
  });
});
