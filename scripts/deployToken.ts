import { ethers, run } from 'hardhat';

async function main() {
  const deployer = (await ethers.getSigners())[0]; // Get deployer's address
  const DXSToken = await ethers.getContractFactory('DXS');

  const DXSContract = await DXSToken.deploy();
  await DXSContract.deployed();
  console.log(
    `DXS Token contract deployed to ${DXSContract.address} by ${deployer.address}`
  );

  if (process.env.VERIFY === 'true') {
    console.log('Contract verification process initiated...');
    console.log('Waiting 60 seconds before starting verification...');
    await delay(60000);

    for (let i = 0; i < 3; i++) {
      try {
        console.log(
          `Verification attempt ${i + 1} for DXS Token contract...`
        );
        await run('verify:verify', {
          address: DXSContract.address,
          constructorArguments: [],
        });
        console.log('Contract verified on Etherscan.');
        break;
      } catch (error) {
        console.error(`Verification attempt ${i + 1} failed:`, error);
        if (i === 2)
          console.log('Final attempt failed. Verification was not successful.');
        else console.log(`Retrying verification in 30 seconds...`);
        await delay(30000);
      }
    }
  } else {
    console.log('Skipping contract verification (VERIFY not set to true).');
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error('Deployment script encountered an error:', error);
  process.exitCode = 1;
});
