import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { expect } from "chai";
import { ethers } from "hardhat";
import { calculateSum, generateProducts } from "../utils/helpers";

describe("Escrow Contract Tests", function () {
  const testBuyerIndex = 9;
  const productIndexToCheck = 2;

  async function deployEscrow() {
    const [developerWallet, daoWallet, arbitratorWallet] =
      await ethers.getSigners();
    const EscrowFactory = await ethers.getContractFactory("Escrow");
    const escrowInstance = await EscrowFactory.deploy(
      daoWallet.address,
      developerWallet.address,
      arbitratorWallet.address
    );

    return { escrowInstance, developerWallet, daoWallet, arbitratorWallet };
  }

  async function deployEscrowAndAddProductItems(productItemCount: number) {
    const { escrowInstance, developerWallet, daoWallet, arbitratorWallet } =
      await loadFixture(deployEscrow);
    const { productIds, productSellers, productPrices } =
      await generateProducts(productItemCount);
    const totalEtherValue = ethers.utils.parseEther(
      calculateSum(productItemCount).toString()
    );
    const allSigners = await ethers.getSigners();
    const buyer = allSigners[testBuyerIndex];
    const escrowFromBuyer = escrowInstance.connect(buyer);
    await escrowFromBuyer.addProducts(
      productIds,
      productSellers,
      productPrices,
      { value: totalEtherValue }
    );

    const escrowPopulatedWithProducts = escrowFromBuyer;
    return {
      escrowPopulatedWithProducts,
      buyer,
      developerWallet,
      daoWallet,
      arbitratorWallet,
    };
  }

  describe("Deployment Tests", function () {
    it("Should deploy the contract and set DAO and developer addresses correctly", async function () {
      const { escrowInstance, developerWallet, daoWallet, arbitratorWallet } =
        await loadFixture(deployEscrow);

      expect(await escrowInstance.devWalletAddress()).to.equal(
        developerWallet.address
      );
      expect(await escrowInstance.daoWalletAddress()).to.equal(
        daoWallet.address
      );
      expect(await escrowInstance.arbitratorAddress()).to.equal(
        arbitratorWallet.address
      );
    });
  });

  describe("Normal Buying Process Tests", function () {
    const productCount = 5;
    const totalProductValue = ethers.utils.parseEther(
      calculateSum(productCount).toString()
    );

    it("Should add some products", async function () {
      const [buyer, seller, other] = await ethers.getSigners();
      const { productIds, productSellers, productPrices } =
        await generateProducts(productCount);
      const { escrowInstance, developerWallet, daoWallet } = await loadFixture(
        deployEscrow
      );

      await expect(
        escrowInstance.addProducts(productIds, productSellers, productPrices)
      ).to.be.revertedWith("Ether sent must cover total price of all products");

      // Connect the buyer signer to the escrow contract
      const escrowFromBuyer = escrowInstance.connect(buyer);

      // Now the seller is the msg.sender in the createOrder call
      await escrowFromBuyer.addProducts(
        productIds,
        productSellers,
        productPrices,
        { value: totalProductValue }
      );

      const product = await escrowFromBuyer.productList(1);

      expect(product.buyerAddress).to.equal(buyer.address);

      await expect(
        escrowFromBuyer.addProducts(productIds, productSellers, productPrices, {
          value: totalProductValue,
        })
      ).to.be.revertedWith("Product with this ID already exists");
    });

    it("It should mark the product as delivered and release buyer money", async function () {
      const productCountToCreate = 10;

      const { escrowPopulatedWithProducts, buyer } =
        await deployEscrowAndAddProductItems(productCountToCreate);

      const escrowFromBuyer = escrowPopulatedWithProducts.connect(buyer);

      await escrowFromBuyer.confirmDelivery(productIndexToCheck);

      const product = await escrowPopulatedWithProducts.productList(
        productIndexToCheck
      );
      expect(product.isDelivered).to.be.true;
    });

    it("Should not allow buyer to confirm delivery more than once", async function () {
      const productCount = 5;

      const { escrowPopulatedWithProducts, buyer } =
        await deployEscrowAndAddProductItems(productCount);

      const escrowFromBuyer = escrowPopulatedWithProducts.connect(buyer);

      await escrowFromBuyer.confirmDelivery(productIndexToCheck);

      await expect(
        escrowFromBuyer.confirmDelivery(productIndexToCheck)
      ).to.be.revertedWith("Product delivery has already been confirmed.");
    });
  });

  describe("Batch Confirmation Process Tests", function () {
    const productCount = 10;

    it("Should confirm delivery of multiple products", async function () {
      const { escrowPopulatedWithProducts, buyer } =
        await deployEscrowAndAddProductItems(productCount);

      // Array to store ids of products to confirm
      const productIdsToConfirm = [1, 2, 3, 8, 9];

      // Confirm delivery of multiple products
      await escrowPopulatedWithProducts.batchConfirmDelivery(
        productIdsToConfirm
      );

      // Check each product and verify delivery confirmation
      for (let i = 0; i < productIdsToConfirm.length; i++) {
        const product = await escrowPopulatedWithProducts.productList(
          productIdsToConfirm[i]
        );
        expect(product.isDelivered).to.be.true;
      }
    });
  });

  describe("Withdrawal Process Tests", function () {
    const productCount = 10;

    it("Should allow withdrawal of funds after product delivery", async function () {
      const { escrowPopulatedWithProducts, buyer } =
        await deployEscrowAndAddProductItems(productCount);

      const sellerIndex = productIndexToCheck;

      await escrowPopulatedWithProducts.confirmDelivery(productIndexToCheck);

      const allSigners = await ethers.getSigners();
      const seller = allSigners[sellerIndex + 3];
      const escrowFromSeller = escrowPopulatedWithProducts.connect(seller);
      const balanceBeforeWithdrawal = await seller.getBalance();

      //seller initiates withdrawal
      await escrowFromSeller.withdraw();

      expect(await seller.getBalance()).to.be.gt(balanceBeforeWithdrawal);
    });

    it("Should allow withdrawal of developer and DAO funds after product delivery", async function () {
      const { escrowPopulatedWithProducts, buyer, developerWallet, daoWallet } =
        await deployEscrowAndAddProductItems(productCount);

      await escrowPopulatedWithProducts.confirmDelivery(productIndexToCheck);

      const escrowFromDeveloper =
        escrowPopulatedWithProducts.connect(developerWallet);
      const balanceBeforeDevWithdrawal = await developerWallet.getBalance();

      //developer initiates withdrawal
      await escrowFromDeveloper.withdrawDev();
      expect(await developerWallet.getBalance()).to.be.gt(
        balanceBeforeDevWithdrawal
      );

      const escrowFromDao = escrowPopulatedWithProducts.connect(daoWallet);
      const balanceBeforeDaoWithdrawal = await daoWallet.getBalance();

      //dao initiates withdrawal
      await escrowFromDao.withdrawDAO();
      expect(await daoWallet.getBalance()).to.be.gt(balanceBeforeDaoWithdrawal);
    });
  });

  describe("Fee Distribution Tests", function () {
    const productCount = 5;

    it("Should distribute the fees correctly after product delivery", async function () {
      const { escrowPopulatedWithProducts, buyer, developerWallet, daoWallet } =
        await deployEscrowAndAddProductItems(productCount);

      const productPrice = ethers.utils.parseEther(
        (productIndexToCheck + 1).toString()
      );
      const expectedDeveloperFee = productPrice.mul(1).div(100);
      const expectedDaoFee = productPrice.mul(25).div(1000);

      await escrowPopulatedWithProducts.confirmDelivery(productIndexToCheck);

      expect(await escrowPopulatedWithProducts.fundsForDev()).to.equal(
        expectedDeveloperFee
      );
      expect(await escrowPopulatedWithProducts.fundsForDao()).to.equal(
        expectedDaoFee
      );
    });
  });

  describe("Arbitrator Functionality Tests", function () {
    const productCount = 5;

    it("Should allow the arbitrator to mark a product as delivered and withdraw his fees", async function () {
      const {
        escrowPopulatedWithProducts,
        buyer,
        developerWallet,
        daoWallet,
        arbitratorWallet,
      } = await deployEscrowAndAddProductItems(productCount);
      const productIndexToCheck = 2;

      const escrowFromBuyer = escrowPopulatedWithProducts.connect(buyer);
      const openDisputeFee = await escrowFromBuyer.OPEN_DISPUTE_FEE();
      await escrowFromBuyer.openDispute(productIndexToCheck, {
        value: openDisputeFee,
      });

      const escrowConnectedWithArbitrator =
        escrowFromBuyer.connect(arbitratorWallet);

      await escrowConnectedWithArbitrator.confirmDelivery(productIndexToCheck);

      const product = await escrowConnectedWithArbitrator.productList(
        productIndexToCheck
      );

      expect(product.isDelivered).to.be.true;

      const balanceBeforeWithdrawal = await arbitratorWallet.getBalance();

      await escrowConnectedWithArbitrator.withdrawArbitrator();

      expect(await arbitratorWallet.getBalance()).to.be.gt(
        balanceBeforeWithdrawal,
        "It Should allow the arbitrator to withdraw his fees"
      );
    });

    it("Should not allow anyone but the arbitrator to arbitrate", async function () {
      const { escrowPopulatedWithProducts, buyer } =
        await deployEscrowAndAddProductItems(productCount);
      const productIndexToCheck = 2;
      const allSigners = await ethers.getSigners();
      const nonArbitrator = allSigners[3]; // assuming the non-arbitrator is the 4th account
      const escrowConnectedWithNonArbitrator =
        escrowPopulatedWithProducts.connect(nonArbitrator);

      await expect(
        escrowConnectedWithNonArbitrator.confirmDelivery(productIndexToCheck)
      ).to.be.revertedWith(
        "Only the buyer or arbitrator can confirm delivery."
      );
    });
  });
});
