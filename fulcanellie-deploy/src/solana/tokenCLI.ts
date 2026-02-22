#!/usr/bin/env node

/**
 * CLI for Token Operations
 * Usage examples:
 *   npm run token mint <mint> <amount> [recipient]
 *   npm run token burn <mint> <amount>
 *   npm run token transfer <mint> <to> <amount>
 *   npm run token balance <mint> [owner]
 *   npm run token stake <mint> <amount>
 *   npm run token unstake <mint> <amount>
 *   npm run token check-gate <mint> <user> <required>
 */

import {
  mintTokens,
  burnTokens,
  transferTokens,
  getTokenBalance,
} from './tokenOperations';
import {
  stakeTokens,
  unstakeTokens,
  getStakingInfo,
  calculateRewards,
} from './staking';
import {
  checkTokenGate,
  getTokenBalanceForGate,
} from './tokenGating';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
Token Operations CLI

Usage:
  npm run token <command> [options]

Commands:
  mint <mint> <amount> [recipient] [network]
    - Mint tokens to a recipient (default: your wallet)
  
  burn <mint> <amount> [network]
    - Burn tokens from your wallet
  
  transfer <mint> <to> <amount> [network]
    - Transfer tokens to another address
  
  balance <mint> [owner] [network]
    - Check token balance
  
  stake <mint> <amount> [network]
    - Stake tokens to earn rewards
  
  unstake <mint> <amount> [network]
    - Unstake tokens
  
  staking-info [user] [network]
    - Get staking information
  
  check-gate <mint> <user> <required> [network]
    - Check if user meets token gate requirements

Examples:
  npm run token mint FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 1000
  npm run token transfer FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 <address> 100
  npm run token stake FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 5000
  npm run token check-gate FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 <address> 100
`);
    process.exit(1);
  }

  try {
    switch (command) {
      case 'mint': {
        const mint = args[1];
        const amount = parseFloat(args[2]);
        const recipient = args[3];
        const network = (args[4] || 'devnet') as 'devnet' | 'mainnet';
        
        if (!mint || !amount) {
          console.error('Error: mint and amount required');
          process.exit(1);
        }
        
        await mintTokens(mint, amount, 9, recipient, network);
        break;
      }

      case 'burn': {
        const mint = args[1];
        const amount = parseFloat(args[2]);
        const network = (args[3] || 'devnet') as 'devnet' | 'mainnet';
        
        if (!mint || !amount) {
          console.error('Error: mint and amount required');
          process.exit(1);
        }
        
        await burnTokens(mint, amount, 9, undefined, network);
        break;
      }

      case 'transfer': {
        const mint = args[1];
        const to = args[2];
        const amount = parseFloat(args[3]);
        const network = (args[4] || 'devnet') as 'devnet' | 'mainnet';
        
        if (!mint || !to || !amount) {
          console.error('Error: mint, to address, and amount required');
          process.exit(1);
        }
        
        await transferTokens(mint, to, amount, 9, undefined, network);
        break;
      }

      case 'balance': {
        const mint = args[1];
        const owner = args[2];
        const network = (args[3] || 'devnet') as 'devnet' | 'mainnet';
        
        if (!mint) {
          console.error('Error: mint address required');
          process.exit(1);
        }
        
        const balance = await getTokenBalance(mint, owner, network);
        console.log(`\n💰 Token Balance:`);
        console.log(`   Balance: ${balance.balance}`);
        console.log(`   Token Account: ${balance.tokenAccount}`);
        break;
      }

      case 'stake': {
        const mint = args[1];
        const amount = parseFloat(args[2]);
        const network = (args[3] || 'devnet') as 'devnet' | 'mainnet';
        
        if (!mint || !amount) {
          console.error('Error: mint and amount required');
          process.exit(1);
        }
        
        await stakeTokens(mint, amount, 9, { mintAddress: mint, network });
        break;
      }

      case 'unstake': {
        const mint = args[1];
        const amount = parseFloat(args[2]);
        const network = (args[3] || 'devnet') as 'devnet' | 'mainnet';
        
        if (!mint || !amount) {
          console.error('Error: mint and amount required');
          process.exit(1);
        }
        
        await unstakeTokens(mint, amount, 9, { mintAddress: mint, network });
        break;
      }

      case 'staking-info': {
        const user = args[1];
        const stakeInfo = getStakingInfo(user);
        
        if (!stakeInfo) {
          console.log('\n📊 No staking information found');
        } else {
          const rewards = calculateRewards(stakeInfo.amount, stakeInfo.stakedAt);
          console.log(`\n📊 Staking Information:`);
          console.log(`   Staked Amount: ${stakeInfo.amount}`);
          console.log(`   Staked At: ${new Date(stakeInfo.stakedAt).toLocaleString()}`);
          console.log(`   Rewards Earned: ${stakeInfo.rewardsEarned}`);
          console.log(`   Estimated Rewards: ${rewards.toFixed(2)}`);
        }
        break;
      }

      case 'check-gate': {
        const mint = args[1];
        const user = args[2];
        const required = parseFloat(args[3]);
        const network = (args[4] || 'devnet') as 'devnet' | 'mainnet';
        
        if (!mint || !user || !required) {
          console.error('Error: mint, user address, and required amount needed');
          process.exit(1);
        }
        
        const hasAccess = await checkTokenGate(user, {
          mintAddress: mint,
          requiredAmount: required,
          network,
        });
        
        const balance = await getTokenBalanceForGate(user, mint, network);
        
        console.log(`\n🚪 Token Gate Check:`);
        console.log(`   User: ${user}`);
        console.log(`   Required: ${required}`);
        console.log(`   Balance: ${balance}`);
        console.log(`   Access: ${hasAccess ? '✅ Granted' : '❌ Denied'}`);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}






