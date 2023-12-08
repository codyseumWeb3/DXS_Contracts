import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('MarketPlaceFees Contract Tests', function () {
  async function deployMarketPlaceFees() {
    const [owner, dxs, supplier, user1] = await ethers.getSigners();
    const MarketPlaceFeesFactory = await ethers.getContractFactory(
      'MarketPlaceFees'
    );
    const marketPlaceFeesInstance = await MarketPlaceFeesFactory.deploy(
      dxs.address,
      supplier.address
    );

    return {
      marketPlaceFeesInstance,
      owner,
      dxs,
      supplier,
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
      const { marketPlaceFeesInstance, user1, supplier } = await loadFixture(
        deployMarketPlaceFees
      );

      const purchaseAmount = ethers.utils.parseEther('1');

      await marketPlaceFeesInstance
        .connect(user1)
        .buyProduct({ value: purchaseAmount });

      // Get the balance of the contract
      const contractBalance = await ethers.provider.getBalance(
        marketPlaceFeesInstance.address
      );

      expect(contractBalance).to.be.gt(0);
    });

    it('Should not allow users to buy products without sending ether', async function () {
      const { marketPlaceFeesInstance, user1 } = await loadFixture(
        deployMarketPlaceFees
      );

      await expect(
        marketPlaceFeesInstance.connect(user1).buyProduct({
          value: ethers.utils.parseEther('0'),
        })
      ).to.be.revertedWith('Value sent is too low.');
    });
  });

  describe('Withdraw Balance Tests', function () {
    it('Should allow owner to withdraw all balances', async function () {
      const { marketPlaceFeesInstance, owner, user1, dxs, supplier } =
        await loadFixture(deployMarketPlaceFees);

      const purchaseAmount = ethers.utils.parseEther('1');

      await marketPlaceFeesInstance
        .connect(user1)
        .buyProduct({ value: purchaseAmount });
      const baseDXSBalance = await ethers.provider.getBalance(dxs.address);
      const baseSupplierBalance = await ethers.provider.getBalance(
        supplier.address
      );

      await marketPlaceFeesInstance.connect(owner).withdrawAllBalances();
      const afterWithdrawDXSBalance = await ethers.provider.getBalance(
        dxs.address
      );
      const afterWithdrawSupplierBalance = await ethers.provider.getBalance(
        supplier.address
      );
      expect(afterWithdrawDXSBalance).to.be.greaterThan(baseDXSBalance);
      expect(afterWithdrawSupplierBalance).to.be.greaterThan(
        baseSupplierBalance
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

  describe('Change DXS Tests', function () {
    it('Should allow owner to change DXS address', async function () {
      const { marketPlaceFeesInstance, owner, user1 } = await loadFixture(
        deployMarketPlaceFees
      );
      const newDXS = user1.address;

      await marketPlaceFeesInstance.connect(owner).setDXS(newDXS);
      expect(await marketPlaceFeesInstance.dxs()).to.equal(user1.address);
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

  describe('Change Max VAT Tests', function () {
    it('Should allow owner to change max VAT', async function () {
      const { marketPlaceFeesInstance, owner } = await loadFixture(
        deployMarketPlaceFees
      );
      const newMaxVAT = 22;

      await marketPlaceFeesInstance.connect(owner).setMaxVAT(newMaxVAT);
      expect(await marketPlaceFeesInstance.maxVAT()).to.equal(newMaxVAT);
    });
  });

  describe('Failure Tests', function () {
    it('Should not allow users to buy products below the minimum price', async function () {
      const { marketPlaceFeesInstance, user1 } = await loadFixture(
        deployMarketPlaceFees
      );

      await expect(
        marketPlaceFeesInstance.connect(user1).buyProduct({
          value: ethers.utils.parseEther('0.00005'),
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
