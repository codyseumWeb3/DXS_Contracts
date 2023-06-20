// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/// @title An Escrow contract for managing product purchases and payments
contract Escrow {
    // Event definitions
    event ProductAdded(uint indexed id, address indexed seller, address indexed buyer, uint price);
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
        bool isExisting;
    }

    /// @dev A mapping to store products by their IDs
    mapping(uint => Product) public productList;
    /// @dev A mapping to keep track of pending withdrawals for each address
    mapping(address => uint) public pendingWithdrawalBalance;
    mapping(uint => bool) public isDispute;

    uint public fundsForDao;
    uint public fundsForDev;
    uint public fundsForArbitrator;

    uint public constant OPEN_DISPUTE_FEE = 0.01 ether;

    address payable public immutable daoWalletAddress;
    address payable public immutable devWalletAddress;
    address payable public immutable arbitratorAddress;

    /// @dev Constructor for the Escrow contract
    /// @param _daoWalletAddress the payable address for DAO
    /// @param _devWalletAddress the payable address for the Developer
    constructor(
        address payable _daoWalletAddress,
        address payable _devWalletAddress,
        address payable _arbitratorAddress
    ) {
        require(_daoWalletAddress != address(0), 'DAO address cannot be the zero address');
        require(_devWalletAddress != address(0), 'Dev address cannot be the zero address');
        require(_arbitratorAddress != address(0), 'Arbitrator address cannot be the zero address');
        daoWalletAddress = _daoWalletAddress;
        devWalletAddress = _devWalletAddress;
        arbitratorAddress = _arbitratorAddress;
    }

    /// @dev Function to add multiple products
    /// @param ids an array of product ids
    /// @param sellers an array of seller addresses
    /// @param prices an array of product prices
    function addProducts(uint[] memory ids, address payable[] memory sellers, uint[] memory prices) external payable {
        require(
            ids.length == sellers.length && sellers.length == prices.length,
            'Input arrays must have the same length'
        );
        uint totalProductPrice = 0;
        for (uint i = 0; i < prices.length; i++) {
            totalProductPrice += prices[i];
        }

        require(msg.value >= totalProductPrice, 'Ether sent must cover total price of all products');

        for (uint i = 0; i < ids.length; i++) {
            require(!productList[ids[i]].isExisting, 'Product with this ID already exists');
        }

        for (uint i = 0; i < prices.length; i++) {
            require(prices[i] > 0, "Product's prices should be greater than zero");
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
            newProduct.isExisting = true;
        }
    }

    /// @dev Function to confirm the delivery of a product
    /// @param productId the id of the product
    function confirmDelivery(uint productId) public {
        Product storage product = productList[productId];
        require(product.isExisting, "Product doesn't exist.");

        require(
            (isDispute[productId] && arbitratorAddress == msg.sender) ||
                (!isDispute[productId] && product.buyerAddress == payable(msg.sender)),
            'Only the buyer or arbitrator can confirm delivery.'
        );

        require(!product.isDelivered, 'Product delivery has already been confirmed.');

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
    function batchConfirmDelivery(uint[] memory productIds) external {
        for (uint i = 0; i < productIds.length; i++) {
            confirmDelivery(productIds[i]);
        }
    }

    /// @dev Generic function to handle withdrawal
    function _withdraw(uint256 amount, address payable receiver) internal {
        require(amount > 0, 'No funds available for withdrawal');
        emit Withdrawn(receiver, amount);

        receiver.transfer(amount);
    }

    /// @dev Function to withdraw the funds of an address
    function withdraw() external {
        uint amountToWithdraw = pendingWithdrawalBalance[msg.sender];
        require(amountToWithdraw > 0, 'No funds available for withdrawal');

        pendingWithdrawalBalance[msg.sender] = 0;

        _withdraw(amountToWithdraw, payable(msg.sender));
    }

    /// @dev Function to withdraw DAO's funds
    function withdrawDAO() external {
        require(msg.sender == daoWalletAddress, 'Only the DAO can withdraw DAO funds');

        uint daoAmount = fundsForDao;
        require(daoAmount > 0, 'No DAO funds available for withdrawal');

        fundsForDao = 0;

        _withdraw(daoAmount, daoWalletAddress);
    }

    /// @dev Function to withdraw Developer's funds
    function withdrawDev() external {
        require(msg.sender == devWalletAddress, 'Only the Dev can withdraw Dev funds');

        uint devAmount = fundsForDev;
        require(devAmount > 0, 'No Dev funds available for withdrawal');

        fundsForDev = 0;

        _withdraw(devAmount, devWalletAddress);
    }

    /// @dev Function to withdraw Arbitrator's funds
    function withdrawArbitrator() external {
        require(msg.sender == arbitratorAddress, 'Only the Arbitrator can withdraw Arbitrator funds');

        uint arbitratorAmount = fundsForArbitrator;
        require(arbitratorAmount > 0, 'No Arbitrator funds available for withdrawal');

        fundsForArbitrator = 0;

        _withdraw(arbitratorAmount, arbitratorAddress);
    }

    /// @dev Opens a dispute for a given product. Requires enough Ether to cover the dispute fee.
    /// @param productId The ID of the product for which to open a dispute.
    function openDispute(uint productId) external payable {
        Product storage product = productList[productId];

        require(msg.value >= OPEN_DISPUTE_FEE, 'You need to pay enough fee to open a dispute');
        require(
            product.buyerAddress == payable(msg.sender) || product.sellerAddress == payable(msg.sender),
            'Only the Buyer or the seller can open a dispute.'
        );
        require(product.isExisting, "Product doesn't exist.");

        isDispute[productId] = true;
        fundsForArbitrator += msg.value;
    }

    /// @dev Refunds the buyer for a given product.
    /// @param productId The ID of the product to refund.
    function refundBuyer(uint productId) external {
        require(arbitratorAddress == payable(msg.sender), 'Only the Arbitror can refund the buyer');

        Product storage product = productList[productId];
        require(product.isExisting, "Product doesn't exist.");
        require(isDispute[productId], "Dispute doesn't exist for this product.");

        pendingWithdrawalBalance[product.buyerAddress] += product.productPrice;
        product.isDelivered = true;
        isDispute[productId] = false;
    }
}
