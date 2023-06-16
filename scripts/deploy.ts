import { ethers } from "hardhat";

async function main() {
  const devWalletAddress = "0x684653D5315f1Cb36cE13814F42C7f83F1791168";
  const daoWalletAddress = "0x91C4594072Fc6D62D7Af2772c0E9309E8F380d72";

  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(daoWalletAddress, devWalletAddress);

  await escrow.deployed();

  console.log(`Escrow contract deployed to ${escrow.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
