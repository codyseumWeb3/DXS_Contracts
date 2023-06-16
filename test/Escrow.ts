import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

async function generateProducts(productCount: number) {
  const productIds = [];
  const productSellers = [];
  const productPrices = [];

  const availableAddresses = await ethers.getSigners();

  for (let i = 0; i < productCount; i++) {
    productIds.push(i);
    productSellers.push(availableAddresses[i + 3].address);
    productPrices.push(ethers.utils.parseEther((i + 1).toString()));
  }

  return { productIds, productSellers, productPrices };
}

function calculateSum(n: number) {
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i;
  }
  return sum;
}

describe("Escrow Contract Tests", function () {
  const testBuyerIndex = 9;

  async function deployEscrow() {
    let [developerWallet, daoWallet, buyer, seller, other] = await ethers.getSigners();
    const EscrowFactory = await ethers.getContractFactory("Escrow");
    const escrowInstance = await EscrowFactory.deploy(daoWallet.address, developerWallet.address);

    return { escrowInstance, developerWallet, daoWallet };
  }

  async function deployEscrowAndAddProductItems(productItemCount: number) {
    const { escrowInstance, developerWallet, daoWallet } = await loadFixture(deployEscrow);
    const { productIds, productSellers, productPrices } = await generateProducts(productItemCount);
    const totalEtherValue = ethers.utils.parseEther(calculateSum(productItemCount).toString());
    const allSigners = await ethers.getSigners();
    const buyer = allSigners[testBuyerIndex];
    const escrowConnectedWithBuyer = escrowInstance.connect(buyer);
    await escrowConnectedWithBuyer.addProducts(productIds, productSellers, productPrices, { value: totalEtherValue });

    let escrowPopulatedWithProducts = escrowConnectedWithBuyer;
    return { escrowPopulatedWithProducts, buyer, developerWallet, daoWallet };
  }

  describe("Deployment Tests", function () {
    it("Should deploy the contract and set DAO and developer addresses correctly", async function () {
      const { escrowInstance, developerWallet, daoWallet } = await loadFixture(deployEscrow);

      expect(await escrowInstance.devWalletAddress()).to.equal(developerWallet.address);
      expect(await escrowInstance.daoWalletAddress()).to.equal(daoWallet.address);
    });
  });

  describe("Normal Buying Process Tests", function () {
    const productCount = 5;
    const totalProductValue = ethers.utils.parseEther(calculateSum(productCount).toString());

    it("Should add some products", async function () {
      let [buyer, seller, other] = await ethers.getSigners();
      const { productIds, productSellers, productPrices } = await generateProducts(productCount);
      const { escrowInstance, developerWallet, daoWallet } = await loadFixture(deployEscrow);

      await expect(escrowInstance.addProducts(productIds, productSellers, productPrices)).to.be.revertedWith(
        "Ether sent must cover total price of all products"
      );

      // Connect the buyer signer to the escrow contract
      let escrowFromBuyer = escrowInstance.connect(buyer);

      // Now the seller is the msg.sender in the createOrder call
      await escrowFromBuyer.addProducts(productIds, productSellers, productPrices, { value: totalProductValue });

      const product = await escrowFromBuyer.productList(1);

      expect(product.buyerAddress).to.equal(buyer.address);

      await expect(escrowFromBuyer.addProducts(productIds, productSellers, productPrices, { value: totalProductValue })).to.be.revertedWith("Product with this ID already exists");
    });

    it("It should mark the product as delivered and release buyer money", async function () {
      const productCountToCreate = 10;
      const productIndexToCheck = 2;
      const { escrowPopulatedWithProducts, buyer } = await deployEscrowAndAddProductItems(productCountToCreate);

      const escrowConnectedWithBuyer = escrowPopulatedWithProducts.connect(buyer);

      await escrowConnectedWithBuyer.confirmDelivery(productIndexToCheck);

      const product = await escrowPopulatedWithProducts.productList(productIndexToCheck);
      expect(product.isDelivered).to.be.true;
    });

    it("Should not allow buyer to confirm delivery more than once", async function () {
      const productCount = 5;
      const productIndexToCheck = 2;
      const { escrowPopulatedWithProducts, buyer } = await deployEscrowAndAddProductItems(productCount);

      const escrowConnectedWithBuyer = escrowPopulatedWithProducts.connect(buyer);

      await escrowConnectedWithBuyer.confirmDelivery(productIndexToCheck);

      await expect(escrowConnectedWithBuyer.confirmDelivery(productIndexToCheck)).to.be.revertedWith("Product delivery has already been confirmed.");
    });
  });

  describe("Withdrawal Process Tests", function () {
    const productCount = 5;

    it("Should allow withdrawal of funds after product delivery", async function () {
      const { escrowPopulatedWithProducts, buyer } = await deployEscrowAndAddProductItems(productCount);
      const productIndexToCheck = 2;
      const sellerIndex = productIndexToCheck;

      await escrowPopulatedWithProducts.confirmDelivery(productIndexToCheck);

      const allSigners = await ethers.getSigners();
      const seller = allSigners[sellerIndex + 3];
      const escrowConnectedWithSeller = escrowPopulatedWithProducts.connect(seller);
      const balanceBeforeWithdrawal = await seller.getBalance();

      //seller initiates withdrawal
      await escrowConnectedWithSeller.withdraw();

      expect(await seller.getBalance()).to.be.gt(balanceBeforeWithdrawal);
    });

    it("Should allow withdrawal of developer and DAO funds after product delivery", async function () {
      const { escrowPopulatedWithProducts, buyer, developerWallet, daoWallet } = await deployEscrowAndAddProductItems(productCount);
      const productIndexToCheck = 2;

      await escrowPopulatedWithProducts.confirmDelivery(productIndexToCheck);

      const escrowConnectedWithDeveloper = escrowPopulatedWithProducts.connect(developerWallet);
      const balanceBeforeDevWithdrawal = await developerWallet.getBalance();

      //developer initiates withdrawal
      await escrowConnectedWithDeveloper.withdrawDev();
      expect(await developerWallet.getBalance()).to.be.gt(balanceBeforeDevWithdrawal);

      const escrowConnectedWithDao = escrowPopulatedWithProducts.connect(daoWallet);
      const balanceBeforeDaoWithdrawal = await daoWallet.getBalance();

      //dao initiates withdrawal
      await escrowConnectedWithDao.withdrawDAO();
      expect(await daoWallet.getBalance()).to.be.gt(balanceBeforeDaoWithdrawal);
    });
  });

  describe("Fee Distribution Tests", function () {
    const productCount = 5;

    it("Should distribute the fees correctly after product delivery", async function () {
      const { escrowPopulatedWithProducts, buyer, developerWallet, daoWallet } = await deployEscrowAndAddProductItems(productCount);
      const productIndexToCheck = 2;

      const productPrice = ethers.utils.parseEther((productIndexToCheck + 1).toString());
      const expectedDeveloperFee = productPrice.mul(1).div(100);
      const expectedDaoFee = productPrice.mul(25).div(1000);

      await escrowPopulatedWithProducts.confirmDelivery(productIndexToCheck);

      expect(await escrowPopulatedWithProducts.fundsForDev()).to.equal(expectedDeveloperFee);
      expect(await escrowPopulatedWithProducts.fundsForDao()).to.equal(expectedDaoFee);
    });
  });
});
