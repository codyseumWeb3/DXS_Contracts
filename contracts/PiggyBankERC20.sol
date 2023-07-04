// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import '../node_modules/@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

/// @title PiggyBank Contract
/// @author Anonymous
/// @notice This contract allows orders to be made, and allows the contract owner to pay the sellers while also distributing a percentage of the value to other addresses
/// @dev This contract is not complete and should not be used in production
contract PiggyBankERC20 {
  // We use SafeERC20 to have the safeTransfer function available used by unstandards tokens as USDT.
  using SafeERC20 for IERC20;
  address payable public daoAddress;
  address payable public devAddress;
  address payable public incentiveAddress;
  address public owner;
  uint public constant TOKEN_DECIMALS = 18;
  uint public minProductPrice = 1 * 10 ** TOKEN_DECIMALS;

  IERC20 public acceptedToken;

  mapping(address => uint) public pendingBalance;

  event OrderMade(address indexed buyer, uint value);
  event SellerPaid(address indexed seller, uint value);
  event RefundGiven(address indexed buyer, uint value);
  event MinProductPriceChanged(uint newMinProductPrice);

  /// @dev Constructor for the PiggyBank contract
  /// @param _daoAddress the payable address for DAO
  /// @param _devAddress the payable address for the Developer
  /// @param _incentiveAddress the payable address for the incentive
  constructor(
    address _daoAddress,
    address _devAddress,
    address _incentiveAddress,
    IERC20 _acceptedToken
  ) {
    require(
      _daoAddress != address(0),
      'DAO address cannot be the zero address.'
    );
    require(
      _devAddress != address(0),
      'Developer address cannot be the zero address.'
    );
    require(
      _incentiveAddress != address(0),
      'Incentive address cannot be the zero address.'
    );

    owner = msg.sender;
    daoAddress = payable(_daoAddress);
    devAddress = payable(_devAddress);
    incentiveAddress = payable(_incentiveAddress);
    acceptedToken = _acceptedToken;
  }

  /// @notice Allows a user to make an order by sending Ether to the contract
  /// @dev The amount of Ether sent must be greater than the minimum product price
  function makeOrder(uint tokenAmount) external {
    require(tokenAmount > minProductPrice, 'Value sent is too low.');
    pendingBalance[msg.sender] += tokenAmount;
    emit OrderMade(msg.sender, tokenAmount);
    bool success = acceptedToken.transferFrom(
      msg.sender,
      address(this),
      tokenAmount
    );
    require(success, 'Transfer from buyer to contract failed');
  }

  /// @notice Allows the contract owner to pay a seller and distribute the remaining value
  /// @dev The value is distributed as follows: 2.5% to the DAO, 2% to the developers, 1% to the incentive, and the rest to the seller
  /// @param sellerAddress the payable address of the seller
  /// @param buyerAddress the address of the buyer
  /// @param value the amount of Ether to be distributed
  function paySeller(
    address payable sellerAddress,
    address buyerAddress,
    uint value
  ) external {
    require(
      sellerAddress != address(0),
      'Seller address cannot be the zero address.'
    );
    require(msg.sender == owner, 'You are not the contract Owner.');
    require(pendingBalance[buyerAddress] >= value, 'Not enough buyer balance.');
    require(
      acceptedToken.balanceOf(address(this)) >= value,
      'Contract does not have enough balance.'
    );

    // Decrease the buyer's balance
    pendingBalance[buyerAddress] -= value;

    // Calculate the percentages
    uint daoShare = (value * 25) / 1000; // 2.5%
    uint devShare = (value * 2) / 100; // 2%
    uint incentiveShare = (value * 1) / 100; //1%
    uint sellerShare = value - daoShare - devShare - incentiveShare; // The rest goes to the seller

    emit SellerPaid(sellerAddress, sellerShare);

    // Transfer the values

    bool success = acceptedToken.transfer(daoAddress, daoShare);
    require(success, 'Transfer to DAO failed');
    success = acceptedToken.transfer(devAddress, devShare);
    require(success, 'Transfer to dev failed');
    success = acceptedToken.transfer(incentiveAddress, incentiveShare);
    require(success, 'Transfer to incentive failed');
    success = acceptedToken.transfer(sellerAddress, sellerShare);
    require(success, 'Transfer to seller failed');
  }

  /// @notice Allows the contract owner to refund a buyer
  /// @dev The value specified must be less than or equal to the buyer's balance
  /// @param buyerAddress the payable address of the buyer
  /// @param value the amount of Ether to be refunded
  function refund(address payable buyerAddress, uint value) external {
    require(msg.sender == owner, 'You are not the contract Owner.');
    require(pendingBalance[buyerAddress] >= value, 'Not enough buyer balance.');
    pendingBalance[buyerAddress] -= value;
    emit RefundGiven(buyerAddress, value);

    bool success = acceptedToken.transfer(buyerAddress, value);
    require(success, 'Transfer to buyer failed');
  }

  /// @notice Allows the contract owner to set the minimum product price
  /// @dev The minimum product price is set in wei
  /// @param newMinProductPrice the new minimum product price
  function setMinProductPrice(uint newMinProductPrice) external {
    require(msg.sender == owner, 'You are not the contract Owner.');
    minProductPrice = newMinProductPrice;
    emit MinProductPriceChanged(newMinProductPrice);
  }

  /// @notice Allows the current owner to transfer control of the contract to a new owner
  /// @param newOwner The address to transfer ownership to
  function transferOwnership(address newOwner) external {
    require(msg.sender == owner, 'You are not the contract Owner.');
    require(newOwner != address(0), 'New owner cannot be the zero address.');
    owner = newOwner;
  }

  /// @dev Fallback function to reject any Ether sent directly to the contract
  fallback() external {
    revert('Do not send Ether directly.');
  }
}
