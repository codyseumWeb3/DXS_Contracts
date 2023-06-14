import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require('dotenv').config();

const config: HardhatUserConfig = {
  defaultNetwork: "sepolia",
  networks: {
    hardhat: {},
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/FfmH35zf4fifvH3eFrKPTSRi8IUW4aRV", // replace with your Sepolia RPC URL
      accounts: [process.env.PK!], // replace with your account private key
    }
  },

solidity: {
    version: "0.8.18", // replace with your Solidity version
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
};

export default config;
