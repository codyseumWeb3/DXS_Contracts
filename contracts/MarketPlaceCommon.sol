// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/**
 * @title MarketPlaceCommon
 * @dev A base contract for handling common marketplace functionalities
 */
contract MarketPlaceCommon {
  address payable public dao;
  address payable public dev;
  address payable public incentive;
  address payable public supplier;
  address payable public seller;
  address public owner;

  uint public constant PERCENT_TO_ADD_FOR_FEES = 5;
  uint public minProductPrice;
  uint public maxVAT = 27;

  mapping(address => uint) public pendingBalance;
  mapping(address => uint) public purchasedBalance;

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

  modifier onlyOwner() {
    require(msg.sender == owner, 'You are not the contract Owner.');
    _;
  }

  function setSupplier(address newSupplier) external onlyOwner {
    require(
      newSupplier != address(0),
      'Supplier address cannot be the zero address.'
    );
    address oldSupplier = supplier;
    supplier = payable(newSupplier);

    emit SupplierChanged(oldSupplier, newSupplier);
  }

  function setMinProductPrice(uint newMinProductPrice) external onlyOwner {
    uint oldPrice = minProductPrice;
    minProductPrice = newMinProductPrice;

    emit MinProductPriceChanged(oldPrice, newMinProductPrice);
  }

  function transferOwnership(address newOwner) external onlyOwner {
    require(newOwner != address(0), 'New owner cannot be the zero address.');
    address oldOwner = owner;
    owner = newOwner;

    emit OwnershipTransferred(oldOwner, newOwner);
  }

  /**
   * @dev Set the maximum VAT Possible
   * @param newMaxVAT The new minimum product price
   */
  function setMaxVAT(uint newMaxVAT) external onlyOwner {
    require(newMaxVAT <= 50, 'VAT cannot be greater than 50%.');
    maxVAT = newMaxVAT;
  }

  /**
   * @dev Rectify the balance of a wallet address
   * @param walletAddress The address of the wallet
   * @param amount The new balance of the wallet
   */
  function rectifyBalance(
    address walletAddress,
    uint amount
  ) external onlyOwner {
    purchasedBalance[walletAddress] = amount;
  }

  fallback() external {
    revert('Do not send Ether directly.');
  }
}
