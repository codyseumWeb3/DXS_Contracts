// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract Escrow {
    struct Product {
        uint id;
        address payable seller;
        address payable buyer;
        uint price;
        bool delivered;
        uint timestamp;
    }

    mapping(uint => Product) public products;
    mapping(address => uint) public pendingWithdrawals;

    uint public daoBalance;
    uint public devBalance;

    address payable public daoAddress;
    address payable public devAddress;

    constructor(address payable _daoAddress, address payable _devAddress) {
        daoAddress = _daoAddress;
        devAddress = _devAddress;
    }

    function addProducts(
        uint[] memory ids,
        address payable[] memory sellers,
        uint[] memory prices
    ) public payable {
        require(
            ids.length == sellers.length && sellers.length == prices.length,
            "Input arrays must have the same length"
        );
        uint totalPrice = 0;
        for (uint i = 0; i < prices.length; i++) {
            totalPrice += prices[i];
        }

        require(
            msg.value >= totalPrice,
            "Ether sent must cover total price of all products"
        );

          for (uint i = 0; i < ids.length; i++) {
        require(
            products[ids[i]].seller == address(0),
            "Product with this ID already exists"
        );
          }

        for (uint i = 0; i < ids.length; i++) {
            Product storage newProduct = products[ids[i]];
            newProduct.id = ids[i];
            newProduct.seller = sellers[i];
            newProduct.buyer = payable(msg.sender);
            newProduct.price = prices[i];
            newProduct.delivered = false;
            newProduct.timestamp = block.timestamp;
        }
    }

    function confirmDelivery(uint productId) public {
        Product storage product = products[productId];
        require(product.buyer == payable(msg.sender), "Only buyer can confirm delivery");

        product.delivered = true;
        pendingWithdrawals[product.seller] += product.price;
    }

    function withdraw() public {
        uint amount = pendingWithdrawals[msg.sender];

        require(amount > 0, "No funds available for withdrawal");

        pendingWithdrawals[msg.sender] = 0;

        payable(msg.sender).transfer(amount);
    }

    function withdrawDAO() public {
        require(
            msg.sender == daoAddress,
            "Only the DAO can withdraw DAO funds"
        );
        require(daoBalance > 0, "No DAO funds available for withdrawal");
        uint amount = daoBalance;
        daoBalance = 0;
        daoAddress.transfer(amount);
    }

    function withdrawDev() public {
        require(
            msg.sender == devAddress,
            "Only the Dev can withdraw Dev funds"
        );
        require(devBalance > 0, "No Dev funds available for withdrawal");
        uint amount = devBalance;
        devBalance = 0;
        devAddress.transfer(amount);
    }
}
