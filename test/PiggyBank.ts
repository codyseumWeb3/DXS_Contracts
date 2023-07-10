import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import bigInt from 'big-integer';
import { ethers } from 'hardhat';

describe('PiggyBank Contract Tests', function () {
  async function deployPiggyBank() {
    const [owner, dev, dao, incentive, user1, user2, user3, user4] =
      await ethers.getSigners();

    const PiggyBankFactory = await ethers.getContractFactory('PiggyBank');
    const piggyBankInstance = await PiggyBankFactory.deploy(
      dao.address,
      dev.address,
      incentive.address
    );

    return { piggyBankInstance, owner, user1, user2, user3, user4 };
  }

  describe('Deployment Tests', function () {
    it('Should deploy the contract and set the owner correctly', async function () {
      const { piggyBankInstance, owner } = await loadFixture(deployPiggyBank);

      expect(await piggyBankInstance.owner()).to.equal(owner.address);
    });
  });

  describe('Deposit Tests', function () {
    it('Should allow users to deposit Ether', async function () {
      const { piggyBankInstance, user1 } = await loadFixture(deployPiggyBank);

      const depositAmount = ethers.utils.parseEther('1');
      const initialBalance = await piggyBankInstance.pendingBalance(
        user1.address
      );

      await piggyBankInstance
        .connect(user1)
        .makeOrder({ value: depositAmount });

      expect(await piggyBankInstance.pendingBalance(user1.address)).to.equal(
        initialBalance.add(depositAmount)
      );
    });
  });

  describe('Seller Payment Tests', function () {
    it('Should allow owner to pay sellers', async function () {
      const { piggyBankInstance, owner, user1 } = await loadFixture(
        deployPiggyBank
      );
      const paymentAmount = ethers.utils.parseEther('1');

      await piggyBankInstance
        .connect(user1)
        .makeOrder({ value: paymentAmount });

      // Pay the seller and check the contract balance and pendingBalance
      await piggyBankInstance
        .connect(owner)
        .paySeller(user1.address, user1.address, paymentAmount);
      expect(await piggyBankInstance.pendingBalance(user1.address)).to.equal(0);
    });
  });

  describe('Seller Batch Payment Tests', function () {
    it('Should allow owner to pay several sellers in one transaction', async function () {
      const { piggyBankInstance, owner, user1, user2, user3, user4 } =
        await loadFixture(deployPiggyBank);

      const paymentAmount = ethers.utils.parseEther('1');
      const paymentAmount2 = ethers.utils.parseEther('2');
      const paymentAmount3 = ethers.utils.parseEther('3');

      // Make orders
      await piggyBankInstance
        .connect(user1)
        .makeOrder({ value: paymentAmount });
      await piggyBankInstance
        .connect(user2)
        .makeOrder({ value: paymentAmount2 });
      await piggyBankInstance
        .connect(user3)
        .makeOrder({ value: paymentAmount3 });

      // user4 is not a buyer, his pendingPalance is 0
      await expect(
        piggyBankInstance
          .connect(owner)
          .batchPaySeller(
            [user1.address, user2.address, user4.address],
            [user1.address, user2.address, user4.address],
            [paymentAmount, paymentAmount2, paymentAmount3]
          )
      ).to.be.revertedWith('Not enough buyer balance for this seller.');

      const user4BalanceBefore = await ethers.provider.getBalance(
        user4.address
      );

      // Pay the sellers and check the contract balance and pendingBalance
      await piggyBankInstance
        .connect(owner)
        .batchPaySeller(
          [user1.address, user2.address, user4.address],
          [user1.address, user2.address, user3.address],
          [paymentAmount, paymentAmount2, paymentAmount3]
        );

      // Validate the pending balances
      expect(await piggyBankInstance.pendingBalance(user1.address)).to.equal(0);
      expect(await piggyBankInstance.pendingBalance(user2.address)).to.equal(0);
      expect(await piggyBankInstance.pendingBalance(user3.address)).to.equal(0);

      const user4BalanceAfter = await ethers.provider.getBalance(user4.address);
      const user4Earnings = bigInt(user4BalanceAfter.toString())
        .subtract(bigInt(user4BalanceBefore.toString()))
        .toString();

      // Validate the ETH/wei balance of user4,
      // he should have earned 94,5% of user3's ex-balance
      expect(user4Earnings).to.equal(
        bigInt(paymentAmount3.toString())
          .times(bigInt('945'))
          .divide(bigInt('1000'))
          .toString()
      );
    });
  });

  describe('Refund Tests', function () {
    it('Should allow owner to refund buyers', async function () {
      const { piggyBankInstance, owner, user1 } = await loadFixture(
        deployPiggyBank
      );
      const depositAmount = ethers.utils.parseEther('1');

      await piggyBankInstance
        .connect(user1)
        .makeOrder({ value: depositAmount });

      await piggyBankInstance
        .connect(owner)
        .refund(user1.address, depositAmount);
      expect(await piggyBankInstance.pendingBalance(user1.address)).to.equal(0);
    });
  });

  describe('Ownership Transfer Tests', function () {
    it('Should allow owner to transfer ownership', async function () {
      const { piggyBankInstance, owner, user2 } = await loadFixture(
        deployPiggyBank
      );

      await piggyBankInstance.connect(owner).transferOwnership(user2.address);
      expect(await piggyBankInstance.owner()).to.equal(user2.address);
    });
  });

  describe('Change Product Price Tests', function () {
    it('Should allow owner to change minimum product price', async function () {
      const { piggyBankInstance, owner } = await loadFixture(deployPiggyBank);
      const newMinProductPrice = ethers.utils.parseEther('0.02');

      await piggyBankInstance
        .connect(owner)
        .setMinProductPrice(newMinProductPrice);
      expect(await piggyBankInstance.minProductPrice()).to.equal(
        newMinProductPrice
      );
    });
  });

  describe('Failure Tests', function () {
    it('Should not allow users to deposit below the minimum product price', async function () {
      const { piggyBankInstance, user1 } = await loadFixture(deployPiggyBank);

      await expect(
        piggyBankInstance
          .connect(user1)
          .makeOrder({ value: ethers.utils.parseEther('0.005') })
      ).to.be.revertedWith('Value sent is too low.');
    });

    it('Should not allow non-owners to pay sellers', async function () {
      const { piggyBankInstance, user1, user2 } = await loadFixture(
        deployPiggyBank
      );
      const depositAmount = ethers.utils.parseEther('1');

      await piggyBankInstance
        .connect(user1)
        .makeOrder({ value: depositAmount });

      await expect(
        piggyBankInstance
          .connect(user2)
          .paySeller(user1.address, user1.address, depositAmount)
      ).to.be.revertedWith('You are not the contract Owner.');
    });

    it('Should not allow non-owners to refund buyers', async function () {
      const { piggyBankInstance, user1, user2 } = await loadFixture(
        deployPiggyBank
      );
      const depositAmount = ethers.utils.parseEther('1');

      await piggyBankInstance
        .connect(user1)
        .makeOrder({ value: depositAmount });

      await expect(
        piggyBankInstance.connect(user2).refund(user1.address, depositAmount)
      ).to.be.revertedWith('You are not the contract Owner.');
    });

    it('Should not allow non-owners to transfer ownership', async function () {
      const { piggyBankInstance, user1, user2 } = await loadFixture(
        deployPiggyBank
      );

      await expect(
        piggyBankInstance.connect(user1).transferOwnership(user2.address)
      ).to.be.revertedWith('You are not the contract Owner.');
    });

    it('Should not allow non-owners to change minimum product price', async function () {
      const { piggyBankInstance, user1 } = await loadFixture(deployPiggyBank);
      const newMinProductPrice = ethers.utils.parseEther('0.02');

      await expect(
        piggyBankInstance.connect(user1).setMinProductPrice(newMinProductPrice)
      ).to.be.revertedWith('You are not the contract Owner.');
    });
  });
});
