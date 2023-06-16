import { ethers } from "hardhat";

export async function generateProducts(productCount: number) {
    const productIds = [];
    const productSellers = [];
    const productPrices = [];
  
    const availableAddresses = await ethers.getSigners();
  
    for (let i = 0; i < productCount; i++) {
      productIds.push(i);
      productSellers.push(availableAddresses[i + 3].address);
      productPrices.push(ethers.utils.parseEther((i + 1).toString()));
    }
  
    return { productIds, productSellers, productPrices };
  }
  
  export function calculateSum(n: number) {
    let sum = 0;
    for (let i = 1; i <= n; i++) {
      sum += i;
    }
    return sum;
  }