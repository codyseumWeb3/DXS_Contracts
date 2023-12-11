import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
require('dotenv').config();
import 'hardhat-gas-reporter';

const privateKey1 = process.env.PK_1!;
const privateKey2 = process.env.PK_2!;
const privateKey3 = process.env.PK_3!;
const etherscanApiKey = process.env.ETHERSCAN_API_KEY!;

function isPrivateKeyValid(pk: string) {
  return /^(0x)?[0-9a-fA-F]{64}$/.test(pk);
}

const privateKeys = [privateKey1, privateKey2, privateKey3];

privateKeys.forEach((pk, index) => {
  if (!isPrivateKeyValid(pk)) {
    console.error(`Private Key ${index + 1} is invalid: ${pk}`);
    process.exit(1);
  }
});

const config: HardhatUserConfig = {
  gasReporter: {
    currency: 'USD',
    gasPrice: 27,
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},

    sepolia: {
      url: 'https://eth-sepolia.g.alchemy.com/v2/FfmH35zf4fifvH3eFrKPTSRi8IUW4aRV',
      accounts: [privateKey1, privateKey2, privateKey3],
    },
  },
  solidity: {
    version: '0.8.18',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  etherscan: {
    apiKey: {
      mainnet: etherscanApiKey,
      sepolia: etherscanApiKey,
    },
  },
};

export default config;
