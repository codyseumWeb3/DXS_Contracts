import { ethers } from 'hardhat';

async function main() {
  const daoWalletAddress = '0x91C4594072Fc6D62D7Af2772c0E9309E8F380d72';
  const devWalletAddress = '0x684653D5315f1Cb36cE13814F42C7f83F1791168';
  const incentiveWalletAddress = '0x91C4594072Fc6D62D7Af2772c0E9309E8F380d72';
  const supplierWalletAddress = '0x91C4594072Fc6D62D7Af2772c0E9309E8F380d72';
  const sellerWalletAddress = '0x91C4594072Fc6D62D7Af2772c0E9309E8F380d72';

  const MarketPlaceFees = await ethers.getContractFactory('MarketPlaceFees');
  const contract = await MarketPlaceFees.deploy(
    daoWalletAddress,
    devWalletAddress,
    incentiveWalletAddress,
    supplierWalletAddress,
    sellerWalletAddress
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
