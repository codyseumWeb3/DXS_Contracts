// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import '../node_modules/@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './MarketPlaceCommon.sol';

/**
 * @title MarketPlaceFeesERC20
 * @dev A contract for handling marketplace transactions and fees
 */
contract MarketPlaceFeesERC20 is MarketPlaceCommon {
  // We use SafeERC20 to have the safeTransfer function available used by unstandards tokens as USDT.
  using SafeERC20 for IERC20;

  uint public constant TOKEN_DECIMALS = 18;
  IERC20 public acceptedToken;

  /**
   * @dev Initialize the contract
   * @param _dao DAO's address
   * @param _dev Developer's address
   * @param _incentive Incentive's address
   * @param _supplier Supplier's address
   * @param _seller Seller's address
   * @param _acceptedToken Accepted Token's address
   */
  constructor(
    address _dao,
    address _dev,
    address _incentive,
    address _supplier,
    address _seller,
    IERC20 _acceptedToken
  ) MarketPlaceCommon(_dao, _dev, _incentive, _supplier, _seller) {
    minProductPrice = 1 * 10 ** TOKEN_DECIMALS;
    acceptedToken = _acceptedToken;
  }

  /**
   * @dev Buy a product
   * @param productMarginWithVAT The margin on the product
   * @param tokenAmount the product's price in chosen token
   */
  function buyProduct(uint productMarginWithVAT, uint tokenAmount) external {
    require(tokenAmount > minProductPrice, 'Value sent is too low.');
    require(
      acceptedToken.balanceOf(msg.sender) >= tokenAmount,
      'Insufficient token balance.'
    );
    require(
      acceptedToken.allowance(msg.sender, address(this)) >= tokenAmount,
      'Insufficient token allowance.'
    );

    // Calculate the percentages
    uint valueWithVAT = tokenAmount;
    // Calculate the percentages
    uint valueWithoutVAT = (valueWithVAT * 100) / (100 + maxVAT); //To get the value without VAT in France for instance -> 120(TTC) / 1.2 = 100(HT)
    uint daoShare = (valueWithoutVAT * 25) / 1000; // 2.5%
    uint devShare = (valueWithoutVAT * 2) / 100; // 2%
    uint incentiveShare = (valueWithoutVAT * 1) / 100; //1%

    require(
      (100 - productMarginWithVAT + PERCENT_TO_ADD_FOR_FEES) > 0,
      'Error with product pricing.'
    );

    // the supplier address will receive the supplier price + fees to pay swap and withdraw)
    uint supplierShare = (valueWithoutVAT *
      (100 - productMarginWithVAT + PERCENT_TO_ADD_FOR_FEES)) / 100;

    uint sellerShare = valueWithVAT -
      daoShare -
      devShare -
      incentiveShare -
      supplierShare;

    pendingBalance[dao] += daoShare;
    pendingBalance[dev] += devShare;
    pendingBalance[incentive] += incentiveShare;
    pendingBalance[seller] += sellerShare;

    emit ProductPurchased(msg.sender, tokenAmount, productMarginWithVAT);

    purchasedBalance[msg.sender] += tokenAmount;

    bool success = acceptedToken.transferFrom(
      msg.sender,
      address(this),
      tokenAmount
    );
    require(success, 'Transfer from buyer to contract failed');

    success = acceptedToken.transfer(supplier, supplierShare);
    require(success, 'Transfer to supplier failed');
  }

  /**
   * @dev Withdraw all balances
   */
  function withdrawAllBalances() external onlyOwner {
    uint daoValue = pendingBalance[dao];
    uint devValue = pendingBalance[dev];
    uint incentiveValue = pendingBalance[incentive];
    uint sellerValue = pendingBalance[seller];

    emit BalanceWithdrawn(
      msg.sender,
      daoValue + devValue + incentiveValue + sellerValue
    );

    pendingBalance[dao] = 0;
    pendingBalance[dev] = 0;
    pendingBalance[incentive] = 0;
    pendingBalance[seller] = 0;

    bool success = acceptedToken.transfer(dao, daoValue);
    require(success, 'Transfer to DAO failed');
    success = acceptedToken.transfer(dev, devValue);
    require(success, 'Transfer to dev failed');
    success = acceptedToken.transfer(incentive, incentiveValue);
    require(success, 'Transfer to incentive failed');
    success = acceptedToken.transfer(seller, sellerValue);
    require(success, 'Transfer to seller failed');
  }
}
