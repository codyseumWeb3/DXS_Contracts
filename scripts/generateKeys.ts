import { ethers } from "ethers";

const wallet = ethers.Wallet.createRandom();
console.log('Private Key:', wallet.privateKey);

console.log('Public Key:', wallet.publicKey);
