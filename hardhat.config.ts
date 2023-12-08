import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
require('dotenv').config()
import 'hardhat-gas-reporter'

const privateKey = process.env.PK!
const etherscanApiKey = process.env.ETHERSCAN_API_KEY! // Ensure this is set in your .env file

const isPKValid = /^(0x)?[0-9a-fA-F]{64}$/.test(privateKey)

const config: HardhatUserConfig = {
  gasReporter: {
    currency: 'USD',
    gasPrice: 27,
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    ...(isPKValid
      ? {
          sepolia: {
            url: 'https://eth-sepolia.g.alchemy.com/v2/FfmH35zf4fifvH3eFrKPTSRi8IUW4aRV',
            accounts: [privateKey],
          },
        }
      : {}),
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
    apiKey: etherscanApiKey,
  },
}

export default config
