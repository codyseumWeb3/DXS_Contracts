import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

async function generateProducts(productNumber: number) {
  const ids = [];
  const sellers = [];
  const prices = [];

  const addressStack = await ethers.getSigners();

  for (let i = 0; i < productNumber; i++) {
    ids.push(i);
    sellers.push(addressStack[i + 3].address);
    prices.push(ethers.utils.parseEther((i + 1).toString()));
  }

  return { ids, sellers, prices };
}

function sumTo(n: number) {
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i;
  }
  return sum;
}

describe("Escrow", function () {
  // arbitrary buyer index from callstack
  const buyerIndex = 9;

  async function deployEscrowContract() {
    let [dev, dao, buyer, seller, other] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("Escrow");
    const escrow = await Escrow.deploy(dao.address, dev.address);

    return { escrow, dev, dao };
  }

  async function deployEscrowAndPopulate(productNumber: number) {
    const { escrow, dev, dao } = await loadFixture(deployEscrowContract);
    const { ids, sellers, prices } = await generateProducts(productNumber);
    const msgValue = ethers.utils.parseEther(sumTo(productNumber).toString());
    const callStack = await ethers.getSigners();
    const buyer = callStack[buyerIndex];
    const escrowFromBuyer = escrow.connect(buyer);
    await escrowFromBuyer.addProducts(ids, sellers, prices, {
      value: msgValue,
    });

    let populatedEscrow = escrowFromBuyer;
    return { populatedEscrow, buyer, dev, dao };
  }

  describe("Deployment", function () {
    it("Should deploy the contract and set DAO address and DEV address", async function () {
      const { escrow, dev, dao } = await loadFixture(deployEscrowContract);

      expect(await escrow.devAddress(), "it should set dev address").to.equal(
        dev.address
      );
      expect(await escrow.daoAddress(), "it should set dao address").to.equal(
        dao.address
      );
    });
  });

  describe("Normal buying process", function () {
    const productNumber = 5;

    const price = ethers.utils.parseEther(sumTo(productNumber).toString());

    it("Should add some products", async function () {
      let [buyer, seller, other] = await ethers.getSigners();
      const { ids, sellers, prices } = await generateProducts(productNumber);
      const { escrow, dev, dao } = await loadFixture(deployEscrowContract);

      await expect(escrow.addProducts(ids, sellers, prices)).to.be.revertedWith(
        "Ether sent must cover total price of all products"
      );

      // Connect the buyer signer to the escrow contract
      let escrowFromBuyer = escrow.connect(buyer);

      // Now the seller is the msg.sender in the createOrder call

      escrowFromBuyer.addProducts(ids, sellers, prices, { value: price });

      const product = await escrowFromBuyer.products(1);

      expect(
        product.buyer,
        "Buyer address should be the buying address"
      ).to.equal(buyer.address);

      await expect(
        escrowFromBuyer.addProducts(ids, sellers, prices, { value: price })
      ).to.be.revertedWith("Product with this ID already exists");
    });

    it("It should set the product to delivered and release buyer money", async function () {
      const productNumber2Create = 10;
      const productIndex2Check = 2;
      const { populatedEscrow, buyer } = await deployEscrowAndPopulate(
        productNumber2Create
      );

      const escrowFromBuyer = populatedEscrow.connect(buyer);

      await escrowFromBuyer.confirmDelivery(productIndex2Check);

      const product = await populatedEscrow.products(productIndex2Check);
      expect(product.delivered, "Product delivered should be true").to.be.true;
    });
  });
});
