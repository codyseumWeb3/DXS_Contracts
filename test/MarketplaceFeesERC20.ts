import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';

describe('MarketPlaceFeesERC20 Contract Tests', function () {
  let token: Contract;

  async function deployToken() {
    const [tokenOwner] = await ethers.getSigners();
    const Token = await ethers.getContractFactory('Token');
    token = await Token.deploy(
      'Test Token',
      'TST',
      ethers.utils.parseEther('10000')
    );

    return { tokenOwner, token };
  }

  async function deployMarketPlaceFeesERC20() {
    const { tokenOwner, token } = await deployToken();

    const [owner, dao, dev, incentive, supplier, seller, user1] =
      await ethers.getSigners();
    const MarketPlaceFeesERC20Factory = await ethers.getContractFactory(
      'MarketPlaceFeesERC20'
    );
    const marketPlaceFeesInstance = await MarketPlaceFeesERC20Factory.deploy(
      dao.address,
      dev.address,
      incentive.address,
      supplier.address,
      seller.address,
      token.address
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
      tokenOwner,
      token,
    };
  }

  describe('Product Purchase Tests', function () {
    it('Should allow users to purchase a product', async function () {
      const { marketPlaceFeesInstance, user1, seller, tokenOwner, token } =
        await loadFixture(deployMarketPlaceFeesERC20);

      const productMargin = 20;
      const purchaseAmount = ethers.utils.parseEther('10');

      await token.connect(tokenOwner).transfer(user1.address, purchaseAmount);

      await token
        .connect(user1)
        .approve(marketPlaceFeesInstance.address, purchaseAmount);
      await marketPlaceFeesInstance
        .connect(user1)
        .buyProduct(productMargin, purchaseAmount);

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
        tokenOwner,
        token,
      } = await loadFixture(deployMarketPlaceFeesERC20);

      const productMargin = 20;
      const purchaseAmount = ethers.utils.parseEther('10');
      await token.connect(tokenOwner).transfer(user1.address, purchaseAmount);
      await token
        .connect(user1)
        .approve(marketPlaceFeesInstance.address, purchaseAmount);
      await marketPlaceFeesInstance
        .connect(user1)
        .buyProduct(productMargin, purchaseAmount);

      const initialBalanceDao = await token.balanceOf(dao.address);
      const initialBalanceDev = await token.balanceOf(dev.address);
      const initialBalanceIncentive = await token.balanceOf(incentive.address);
      const initialBalanceSeller = await token.balanceOf(seller.address);

      await marketPlaceFeesInstance.connect(owner).withdrawAllBalances();

      expect(await token.balanceOf(dao.address)).to.be.gt(initialBalanceDao);
      expect(await token.balanceOf(dev.address)).to.be.gt(initialBalanceDev);
      expect(await token.balanceOf(incentive.address)).to.be.gt(
        initialBalanceIncentive
      );
      expect(await token.balanceOf(seller.address)).to.be.gt(
        initialBalanceSeller
      );
    });
  });

  describe('Ownership Transfer Tests', function () {
    it('Should allow owner to transfer ownership', async function () {
      const { marketPlaceFeesInstance, owner, user1 } = await loadFixture(
        deployMarketPlaceFeesERC20
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
        deployMarketPlaceFeesERC20
      );

      await marketPlaceFeesInstance.connect(owner).setSupplier(user1.address);
      expect(await marketPlaceFeesInstance.supplier()).to.equal(user1.address);
    });
  });

  describe('Change Min Product Price Tests', function () {
    it('Should allow owner to change minimum product price', async function () {
      const { marketPlaceFeesInstance, owner } = await loadFixture(
        deployMarketPlaceFeesERC20
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
        deployMarketPlaceFeesERC20
      );
      const productMargin = 20;
      const lowPurchaseAmount = ethers.utils.parseEther('0.00005');

      await token
        .connect(user1)
        .approve(marketPlaceFeesInstance.address, lowPurchaseAmount);

      await expect(
        marketPlaceFeesInstance
          .connect(user1)
          .buyProduct(productMargin, lowPurchaseAmount)
      ).to.be.revertedWith('Value sent is too low.');
    });

    it('Should not allow non-owners to withdraw all balances', async function () {
      const { marketPlaceFeesInstance, user1 } = await loadFixture(
        deployMarketPlaceFeesERC20
      );

      await expect(
        marketPlaceFeesInstance.connect(user1).withdrawAllBalances()
      ).to.be.revertedWith('You are not the contract Owner.');
    });

    it('Should not allow non-owners to transfer ownership', async function () {
      const { marketPlaceFeesInstance, user1 } = await loadFixture(
        deployMarketPlaceFeesERC20
      );

      await expect(
        marketPlaceFeesInstance.connect(user1).transferOwnership(user1.address)
      ).to.be.revertedWith('You are not the contract Owner.');
    });

    it('Should not allow non-owners to change supplier', async function () {
      const { marketPlaceFeesInstance, user1 } = await loadFixture(
        deployMarketPlaceFeesERC20
      );

      await expect(
        marketPlaceFeesInstance.connect(user1).setSupplier(user1.address)
      ).to.be.revertedWith('You are not the contract Owner.');
    });

    it('Should not allow non-owners to change minimum product price', async function () {
      const { marketPlaceFeesInstance, user1 } = await loadFixture(
        deployMarketPlaceFeesERC20
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
