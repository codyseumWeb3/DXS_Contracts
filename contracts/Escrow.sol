// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/// @title An Escrow contract for managing product purchases and payments
contract Escrow {
    // Event definitions
    event ProductAdded(
        uint indexed id,
        address indexed seller,
        address indexed buyer,
        uint price
    );
    event DeliveryConfirmed(uint indexed id, address indexed buyer);
    event Withdrawn(address indexed withdrawer, uint amount);
    event FundsReceived(address indexed sender, uint amount);

    /// @dev Defines a struct for Product
    struct Product {
        uint id;
        address payable sellerAddress;
        address payable buyerAddress;
        uint productPrice;
        bool isDelivered;
        uint purchaseTime;
        bool exists;
    }

    /// @dev A mapping to store products by their IDs
    mapping(uint => Product) public productList;
    /// @dev A mapping to keep track of pending withdrawals for each address
    mapping(address => uint) public pendingWithdrawalBalance;

    uint public fundsForDao;
    uint public fundsForDev;

    address payable public immutable daoWalletAddress;
    address payable public immutable devWalletAddress;

    /// @dev Constructor for the Escrow contract
    /// @param _daoWalletAddress the payable address for DAO
    /// @param _devWalletAddress the payable address for the Developer
    constructor(
        address payable _daoWalletAddress,
        address payable _devWalletAddress
    ) {
        require(
            _daoWalletAddress != address(0),
            "DAO address cannot be the zero address"
        );
        require(
            _devWalletAddress != address(0),
            "Dev address cannot be the zero address"
        );
        daoWalletAddress = _daoWalletAddress;
        devWalletAddress = _devWalletAddress;
    }

    /// @dev Function to add multiple products
    /// @param ids an array of product ids
    /// @param sellers an array of seller addresses
    /// @param prices an array of product prices
    function addProducts(
        uint[] memory ids,
        address payable[] memory sellers,
        uint[] memory prices
    ) public payable {
        require(
            ids.length == sellers.length && sellers.length == prices.length,
            "Input arrays must have the same length"
        );
        uint totalProductPrice = 0;
        for (uint i = 0; i < prices.length; i++) {
            totalProductPrice += prices[i];
        }

        require(
            msg.value >= totalProductPrice,
            "Ether sent must cover total price of all products"
        );

        for (uint i = 0; i < ids.length; i++) {
            require(
                !productList[ids[i]].exists,
                "Product with this ID already exists"
            );
        }

        emit FundsReceived(msg.sender, msg.value);

        for (uint i = 0; i < ids.length; i++) {
            Product storage newProduct = productList[ids[i]];
            newProduct.id = ids[i];
            newProduct.sellerAddress = sellers[i];
            newProduct.buyerAddress = payable(msg.sender);
            newProduct.productPrice = prices[i];
            newProduct.isDelivered = false;
            newProduct.purchaseTime = block.timestamp;
            newProduct.exists = true;
        }
    }

    /// @dev Function to confirm the delivery of a product
    /// @param productId the id of the product
    function confirmDelivery(uint productId) public {
        Product storage product = productList[productId];
        require(
            product.buyerAddress == payable(msg.sender),
            "Only the buyer of the product can confirm delivery."
        );
        require(
            !product.isDelivered,
            "Product delivery has already been confirmed."
        );

        product.isDelivered = true;

        uint devFee = (product.productPrice * 1) / 100; // 1% fee for the developer
        uint daoFee = (product.productPrice * 25) / 1000; // 2.5% fee for the DAO
        uint sellerAmount = product.productPrice - devFee - daoFee; // remaining amount for the seller

        fundsForDev += devFee;
        fundsForDao += daoFee;
        pendingWithdrawalBalance[product.sellerAddress] += sellerAmount;

        emit DeliveryConfirmed(productId, msg.sender);
    }

    /// @dev Function to confirm the delivery of multiple products
    /// @param productIds an array of product ids
    function batchConfirmDelivery(uint[] memory productIds) public {
        for (uint i = 0; i < productIds.length; i++) {
            confirmDelivery(productIds[i]);
        }
    }

    /// @dev Function to withdraw the funds of an address
    function withdraw() public {
        uint amountToWithdraw = pendingWithdrawalBalance[msg.sender];
        emit Withdrawn(msg.sender, amountToWithdraw);
        require(amountToWithdraw > 0, "No funds available for withdrawal");

        pendingWithdrawalBalance[msg.sender] = 0;

        payable(msg.sender).transfer(amountToWithdraw);
    }

    /// @dev Function to withdraw DAO's funds
    function withdrawDAO() public {
        require(
            msg.sender == daoWalletAddress,
            "Only the DAO can withdraw DAO funds"
        );
        require(fundsForDao > 0, "No DAO funds available for withdrawal");
        uint daoAmount = fundsForDao;
        emit Withdrawn(daoWalletAddress, daoAmount);
        fundsForDao = 0;
        daoWalletAddress.transfer(daoAmount);
    }

    /// @dev Function to withdraw Developer's funds
    function withdrawDev() public {
        require(
            msg.sender == devWalletAddress,
            "Only the Dev can withdraw Dev funds"
        );
        require(fundsForDev > 0, "No Dev funds available for withdrawal");
        uint devAmount = fundsForDev;
        emit Withdrawn(devWalletAddress, devAmount);
        fundsForDev = 0;
        devWalletAddress.transfer(devAmount);
    }
}
