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

  /// @dev Constructor for the PiggyBank contract
  /// @param _daoAddress the payable address for DAO
  /// @param _devAddress the payable address for the Developer
  /// @param _incentiveAddress the payable address for the incentive
  constructor(
    address _daoAddress,
    address _devAddress,
    address _incentiveAddress
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
  }

  /// @notice Allows a user to make an order by sending Ether to the contract
  /// @dev The amount of Ether sent must be greater than the minimum product price
  function makeOrder() external payable {
    require(msg.value > minProductPrice, 'Value sent is too low.');
    pendingBalance[msg.sender] += msg.value;
    emit OrderMade(msg.sender, msg.value);
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
      address(this).balance >= value,
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
    daoAddress.transfer(daoShare);
    devAddress.transfer(devShare);
    incentiveAddress.transfer(incentiveShare);
    sellerAddress.transfer(sellerShare);
  }

  /// @notice Allows the contract owner to pay multiple sellers and distribute the remaining value
  /// @dev The value is distributed as follows: 2.5% to the DAO, 2% to the developers, 1% to the incentive, and the rest to the seller
  /// @param sellersAddresses the payable addresses of the sellers
  /// @param buyerAddresses the address of the buyer
  /// @param values the amounts of Ether to be distributed to each seller
  function batchPaySeller(
    address payable[] memory sellersAddresses,
    address[] memory buyerAddresses,
    uint[] memory values
  ) external {
    require(msg.sender == owner, 'You are not the contract Owner.');
    require(
      sellersAddresses.length == values.length,
      'Sellers and values array length mismatch.'
    );
    require(
      sellersAddresses.length == buyerAddresses.length,
      'Sellers and Buyers array length mismatch.'
    );
    uint valueLeft;
    for (uint i = 0; i < sellersAddresses.length; i++) {
      address payable sellerAddress = sellersAddresses[i];
      uint value = values[i];

      require(
        sellerAddress != address(0),
        'Seller address cannot be the zero address.'
      );
      require(
        pendingBalance[buyerAddresses[i]] >= value,
        'Not enough buyer balance for this seller.'
      );
      require(
        address(this).balance >= value,
        'Contract does not have enough balance.'
      );

      // Decrease the buyer's balance
      pendingBalance[buyerAddresses[i]] -= value;

      uint sellerShare = (value * 945) / 1000; // The seller received 94.5% (100% - 5.5% fees

      valueLeft += value - sellerShare;
      emit SellerPaid(sellerAddress, sellerShare);

      sellerAddress.transfer(sellerShare);
    }

    // Calculate the percentages
    uint daoShare = (valueLeft * 4545) / 10000; // 45.45% of total remaining value (2.5% of the original transaction value)
    uint incentiveShare = (valueLeft * 1818) / 10000; // 18.18 % of total remaining value (1% of the original transaction value)
    uint devShare = valueLeft - daoShare - incentiveShare; // 2%

    require(
      address(this).balance >= (daoShare + devShare + incentiveShare),
      'Contract does not have enough balance for DAO, dev and incentive shares.'
    );
    // Transfer the values
    daoAddress.transfer(daoShare);
    devAddress.transfer(devShare);
    incentiveAddress.transfer(incentiveShare);
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
    buyerAddress.transfer(value);
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
