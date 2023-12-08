import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('MoneyReceiver Contract Tests', function () {
  async function deployMoneyReceiverFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const MoneyReceiverFactory = await ethers.getContractFactory(
      'MoneyReceiver'
    );
    const moneyReceiverInstance = await MoneyReceiverFactory.deploy(
      otherAccount.address
    );

    // Mock ERC20 token for testing
    const ERC20Factory = await ethers.getContractFactory('Token');
    const mockERC20 = await ERC20Factory.deploy(
      'MockToken',
      'MCK',
      ethers.utils.parseEther('1000')
    );

    return { moneyReceiverInstance, owner, otherAccount, mockERC20 };
  }

  describe('Deployment Tests', function () {
    it('Should set the correct owner', async function () {
      const { moneyReceiverInstance, owner } = await loadFixture(
        deployMoneyReceiverFixture
      );
      expect(await moneyReceiverInstance.owner()).to.equal(owner.address);
    });
  });

  describe('Ether Withdrawal Tests', function () {
    it('Should allow the owner to withdraw Ether', async function () {
      const { moneyReceiverInstance, owner, otherAccount } = await loadFixture(
        deployMoneyReceiverFixture
      );

      // Send Ether to the contract
      const tx = {
        to: moneyReceiverInstance.address,
        value: ethers.utils.parseEther('1'),
      };
      await owner.sendTransaction(tx);

      // Withdraw Ether
      await moneyReceiverInstance.connect(owner).withdrawMoney();

      expect(
        await ethers.provider.getBalance(moneyReceiverInstance.address)
      ).to.equal(0);
    });

    it('Should not allow non-owner to withdraw Ether', async function () {
      const { moneyReceiverInstance, otherAccount } = await loadFixture(
        deployMoneyReceiverFixture
      );

      await expect(
        moneyReceiverInstance.connect(otherAccount).withdrawMoney()
      ).to.be.revertedWith('You are not the contract owner.');
    });
  });

  describe('ERC20 Token Withdrawal Tests', function () {
    it('Should allow the owner to withdraw ERC20 tokens', async function () {
      const { moneyReceiverInstance, owner, otherAccount, mockERC20 } =
        await loadFixture(deployMoneyReceiverFixture);

      // Transfer ERC20 tokens to the contract
      await mockERC20.transfer(
        moneyReceiverInstance.address,
        ethers.utils.parseEther('100')
      );

      // Withdraw ERC20 tokens
      await moneyReceiverInstance
        .connect(owner)
        .withdrawERC20(mockERC20.address);

      expect(await mockERC20.balanceOf(moneyReceiverInstance.address)).to.equal(
        0
      );
    });

    it('Should not allow non-owner to withdraw ERC20 tokens', async function () {
      const { moneyReceiverInstance, otherAccount, mockERC20 } =
        await loadFixture(deployMoneyReceiverFixture);

      await expect(
        moneyReceiverInstance
          .connect(otherAccount)
          .withdrawERC20(mockERC20.address)
      ).to.be.revertedWith('You are not the contract owner.');
    });
  });

  describe('Receiving Ether Tests', function () {
    it('Should receive Ether correctly', async function () {
      const { moneyReceiverInstance, owner } = await loadFixture(
        deployMoneyReceiverFixture
      );

      // Send Ether to the contract
      const tx = {
        to: moneyReceiverInstance.address,
        value: ethers.utils.parseEther('1'),
      };
      await owner.sendTransaction(tx);

      const balance = await ethers.provider.getBalance(
        moneyReceiverInstance.address
      );
      expect(balance).to.equal(ethers.utils.parseEther('1'));
    });
  });

  describe('Fallback Function Tests', function () {
    it('Should handle plain Ether transfers via fallback', async function () {
      const { moneyReceiverInstance, owner } = await loadFixture(
        deployMoneyReceiverFixture
      );

      // Simulate sending Ether without data to trigger fallback
      const tx = {
        to: moneyReceiverInstance.address,
        value: ethers.utils.parseEther('0.5'),
      };
      await owner.sendTransaction(tx);

      const balance = await ethers.provider.getBalance(
        moneyReceiverInstance.address
      );
      expect(balance).to.equal(ethers.utils.parseEther('0.5'));
    });
  });
});
