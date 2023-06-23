// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/// @title PiggyBank Contract
/// @author Anonymous
/// @notice This contract allows orders to be made, and allows the contract owner to pay the sellers while also distributing a percentage of the value to other addresses
/// @dev This contract is not complete and should not be used in production
contract PiggyBank {
  address payable public daoAddress;
  address payable public devAddress;
  address payable public incentiveAddress;
  address public owner;
  uint public minProductPrice = 0.01 ether;

  mapping(address => uint) public pendingBalance;

  event OrderMade(address indexed buyer, uint value);
  event SellerPaid(address indexed seller, uint value);
  event RefundGiven(address indexed buyer, uint value);
  event MinProductPriceChanged(uint newMinProductPrice);

  constructor(
    address _daoAddress,
    address _devAddress,
    address _incentiveAddress
  ) {
    owner = msg.sender;
    daoAddress = payable(_daoAddress);
    devAddress = payable(_devAddress);
    incentiveAddress = payable(_incentiveAddress);
  }

  function makeOrder() external payable {
    require(msg.value > minProductPrice, 'Value sent is too low.');
    pendingBalance[msg.sender] += msg.value;
    emit OrderMade(msg.sender, msg.value);
  }

  function paySeller(
    address payable sellerAddress,
    address buyerAddress,
    uint value
  ) external {
    require(msg.sender == owner, 'You are not the contract Owner.');
    require(pendingBalance[buyerAddress] >= value, 'Not enough buyer balance.');

    // Decrease the buyer's balance
    pendingBalance[buyerAddress] -= value;

    // Calculate the percentages off-chain and just provide the values
    uint daoShare = (value * 25) / 1000; // 2.5%
    uint devShare = (value * 2) / 100; // 2%
    uint incentiveShare = (value * 1) / 100; //1%
    uint sellerShare = value - daoShare - devShare - incentiveShare; // The rest goes to the seller

    emit SellerPaid(sellerAddress, sellerShare);

    // Transfer the values using `call`
    (bool success, ) = daoAddress.call{ value: daoShare }('');
    require(success, 'Transfer failed.');
    (success, ) = devAddress.call{ value: devShare }('');
    require(success, 'Transfer failed.');
    (success, ) = incentiveAddress.call{ value: incentiveShare }('');
    require(success, 'Transfer failed.');
    (success, ) = sellerAddress.call{ value: sellerShare }('');
    require(success, 'Transfer failed.');
  }

  function refund(address payable buyerAddress, uint value) external {
    require(msg.sender == owner, 'You are not the contract Owner.');
    require(pendingBalance[buyerAddress] >= value, 'Not enough buyer balance.');
    pendingBalance[buyerAddress] -= value;
    emit RefundGiven(buyerAddress, value);
    (bool success, ) = buyerAddress.call{ value: value }('');
    require(success, 'Transfer failed.');
  }

  function setMinProductPrice(uint newMinProductPrice) external {
    require(msg.sender == owner, 'You are not the contract Owner.');
    minProductPrice = newMinProductPrice;
    emit MinProductPriceChanged(newMinProductPrice);
  }

  function transferOwnership(address newOwner) external {
    require(msg.sender == owner, 'You are not the contract Owner.');
    owner = newOwner;
  }

  fallback() external {
    revert('Do not send Ether directly.');
  }
}
