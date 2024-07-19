// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import '../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../node_modules/@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '../node_modules/@openzeppelin/contracts/access/Ownable.sol';

contract FidelityProgram is ReentrancyGuard, Ownable {
  IERC20 public dxsToken;
  uint256 public constant MAX_STAKING_PERIOD = 60 days;
  uint256 public stakingPeriod;

  struct Stake {
    uint256 amount;
    uint256 timestamp;
  }

  mapping(address => Stake) public stakes;

  event Staked(address indexed user, uint256 amount, uint256 timestamp);
  event Unstaked(address indexed user, uint256 amount);
  event StakingPeriodUpdated(uint256 newStakingPeriod);

  /**
   * @dev Constructor sets the token address for staking and initial staking period
   * @param _dxsToken Address of the token to be staked
   * @param _initialStakingPeriod Initial staking period in seconds
   */
  constructor(address _dxsToken, uint256 _initialStakingPeriod) {
    require(
      _initialStakingPeriod <= MAX_STAKING_PERIOD,
      'Initial staking period exceeds maximum limit'
    );
    dxsToken = IERC20(_dxsToken);
    stakingPeriod = _initialStakingPeriod;
  }

  function stake(uint256 _amount) external nonReentrant {
    require(_amount > 0, 'Amount must be greater than 0.');
    require(
      dxsToken.transferFrom(msg.sender, address(this), _amount),
      'Token transfer failed.'
    );

    Stake storage userStake = stakes[msg.sender];
    userStake.amount += _amount;
    userStake.timestamp = block.timestamp;

    emit Staked(msg.sender, _amount, block.timestamp);
  }

  function unstake() external nonReentrant {
    Stake storage userStake = stakes[msg.sender];
    uint256 amount = userStake.amount;
    require(amount > 0, 'No tokens staked.');
    require(
      block.timestamp >= userStake.timestamp + stakingPeriod,
      'Staking period not yet completed.'
    );

    userStake.amount = 0;

    require(dxsToken.transfer(msg.sender, amount), 'Token transfer failed.');

    emit Unstaked(msg.sender, amount);
  }

  /**
   * @dev Returns the amount of tokens staked by a user
   * @param _user The address of the user
   * @return The amount of tokens staked by the user
   */
  function getStakedAmount(address _user) external view returns (uint256) {
    return stakes[_user].amount;
  }

  /**
   * @dev Updates the staking period, only callable by the owner
   * @param _newStakingPeriod The new staking period in seconds
   */
  function updateStakingPeriod(uint256 _newStakingPeriod) external onlyOwner {
    require(
      _newStakingPeriod <= MAX_STAKING_PERIOD,
      'New staking period exceeds maximum limit'
    );
    stakingPeriod = _newStakingPeriod;
    emit StakingPeriodUpdated(_newStakingPeriod);
  }
}
