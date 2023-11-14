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
   * @param _dxs Decentrashop's address
   * @param _supplier Supplier's address
   * @param _acceptedToken Accepted Token's address
   */
  constructor(
    address _dxs,
    address _supplier,
    IERC20 _acceptedToken
  ) MarketPlaceCommon(_dxs, _supplier) {
    minProductPrice = 1 * 10 ** TOKEN_DECIMALS;
    acceptedToken = _acceptedToken;
  }

  /**
   * @dev Buy a product
   * @param tokenAmount the product's price in chosen token
   */
  function buyProduct(uint tokenAmount) external {
    require(tokenAmount > minProductPrice, 'Value sent is too low.');
    require(
      acceptedToken.balanceOf(msg.sender) >= tokenAmount,
      'Insufficient token balance.'
    );
    require(
      acceptedToken.allowance(msg.sender, address(this)) >= tokenAmount,
      'Insufficient token allowance.'
    );

    emit ProductPurchased(msg.sender, tokenAmount);

    purchasedBalance[msg.sender] += tokenAmount;

    bool success = acceptedToken.transferFrom(
      msg.sender,
      address(this),
      tokenAmount
    );
    require(success, 'Transfer from buyer to contract failed');
  }

  /**
   * @dev Withdraw all balances
   */
  function withdrawAllBalances() external onlyOwner {
    emit BalanceWithdrawn(msg.sender, acceptedToken.balanceOf(address(this)));

    uint valueWithVAT = acceptedToken.balanceOf(address(this));
    // Calculate the percentages
    uint valueWithoutVAT = (valueWithVAT * 100) / (100 + maxVAT); //To get the value without VAT in France for instance -> 120(TTC) / 1.2 = 100(HT)
    uint dxsShare = (valueWithoutVAT * 55) / 1000; // 5.5%

    bool success = acceptedToken.transfer(dxs, dxsShare);
    require(success, 'Transfer to DXS failed');
    uint tokenBalanLeft = acceptedToken.balanceOf(address(this));
    success = acceptedToken.transfer(supplier, tokenBalanLeft);
    require(success, 'Transfer to supplier failed');
  }
}
