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
    const tokenIndex = Math.floor(Math.random() * 10000n);

    it("Should revert if non-token owner offer sales", async function () {
      await cryptopunks.connect(owner).allInitialOwnersAssigned();
      expect(
        cryptopunks
          .connect(addr1)
          .offerPunkForSaleToAddress(tokenIndex, 20, addr2.address)
      ).to.revertedWith("Not authorized");
    });

    it("Should offer token for sale to address", async function () {
      await cryptopunks.connect(owner).allInitialOwnersAssigned();
      await cryptopunks
        .connect(owner)
        .setInitialOwner(addr1.address, tokenIndex);
      await cryptopunks
        .connect(addr1)
        .offerPunkForSaleToAddress(tokenIndex, 20, addr2.address);
      // console.log(await cryptopunks.punksOfferedForSale[tokenIndex][2]);
      expect(await cryptopunks.punksOfferedForSale(tokenIndex)).to.equal([
        true,
        `${tokenIndex}`,
        addr1.address,
        `${20}`,
        addr2.address,
      ]);
    });
  });
});
