// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import './MarketPlaceCommon.sol';

/**
 * @title MarketPlaceFees
 * @dev A contract for handling marketplace transactions and fees
 */
contract MarketPlaceFees is MarketPlaceCommon {
  /**
   * @dev Initialize the contract
   * @param _dao DAO's address
   * @param _dev Developer's address
   * @param _incentive Incentive's address
   * @param _supplier Supplier's address
   * @param _seller Seller's address
   */
  constructor(
    address _dao,
    address _dev,
    address _incentive,
    address _supplier,
    address _seller
  ) MarketPlaceCommon(_dao, _dev, _incentive, _supplier, _seller) {
    minProductPrice = 0.0001 ether;
  }

  /**
   * @dev Buy a product
   * @param productMarginWithVAT The margin on the product
   */
  function buyProduct(uint productMarginWithVAT) external payable {
    require(msg.value > minProductPrice, 'Value sent is too low.');
    uint valueWithVAT = msg.value;
    // Calculate the percentages
    uint valueWithoutVAT = (valueWithVAT * 100) / (100 + maxVAT); //To get the value without VAT in France for instance -> 120(TTC) / 1.2 = 100(HT)
    uint daoShare = (valueWithoutVAT * 25) / 1000; // 2.5%
    uint devShare = (valueWithoutVAT * 2) / 100; // 2%
    uint incentiveShare = (valueWithoutVAT * 1) / 100; //1%

    require(
      (productMarginWithVAT + PERCENT_TO_ADD_FOR_FEES) < 100,
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

    purchasedBalance[msg.sender] += msg.value;

    emit ProductPurchased(msg.sender, msg.value, productMarginWithVAT);

    supplier.transfer(supplierShare);
  }

  /**
   * @dev Withdraw all balances
   */
  function withdrawAllBalances() external {
    require(msg.sender == owner, 'You are not the contract Owner.');

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

    dao.transfer(daoValue);
    dev.transfer(devValue);
    incentive.transfer(incentiveValue);
    seller.transfer(sellerValue);
  }
}
