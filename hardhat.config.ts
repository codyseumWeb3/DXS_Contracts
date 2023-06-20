import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
require('dotenv').config()
import 'hardhat-gas-reporter'

const privateKey = process.env.PK!

// Ethereum private key should be exactly 64 characters long (excluding `0x` prefix)
// and should consist of only hexadecimal characters (0-9, a-f).
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
            url: 'https://eth-sepolia.g.alchemy.com/v2/FfmH35zf4fifvH3eFrKPTSRi8IUW4aRV', // replace with your Sepolia RPC URL
            accounts: [privateKey], // replace with your account private key
          },
        }
      : {}),
  },

  solidity: {
    version: '0.8.18', // replace with your Solidity version
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
}

export default config
