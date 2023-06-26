// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/**
 * @title MarketPlaceFees
 * @dev A contract for handling marketplace transactions and fees
 */
contract MarketPlaceFees {
  address payable public dao;
  address payable public dev;
  address payable public incentive;
  address payable public supplier;
  address payable public seller;
  address public owner;

  uint public constant PERCENT_TO_ADD_FOR_FEES = 5;
  uint public minProductPrice = 0.01 ether;

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
   */
  constructor(
    address _dao,
    address _dev,
    address _incentive,
    address _supplier,
    address _seller
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
  }

  /**
   * @dev Buy a product
   * @param productMargin The margin on the product
   */
  function buyProduct(uint productMargin) external payable {
    require(msg.value > minProductPrice, 'Value sent is too low.');
    // Calculate the percentages
    uint value = msg.value;
    uint daoShare = (value * 25) / 1000; // 2.5%
    uint devShare = (value * 2) / 100; // 2%
    uint incentiveShare = (value * 1) / 100; //1%
    // the supplier address will receive the supplier price + fees to pay swap and withdraw)
    uint supplierShare = (value * (productMargin + PERCENT_TO_ADD_FOR_FEES)) /
      100;

    uint sellerShare = value -
      daoShare -
      devShare -
      incentiveShare -
      supplierShare;

    pendingBalance[dao] += daoShare;
    pendingBalance[dev] += devShare;
    pendingBalance[incentive] += incentiveShare;
    pendingBalance[seller] += sellerShare;

    emit ProductPurchased(msg.sender, msg.value, productMargin);

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
