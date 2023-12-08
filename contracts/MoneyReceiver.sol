// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

/**
 * @title MoneyReceiver
 * @dev Contract to receive and withdraw Ether and ERC20 tokens
 */
contract MoneyReceiver {
    using SafeERC20 for IERC20;

    address public owner;
    address payable public receiver;

    event MoneyWithdrawn(uint amount, address to);
    event ERC20Withdrawn(address token, uint amount, address to);

    /**
     * @dev Sets the original `owner` and `receiver` of the contract to the sender account
     * @param _receiver address where funds will be sent upon withdrawal
     */
    constructor(address payable _receiver) {
        owner = msg.sender;
        receiver = _receiver;
    }

    /**
     * @dev Withdraws all Ether from the contract to the receiver address
     */
    function withdrawMoney() public {
        require(msg.sender == owner, 'You are not the contract owner.');
        uint balance = address(this).balance;
        receiver.transfer(balance);
        emit MoneyWithdrawn(balance, receiver);
    }

    /**
     * @dev Withdraws all tokens of a specific ERC20 token from the contract to the receiver address
     * @param token The ERC20 token to withdraw
     */
    function withdrawERC20(IERC20 token) public {
        require(msg.sender == owner, 'You are not the contract owner.');
        uint balance = token.balanceOf(address(this));
        require(balance > 0, 'No tokens to withdraw.');
        token.safeTransfer(receiver, balance);
        emit ERC20Withdrawn(address(token), balance, receiver);
    }

    /**
     * @dev Allows the contract to receive Ether directly
     */
    receive() external payable {}
}
