import { ethers, run } from 'hardhat';
import { addresses } from './addresses';
import fs from 'fs';
import path from 'path';

const MoneyReceiverName = 'MoneyReceiver';
const MarketPlaceFeesName = 'MarketPlaceFees';

function generateTypeScriptFile(
  contractName: string,
  contractDetails: any,
  contractFactory: any
) {
  const contractABI = contractFactory.interface.format(
    ethers.utils.FormatTypes.json
  );

  const tsContent = `
    export const ${contractName}Details = {
      abi: ${JSON.stringify(contractABI, null, 2)},
      address: "${contractDetails.address}",
      owner: "${contractDetails.owner}",
      argument: ${JSON.stringify(contractDetails.argument, null, 2)}
    };
  `;

  const filePath = path.join(__dirname, `../contractsInfos/${contractName}.ts`);
  fs.writeFileSync(filePath, tsContent);
  console.log(`${contractName}.ts generated successfully.`);
}

async function main() {
  console.log('Retrieving signers...');
  const [dxsReceiverOwner, supplierReceiverOwner, dxsMarketplaceDeployer] =
    await ethers.getSigners();

  console.log('dxsReceiverOwner address:', dxsReceiverOwner.address);
  console.log('SupplierReceiverOwner address:', supplierReceiverOwner.address);
  console.log(
    'dxsMarketplaceDeployer address:',
    dxsMarketplaceDeployer.address
  );

  const signerAddresses = [
    dxsReceiverOwner.address,
    supplierReceiverOwner.address,
    dxsMarketplaceDeployer.address,
  ];

  await checkEnoughBalanceOfAddresses(signerAddresses);

  console.log('Deploying the first MoneyReceiver contract for DXS...');
  const MoneyReceiver1 = await ethers.getContractFactory(
    MoneyReceiverName,
    dxsReceiverOwner
  );

  console.log('Deploying MoneyReceiver for DXS...');
  const DXSReceiver = await MoneyReceiver1.deploy(addresses.MoneyReceiverDXS);
  console.log('Awaiting deployment of MoneyReceiver DXS...');
  await DXSReceiver.deployed();
  console.log(
    `MoneyReceiver DXS deployed to ${DXSReceiver.address} by ${dxsReceiverOwner.address}`
  );

  console.log('Deploying the second MoneyReceiver contract for Supplier...');
  const MoneyReceiver2 = await ethers.getContractFactory(
    MoneyReceiverName,
    supplierReceiverOwner
  );
  console.log('Deploying MoneyReceiver for Supplier...');
  const SupplierReceiver = await MoneyReceiver2.deploy(
    addresses.MoneyReceiverSupplier
  );
  console.log('Awaiting deployment of MoneyReceiver for Supplier...');
  await SupplierReceiver.deployed();
  console.log(
    `MoneyReceiver for Supplier deployed to ${SupplierReceiver.address} by ${supplierReceiverOwner.address}`
  );

  console.log('Initializing MarketPlaceFees contract factory...');
  const MarketPlaceFees = await ethers.getContractFactory(
    MarketPlaceFeesName,
    dxsMarketplaceDeployer
  );
  console.log('MarketPlaceFees contract factory initialized.');

  console.log('Deploying MarketPlaceFees contract...');
  const MarketplaceContract = await MarketPlaceFees.deploy(
    DXSReceiver.address,
    SupplierReceiver.address
  );
  console.log('Awaiting deployment of MarketPlaceFees contract...');
  await MarketplaceContract.deployed();
  console.log(
    `MarketPlaceFees contract deployed to ${MarketplaceContract.address} by ${dxsMarketplaceDeployer.address}`
  );

  generateTypeScriptFile(
    MarketPlaceFeesName,
    {
      address: MarketplaceContract.address,
      owner: dxsMarketplaceDeployer.address,
      argument: {
        DXSReceiver: DXSReceiver.address,
        SupplierReceiver: SupplierReceiver.address,
      },
    },
    MoneyReceiver1
  );

  console.log('Compiling deployment details...');
  const currentDateTime = new Date().toISOString();
  const deployedContracts = {
    deploymentDate: currentDateTime,
    contracts: {
      MoneyReceiverDXS: {
        address: DXSReceiver.address,
        owner: dxsReceiverOwner.address,
        DXSReceiver: addresses.MoneyReceiverDXS,
      },
      MoneyReceiverSupplier: {
        address: SupplierReceiver.address,
        owner: supplierReceiverOwner.address,
        SupplierReceiver: addresses.MoneyReceiverSupplier,
      },
      MarketPlaceFees: {
        address: MarketplaceContract.address,
        owner: dxsMarketplaceDeployer.address,
        feesReceivers: {
          DXSReceiver: DXSReceiver.address,
          SupplierReceiver: SupplierReceiver.address,
        },
      },
    },
  };

  console.log('Writing deployment details to JSON file...');
  fs.writeFileSync(
    `deployedContractsOn${currentDateTime}.json`,
    JSON.stringify(deployedContracts, null, 2)
  );
  console.log('Deployment details saved to JSON file.');

  if (process.env.VERIFY === 'true') {
    console.log('Contract verification process initiated...');
    console.log('Waiting 60 seconds before starting verification...');
    await delay(60000); // Delay for 60 seconds

    for (let i = 0; i < 3; i++) {
      try {
        console.log(
          `Verification attempt ${i + 1} for MarketPlaceFees contract...`
        );
        await run('verify:verify', {
          address: MarketplaceContract.address,
          constructorArguments: [DXSReceiver.address, SupplierReceiver.address],
        });
        console.log('Contract verified on Etherscan.');
        break;
      } catch (error) {
        console.error(`Verification attempt ${i + 1} failed:`, error);
        if (i < 2) {
          console.log(`Retrying verification in 30 seconds...`);
          await delay(30000);
        }
      }
    }
  } else {
    console.log('Skipping contract verification (VERIFY not set to true).');
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error('Deployment script encountered an error:', error);
  process.exitCode = 1;
});

async function checkEnoughBalanceOfAddresses(addresses: string[]) {
  for (const address of addresses) {
    const balance = await ethers.provider.getBalance(address);
    const balanceInEther = ethers.utils.formatEther(balance);

    console.log(`Balance of ${address}: ${balanceInEther} ETH`);

    if (balance.lt(ethers.utils.parseEther('0.25'))) {
      throw new Error(
        `Insufficient balance for ${address}. At least 0.25 ETH required.`
      );
    }
  }
}
