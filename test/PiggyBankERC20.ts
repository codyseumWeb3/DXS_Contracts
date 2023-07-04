import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';

describe('PiggyBankERC20 Contract Tests', function () {
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

  async function deployPiggyBank() {
    const { tokenOwner, token } = await deployToken();
    const [owner, dev, dao, incentive, user1, user2] =
      await ethers.getSigners();
    const PiggyBankFactory = await ethers.getContractFactory('PiggyBankERC20');
    const piggyBankInstance = await PiggyBankFactory.deploy(
      dao.address,
      dev.address,
      incentive.address,
      token.address
    );

    return { piggyBankInstance, owner, user1, user2, tokenOwner, token };
  }

  describe('Deployment Tests', function () {
    it('Should deploy the contract and set the owner correctly', async function () {
      const { piggyBankInstance, owner } = await loadFixture(deployPiggyBank);

      expect(await piggyBankInstance.owner()).to.equal(owner.address);
    });
  });

  describe('Deposit Tests', function () {
    it('Should allow users to deposit Token', async function () {
      const { piggyBankInstance, user1, tokenOwner } = await loadFixture(
        deployPiggyBank
      );

      const depositAmount = ethers.utils.parseEther('10');
      const initialBalance = await piggyBankInstance.pendingBalance(
        user1.address
      );

      await token.connect(tokenOwner).transfer(user1.address, depositAmount);

      await token
        .connect(user1)
        .approve(piggyBankInstance.address, depositAmount);

      await piggyBankInstance.connect(user1).makeOrder(depositAmount);

      expect(await piggyBankInstance.pendingBalance(user1.address)).to.equal(
        initialBalance.add(depositAmount)
      );
    });
  });

  describe('Seller Payment Tests', function () {
    it('Should allow owner to pay sellers', async function () {
      const { piggyBankInstance, owner, user1, tokenOwner } = await loadFixture(
        deployPiggyBank
      );
      const paymentAmount = ethers.utils.parseEther('10');

      await token.connect(tokenOwner).transfer(user1.address, paymentAmount);

      await token
        .connect(user1)
        .approve(piggyBankInstance.address, paymentAmount);

      await piggyBankInstance.connect(user1).makeOrder(paymentAmount);

      // Pay the seller and check the contract balance and pendingBalance
      await piggyBankInstance
        .connect(owner)
        .paySeller(user1.address, user1.address, paymentAmount);
      expect(await piggyBankInstance.pendingBalance(user1.address)).to.equal(0);
    });
  });

  describe('Refund Tests', function () {
    it('Should allow owner to refund buyers', async function () {
      const { piggyBankInstance, owner, user1, tokenOwner } = await loadFixture(
        deployPiggyBank
      );
      const depositAmount = ethers.utils.parseEther('10');

      await token.connect(tokenOwner).transfer(user1.address, depositAmount);

      await token
        .connect(user1)
        .approve(piggyBankInstance.address, depositAmount);

      await piggyBankInstance.connect(user1).makeOrder(depositAmount);

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
          .makeOrder(ethers.utils.parseEther('0.005'))
      ).to.be.revertedWith('Value sent is too low.');
    });

    it('Should not allow non-owners to pay sellers', async function () {
      const { piggyBankInstance, user1, user2, tokenOwner } = await loadFixture(
        deployPiggyBank
      );
      const depositAmount = ethers.utils.parseEther('10');

      await token.connect(tokenOwner).transfer(user1.address, depositAmount);

      await token
        .connect(user1)
        .approve(piggyBankInstance.address, depositAmount);

      await piggyBankInstance.connect(user1).makeOrder(depositAmount);

      await expect(
        piggyBankInstance
          .connect(user2)
          .paySeller(user1.address, user1.address, depositAmount)
      ).to.be.revertedWith('You are not the contract Owner.');
    });

    it('Should not allow non-owners to refund buyers', async function () {
      const { piggyBankInstance, user1, user2, tokenOwner } = await loadFixture(
        deployPiggyBank
      );
      const depositAmount = ethers.utils.parseEther('10');

      await token.connect(tokenOwner).transfer(user1.address, depositAmount);

      await token
        .connect(user1)
        .approve(piggyBankInstance.address, depositAmount);

      await piggyBankInstance.connect(user1).makeOrder(depositAmount);

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
