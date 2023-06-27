import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('MarketPlaceFees Contract Tests', function () {
  async function deployMarketPlaceFees() {
    const [owner, dao, dev, incentive, supplier, seller, user1] =
      await ethers.getSigners();
    const MarketPlaceFeesFactory = await ethers.getContractFactory(
      'MarketPlaceFees'
    );
    const marketPlaceFeesInstance = await MarketPlaceFeesFactory.deploy(
      dao.address,
      dev.address,
      incentive.address,
      supplier.address,
      seller.address
    );

    return {
      marketPlaceFeesInstance,
      owner,
      dao,
      dev,
      incentive,
      supplier,
      seller,
      user1,
    };
  }

  describe('Deployment Tests', function () {
    it('Should deploy the contract and set the owner correctly', async function () {
      const { marketPlaceFeesInstance, owner } = await loadFixture(
        deployMarketPlaceFees
      );

      expect(await marketPlaceFeesInstance.owner()).to.equal(owner.address);
    });
  });

  describe('Product Purchase Tests', function () {
    it('Should allow users to purchase a product', async function () {
      const { marketPlaceFeesInstance, user1, seller } = await loadFixture(
        deployMarketPlaceFees
      );

      const productMargin = 20;
      const purchaseAmount = ethers.utils.parseEther('1');

      await marketPlaceFeesInstance
        .connect(user1)
        .buyProduct(productMargin, { value: purchaseAmount });

      expect(
        await marketPlaceFeesInstance.pendingBalance(seller.address)
      ).to.be.gt(0);
    });
  });

  describe('Withdraw Balance Tests', function () {
    it('Should allow owner to withdraw all balances', async function () {
      const {
        marketPlaceFeesInstance,
        owner,
        user1,
        dao,
        dev,
        incentive,
        seller,
      } = await loadFixture(deployMarketPlaceFees);

      const productMargin = 20;
      const purchaseAmount = ethers.utils.parseEther('1');

      await marketPlaceFeesInstance
        .connect(user1)
        .buyProduct(productMargin, { value: purchaseAmount });

      const initialBalanceDao = await ethers.provider.getBalance(dao.address);
      const initialBalanceDev = await ethers.provider.getBalance(dev.address);
      const initialBalanceIncentive = await ethers.provider.getBalance(
        incentive.address
      );
      const initialBalanceSeller = await ethers.provider.getBalance(
        seller.address
      );

      await marketPlaceFeesInstance.connect(owner).withdrawAllBalances();

      expect(await ethers.provider.getBalance(dao.address)).to.be.gt(
        initialBalanceDao
      );
      expect(await ethers.provider.getBalance(dev.address)).to.be.gt(
        initialBalanceDev
      );
      expect(await ethers.provider.getBalance(incentive.address)).to.be.gt(
        initialBalanceIncentive
      );
      expect(await ethers.provider.getBalance(seller.address)).to.be.gt(
        initialBalanceSeller
      );
    });
  });

  describe('Ownership Transfer Tests', function () {
    it('Should allow owner to transfer ownership', async function () {
      const { marketPlaceFeesInstance, owner, user1 } = await loadFixture(
        deployMarketPlaceFees
      );

      await marketPlaceFeesInstance
        .connect(owner)
        .transferOwnership(user1.address);
      expect(await marketPlaceFeesInstance.owner()).to.equal(user1.address);
    });
  });

  describe('Change Supplier Tests', function () {
    it('Should allow owner to change supplier', async function () {
      const { marketPlaceFeesInstance, owner, user1 } = await loadFixture(
        deployMarketPlaceFees
      );

      await marketPlaceFeesInstance.connect(owner).setSupplier(user1.address);
      expect(await marketPlaceFeesInstance.supplier()).to.equal(user1.address);
    });
  });

  describe('Change Min Product Price Tests', function () {
    it('Should allow owner to change minimum product price', async function () {
      const { marketPlaceFeesInstance, owner } = await loadFixture(
        deployMarketPlaceFees
      );
      const newMinProductPrice = ethers.utils.parseEther('0.02');

      await marketPlaceFeesInstance
        .connect(owner)
        .setMinProductPrice(newMinProductPrice);
      expect(await marketPlaceFeesInstance.minProductPrice()).to.equal(
        newMinProductPrice
      );
    });
  });

  describe('Failure Tests', function () {
    it('Should not allow users to buy products below the minimum price', async function () {
      const { marketPlaceFeesInstance, user1 } = await loadFixture(
        deployMarketPlaceFees
      );
      const productMargin = 20;

      await expect(
        marketPlaceFeesInstance.connect(user1).buyProduct(productMargin, {
          value: ethers.utils.parseEther('0.005'),
        })
      ).to.be.revertedWith('Value sent is too low.');
    });

    it('Should not allow non-owners to withdraw all balances', async function () {
      const { marketPlaceFeesInstance, user1 } = await loadFixture(
        deployMarketPlaceFees
      );

      await expect(
        marketPlaceFeesInstance.connect(user1).withdrawAllBalances()
      ).to.be.revertedWith('You are not the contract Owner.');
    });

    it('Should not allow non-owners to transfer ownership', async function () {
      const { marketPlaceFeesInstance, user1 } = await loadFixture(
        deployMarketPlaceFees
      );

      await expect(
        marketPlaceFeesInstance.connect(user1).transferOwnership(user1.address)
      ).to.be.revertedWith('You are not the contract Owner.');
    });

    it('Should not allow non-owners to change supplier', async function () {
      const { marketPlaceFeesInstance, user1 } = await loadFixture(
        deployMarketPlaceFees
      );

      await expect(
        marketPlaceFeesInstance.connect(user1).setSupplier(user1.address)
      ).to.be.revertedWith('You are not the contract Owner.');
    });

    it('Should not allow non-owners to change minimum product price', async function () {
      const { marketPlaceFeesInstance, user1 } = await loadFixture(
        deployMarketPlaceFees
      );
      const newMinProductPrice = ethers.utils.parseEther('0.02');

      await expect(
        marketPlaceFeesInstance
          .connect(user1)
          .setMinProductPrice(newMinProductPrice)
      ).to.be.revertedWith('You are not the contract Owner.');
    });
  });
});
