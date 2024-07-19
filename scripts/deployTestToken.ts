import { ethers, run } from 'hardhat';

async function main() {
  try {
    // Get the deployer's address
    const [deployer] = await ethers.getSigners();

    // Get the contract factory for the Token
    const DXSToken = await ethers.getContractFactory('Token');

    // Deploy the Token contract with initial parameters
    const dxsTokenInstance = await DXSToken.deploy(
      'Dxs Token Test',
      'DXS_test',
      ethers.utils.parseEther('10000')
    );

    // Wait for the contract to be deployed
    await dxsTokenInstance.deployed();

    // Log the address of the deployed contract and the deployer's address
    console.log(`DXS Token contract deployed to ${dxsTokenInstance.address} by ${deployer.address}`);

    // Contract verification process if VERIFY is set to true
    if (process.env.VERIFY === 'true') {
      console.log('Contract verification process initiated...');
      console.log('Waiting 60 seconds before starting verification...');
      await delay(60000);

      for (let i = 0; i < 3; i++) {
        try {
          console.log(`Verification attempt ${i + 1} for DXS Token contract...`);
          await run('verify:verify', {
            address: dxsTokenInstance.address,
            constructorArguments: [
              'Dxs Token Test',
              'DXS_test',
              ethers.utils.parseEther('10000'),
            ],
          });
          console.log('Contract verified on Etherscan.');
          break;
        } catch (error) {
          console.error(`Verification attempt ${i + 1} failed:`, error.message);
          if (i === 2) {
            console.log('Final attempt failed. Verification was not successful.');
          } else {
            console.log('Retrying verification in 30 seconds...');
            await delay(30000);
          }
        }
      }
    } else {
      console.log('Skipping contract verification (VERIFY not set to true).');
    }
  } catch (error) {
    console.error('Deployment script encountered an error:', error.message);
    process.exitCode = 1;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error('Main function encountered an error:', error.message);
  process.exitCode = 1;
});
