import { ethers } from 'hardhat';
import { addresses } from './addresses';

async function main() {
  const MoneyReceiver = await ethers.getContractFactory('MoneyReceiver');
  const contract = await MoneyReceiver.deploy(addresses.MoneyReceiverDXS);

  await contract.deployed();

  console.log(`MoneyReceiver contract deployed to ${contract.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
