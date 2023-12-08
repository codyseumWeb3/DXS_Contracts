import { ethers, run } from 'hardhat';
import { addresses } from './addresses';

async function main() {
  console.log("Initializing contract factory...");
  const MarketPlaceFees = await ethers.getContractFactory('MarketPlaceFees');
  console.log("Contract factory initialized.");

  console.log("Deploying contract...");
  const contract = await MarketPlaceFees.deploy(
    addresses.dxsWalletAddress,
    addresses.supplierWalletAddress
  );

  console.log("Awaiting contract deployment...");
  await contract.deployed();
  console.log(`MarketPlaceFees contract deployed to ${contract.address}`);

  if (process.env.VERIFY === 'true') {
    console.log("Starting verification process. Environment variable VERIFY is set to true.");

    console.log("Waiting 60 seconds before starting verification...");
    await delay(60000); // Delay for 60 seconds

    for (let i = 0; i < 3; i++) { // Retry up to 3 times
      try {
        console.log(`Verification attempt ${i + 1}...`);
        await run('verify:verify', {
          address: contract.address,
          constructorArguments: [
            addresses.dxsWalletAddress,
            addresses.supplierWalletAddress,
          ],
        });
        console.log('Contract verified on Etherscan');
        break; // Break the loop if verification is successful
      } catch (error) {
        console.error(`Attempt ${i + 1} failed to verify contract on Etherscan:`, error);
        if (i < 2) {
          console.log(`Waiting 30 seconds before retrying attempt ${i + 2}...`);
          await delay(30000); // Wait for 30 seconds before retrying
        }
      }
    }
  } else {
    console.log("Skipping contract verification. Environment variable VERIFY is not set to true.");
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error("Deployment script encountered an error:", error);
});
