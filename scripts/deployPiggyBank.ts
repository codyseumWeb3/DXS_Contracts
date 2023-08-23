import { ethers } from 'hardhat';
import { addresses } from './addresses';

async function main() {
  const PiggyBank = await ethers.getContractFactory('PiggyBank');
  const contract = await PiggyBank.deploy(
    addresses.daoWalletAddress,
    addresses.devWalletAddress,
    addresses.arbitratorWalletAddress
  );

  await contract.deployed();

  console.log(`PiggyBank contract deployed to ${contract.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
