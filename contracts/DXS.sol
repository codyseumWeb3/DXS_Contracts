// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";


contract Decentrashop is ERC20, ERC20Burnable{
    constructor() ERC20("Decentrashop", "DXS")  {
        _mint(msg.sender, 10000000 * 10 ** decimals());
    }
}
