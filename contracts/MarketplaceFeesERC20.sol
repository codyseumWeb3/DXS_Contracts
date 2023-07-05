// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import '../node_modules/@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

/**
 * @title MarketPlaceFees
 * @dev A contract for handling marketplace transactions and fees
 */
contract MarketPlaceFeesERC20 {
  // We use SafeERC20 to have the safeTransfer function available used by unstandards tokens as USDT.
  using SafeERC20 for IERC20;
  address payable public dao;
  address payable public dev;
  address payable public incentive;
  address payable public supplier;
  address payable public seller;
  address public owner;

  uint public constant TOKEN_DECIMALS = 18;

  uint public constant PERCENT_TO_ADD_FOR_FEES = 5;
  uint public minProductPrice = 1 * 10 ** TOKEN_DECIMALS;

  IERC20 public acceptedToken;

  mapping(address => uint) public pendingBalance;

  // Define the events
  event ProductPurchased(
    address indexed buyer,
    uint amount,
    uint productMargin
  );

  event BalanceWithdrawn(address indexed withdrawer, uint amount);

  event SupplierChanged(
    address indexed oldSupplier,
    address indexed newSupplier
  );

  event MinProductPriceChanged(uint oldPrice, uint newPrice);

  event OwnershipTransferred(
    address indexed oldOwner,
    address indexed newOwner
  );

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
  ) {
    require(_dao != address(0), 'DAO address cannot be the zero address.');
    require(
      _dev != address(0),
      'Developer address cannot be the zero address.'
    );
    require(
      _incentive != address(0),
      'Incentive address cannot be the zero address.'
    );
    require(
      _supplier != address(0),
      'Supplier address cannot be the zero address.'
    );
    require(
      _seller != address(0),
      'Seller address cannot be the zero address.'
    );

    owner = msg.sender;
    dao = payable(_dao);
    dev = payable(_dev);
    incentive = payable(_incentive);
    supplier = payable(_supplier);
    seller = payable(_seller);
    acceptedToken = _acceptedToken;
  }

  /**
   * @dev Buy a product
   * @param productMargin The margin on the product
   * @param tokenAmount The amount of token used to buy the product
   */
  function buyProduct(uint productMargin, uint tokenAmount) external {
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
    uint value = tokenAmount;
    uint daoShare = (value * 25) / 1000; // 2.5%
    uint devShare = (value * 2) / 100; // 2%
    uint incentiveShare = (value * 1) / 100; //1%

    require(
      (100 - productMargin + PERCENT_TO_ADD_FOR_FEES) > 0,
      'Error with product pricing.'
    );

    uint supplierShare = (value *
      (100 - productMargin + PERCENT_TO_ADD_FOR_FEES)) / 100;

    uint sellerShare = value -
      daoShare -
      devShare -
      incentiveShare -
      supplierShare;

    pendingBalance[dao] += daoShare;
    pendingBalance[dev] += devShare;
    pendingBalance[incentive] += incentiveShare;
    pendingBalance[seller] += sellerShare;

    emit ProductPurchased(msg.sender, tokenAmount, productMargin);

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

    bool success = acceptedToken.transfer(dao, daoValue);
    require(success, 'Transfer to DAO failed');
    success = acceptedToken.transfer(dev, devValue);
    require(success, 'Transfer to dev failed');
    success = acceptedToken.transfer(incentive, incentiveValue);
    require(success, 'Transfer to incentive failed');
    success = acceptedToken.transfer(seller, sellerValue);
    require(success, 'Transfer to seller failed');
  }

  /**
   * @dev Set a new supplier
   * @param newSupplier The new supplier's address
   */
  function setSupplier(address newSupplier) external {
    require(msg.sender == owner, 'You are not the contract Owner.');
    require(
      newSupplier != address(0),
      'Supplier address cannot be the zero address.'
    );
    address oldSupplier = supplier;
    supplier = payable(newSupplier);

    emit SupplierChanged(oldSupplier, newSupplier);
  }

  /**
   * @dev Set the minimum product price
   * @param newMinProductPrice The new minimum product price
   */
  function setMinProductPrice(uint newMinProductPrice) external {
    require(msg.sender == owner, 'You are not the contract Owner.');
    uint oldPrice = minProductPrice;
    minProductPrice = newMinProductPrice;

    emit MinProductPriceChanged(oldPrice, newMinProductPrice);
  }

  /**
   * @dev Transfer the ownership to a new address
   * @param newOwner The new owner's address
   */
  function transferOwnership(address newOwner) external {
    require(msg.sender == owner, 'You are not the contract Owner.');
    require(newOwner != address(0), 'New owner cannot be the zero address.');
    address oldOwner = owner;
    owner = newOwner;

    emit OwnershipTransferred(oldOwner, newOwner);
  }

  fallback() external {
    revert('Do not send Ether directly.');
  }
}
