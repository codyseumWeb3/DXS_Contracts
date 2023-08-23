import { ethers } from 'hardhat';
import { addresses } from './addresses';

async function main() {
  const MarketPlaceFees = await ethers.getContractFactory('MarketPlaceFees');
  const contract = await MarketPlaceFees.deploy(
    addresses.daoWalletAddress,
    addresses.devWalletAddress,
    addresses.incentiveWalletAddress,
    addresses.supplierWalletAddress,
    addresses.sellerWalletAddress
  );

  await contract.deployed();

  console.log(`MarketPlaceFees contract deployed to ${contract.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
