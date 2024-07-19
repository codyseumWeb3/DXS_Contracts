import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('FidelityProgram Contract Tests', function () {
  async function deployFidelityProgram() {
    const [owner, user1, user2] = await ethers.getSigners();
    const DxsToken = await ethers.getContractFactory('Token');
    const dxsTokenInstance = await DxsToken.deploy(
      'Dxs Token',
      'DXS',
      ethers.utils.parseEther('10000')
    );

    const FidelityProgramFactory = await ethers.getContractFactory(
      'FidelityProgram'
    );
    const fidelityProgramInstance = await FidelityProgramFactory.deploy(
      dxsTokenInstance.address,
      30 * 24 * 60 * 60
    );

    await dxsTokenInstance.transfer(
      user1.address,
      ethers.utils.parseEther('1000')
    );
    await dxsTokenInstance.transfer(
      user2.address,
      ethers.utils.parseEther('1000')
    );

    return {
      fidelityProgramInstance,
      dxsTokenInstance,
      owner,
      user1,
      user2,
    };
  }

  describe('Deployment Tests', function () {
    it('Should deploy the contract and set the token address correctly', async function () {
      const { fidelityProgramInstance, dxsTokenInstance } = await loadFixture(
        deployFidelityProgram
      );

      expect(await fidelityProgramInstance.dxsToken()).to.equal(
        dxsTokenInstance.address
      );
    });

    it('Should set the initial staking period correctly', async function () {
      const { fidelityProgramInstance } = await loadFixture(
        deployFidelityProgram
      );

      expect(await fidelityProgramInstance.stakingPeriod()).to.equal(
        30 * 24 * 60 * 60
      );
    });
  });

  describe('Staking Tests', function () {
    it('Should allow users to stake tokens', async function () {
      const { fidelityProgramInstance, dxsTokenInstance, user1 } =
        await loadFixture(deployFidelityProgram);

      await dxsTokenInstance
        .connect(user1)
        .approve(
          fidelityProgramInstance.address,
          ethers.utils.parseEther('100')
        );
      await fidelityProgramInstance
        .connect(user1)
        .stake(ethers.utils.parseEther('100'));

      expect(
        await fidelityProgramInstance.getStakedAmount(user1.address)
      ).to.equal(ethers.utils.parseEther('100'));
    });

    it('Should emit an event when tokens are staked', async function () {
      const { fidelityProgramInstance, dxsTokenInstance, user1 } =
        await loadFixture(deployFidelityProgram);

      await dxsTokenInstance
        .connect(user1)
        .approve(
          fidelityProgramInstance.address,
          ethers.utils.parseEther('100')
        );

      const tx = await fidelityProgramInstance
        .connect(user1)
        .stake(ethers.utils.parseEther('100'));

      const receipt = await tx.wait();
      const blockTimestamp = (
        await ethers.provider.getBlock(receipt.blockNumber)
      ).timestamp;

      await expect(tx)
        .to.emit(fidelityProgramInstance, 'Staked')
        .withArgs(
          user1.address,
          ethers.utils.parseEther('100'),
          blockTimestamp
        );
    });

    it('Should revert if staking amount is zero', async function () {
      const { fidelityProgramInstance, user1 } = await loadFixture(
        deployFidelityProgram
      );

      await expect(
        fidelityProgramInstance.connect(user1).stake(0)
      ).to.be.revertedWith('Amount must be greater than 0.');
    });

    it('Should revert if token transfer fails', async function () {
      const { fidelityProgramInstance, user1 } = await loadFixture(
        deployFidelityProgram
      );

      // Trying to stake more tokens than user1 has approved or has balance for.
      await expect(
        fidelityProgramInstance
          .connect(user1)
          .stake(ethers.utils.parseEther('2000'))
      ).to.be.revertedWith('ERC20: insufficient allowance');
    });

    it('Should allow users to stake multiple times and accumulate correctly', async function () {
      const { fidelityProgramInstance, dxsTokenInstance, user1 } =
        await loadFixture(deployFidelityProgram);

      await dxsTokenInstance
        .connect(user1)
        .approve(
          fidelityProgramInstance.address,
          ethers.utils.parseEther('200')
        );
      await fidelityProgramInstance
        .connect(user1)
        .stake(ethers.utils.parseEther('100'));
      await fidelityProgramInstance
        .connect(user1)
        .stake(ethers.utils.parseEther('100'));

      expect(
        await fidelityProgramInstance.getStakedAmount(user1.address)
      ).to.equal(ethers.utils.parseEther('200'));
    });

    it('Should allow users to stake again after unstaking', async function () {
      const { fidelityProgramInstance, dxsTokenInstance, user1 } =
        await loadFixture(deployFidelityProgram);

      // First stake
      await dxsTokenInstance
        .connect(user1)
        .approve(
          fidelityProgramInstance.address,
          ethers.utils.parseEther('100')
        );
      await fidelityProgramInstance
        .connect(user1)
        .stake(ethers.utils.parseEther('100'));

      // Fast forward time to allow unstaking
      await ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60 + 1]);
      await ethers.provider.send('evm_mine', []);

      // Unstake
      await fidelityProgramInstance.connect(user1).unstake();

      // Approve and stake again
      await dxsTokenInstance
        .connect(user1)
        .approve(
          fidelityProgramInstance.address,
          ethers.utils.parseEther('100')
        );
      await fidelityProgramInstance
        .connect(user1)
        .stake(ethers.utils.parseEther('100'));

      expect(
        await fidelityProgramInstance.getStakedAmount(user1.address)
      ).to.equal(ethers.utils.parseEther('100'));
    });
  });

  describe('Unstaking Tests', function () {
    it('Should allow users to unstake tokens after staking period', async function () {
      const { fidelityProgramInstance, dxsTokenInstance, user1 } =
        await loadFixture(deployFidelityProgram);

      await dxsTokenInstance
        .connect(user1)
        .approve(
          fidelityProgramInstance.address,
          ethers.utils.parseEther('100')
        );
      await fidelityProgramInstance
        .connect(user1)
        .stake(ethers.utils.parseEther('100'));

      await ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60 + 1]);
      await ethers.provider.send('evm_mine', []);

      await fidelityProgramInstance.connect(user1).unstake();
      expect(await dxsTokenInstance.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther('1000')
      );
    });

    it('Should emit an event when tokens are unstaked', async function () {
      const { fidelityProgramInstance, dxsTokenInstance, user1 } =
        await loadFixture(deployFidelityProgram);

      await dxsTokenInstance
        .connect(user1)
        .approve(
          fidelityProgramInstance.address,
          ethers.utils.parseEther('100')
        );
      await fidelityProgramInstance
        .connect(user1)
        .stake(ethers.utils.parseEther('100'));

      await ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60 + 1]);
      await ethers.provider.send('evm_mine', []);

      await expect(fidelityProgramInstance.connect(user1).unstake())
        .to.emit(fidelityProgramInstance, 'Unstaked')
        .withArgs(user1.address, ethers.utils.parseEther('100'));
    });

    it('Should revert if no tokens are staked', async function () {
      const { fidelityProgramInstance, user1 } = await loadFixture(
        deployFidelityProgram
      );

      await expect(
        fidelityProgramInstance.connect(user1).unstake()
      ).to.be.revertedWith('No tokens staked.');
    });

    it('Should revert if staking period is not yet completed', async function () {
      const { fidelityProgramInstance, dxsTokenInstance, user1 } =
        await loadFixture(deployFidelityProgram);

      await dxsTokenInstance
        .connect(user1)
        .approve(
          fidelityProgramInstance.address,
          ethers.utils.parseEther('100')
        );
      await fidelityProgramInstance
        .connect(user1)
        .stake(ethers.utils.parseEther('100'));

      await expect(
        fidelityProgramInstance.connect(user1).unstake()
      ).to.be.revertedWith('Staking period not yet completed.');
    });

    it('Should handle staking and unstaking at boundary conditions correctly', async function () {
      const { fidelityProgramInstance, dxsTokenInstance, user1 } =
        await loadFixture(deployFidelityProgram);

      await dxsTokenInstance
        .connect(user1)
        .approve(
          fidelityProgramInstance.address,
          ethers.utils.parseEther('100')
        );
      await fidelityProgramInstance
        .connect(user1)
        .stake(ethers.utils.parseEther('100'));

      await ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine', []);

      await fidelityProgramInstance.connect(user1).unstake();
      expect(await dxsTokenInstance.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther('1000')
      );
    });
  });

  it('Should revert if a non-owner tries to call owner-only functions', async function () {
    const { fidelityProgramInstance, user1 } = await loadFixture(
      deployFidelityProgram
    );

    await expect(
      fidelityProgramInstance
        .connect(user1)
        .updateStakingPeriod(60 * 24 * 60 * 60)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  describe('Staking Period Update Tests', function () {
    it('Should allow owner to update staking period', async function () {
      const { fidelityProgramInstance, owner } = await loadFixture(
        deployFidelityProgram
      );

      await fidelityProgramInstance
        .connect(owner)
        .updateStakingPeriod(60 * 24 * 60 * 60);

      expect(await fidelityProgramInstance.stakingPeriod()).to.equal(
        60 * 24 * 60 * 60
      );
    });

    it('Should emit an event when staking period is updated', async function () {
      const { fidelityProgramInstance, owner } = await loadFixture(
        deployFidelityProgram
      );

      await expect(
        fidelityProgramInstance
          .connect(owner)
          .updateStakingPeriod(60 * 24 * 60 * 60)
      )
        .to.emit(fidelityProgramInstance, 'StakingPeriodUpdated')
        .withArgs(60 * 24 * 60 * 60);
    });

    it('Should revert if new staking period exceeds maximum limit', async function () {
      const { fidelityProgramInstance, owner } = await loadFixture(
        deployFidelityProgram
      );

      await expect(
        fidelityProgramInstance
          .connect(owner)
          .updateStakingPeriod(70 * 24 * 60 * 60)
      ).to.be.revertedWith('New staking period exceeds maximum limit');
    });

    it('Should revert if a non-owner tries to update staking period', async function () {
      const { fidelityProgramInstance, user1 } = await loadFixture(
        deployFidelityProgram
      );

      await expect(
        fidelityProgramInstance
          .connect(user1)
          .updateStakingPeriod(60 * 24 * 60 * 60)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('Should handle the exact MAX_STAKING_PERIOD correctly', async function () {
      const { fidelityProgramInstance, owner } = await loadFixture(
        deployFidelityProgram
      );

      await fidelityProgramInstance
        .connect(owner)
        .updateStakingPeriod(60 * 24 * 60 * 60);
      expect(await fidelityProgramInstance.stakingPeriod()).to.equal(
        60 * 24 * 60 * 60
      );
    });
  });
});
