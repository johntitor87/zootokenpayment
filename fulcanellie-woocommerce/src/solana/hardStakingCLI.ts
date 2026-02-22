#!/usr/bin/env node

/**
 * CLI for Hard Gating Staking
 * 
 * Updated with:
 * - 2-day lock period
 * - Penalty for unstaking within 3 days
 * - Tiered access (250/500/1000)
 * - Request unstake + Complete unstake flow
 */

import {
  initializeVault,
  stakeTokens,
  requestUnstake,
  completeUnstake,
  getStakeInfo,
  checkStakeGate,
} from './hardStaking';
import { isAccessRevoked } from './tieredStaking';
import {
  getTierFromAmount,
  STAKING_TIERS,
  MIN_STAKE_FOR_MAIN_PERKS,
} from './tieredStaking';
import * as fs from 'fs';
import * as path from 'path';

interface Config {
  programId: string;
  mintAddress: string;
  network: 'devnet' | 'mainnet';
}

function loadConfig(): Config {
  const configPath = path.join(process.cwd(), 'staking-config.json');
  
  if (!fs.existsSync(configPath)) {
    return {
      programId: 'Zoostaking1111111111111111111111111111111',
      mintAddress: 'FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3',
      network: 'devnet',
    };
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const config = loadConfig();

  if (!command) {
    console.log(`
Hard Gating Staking CLI

Tiers:
  Tier 1: 250+ tokens  - Base access, basic discounts (5%)
  Tier 2: 500+ tokens  - Full product visibility, standard discounts (10%)
  Tier 3: 1000+ tokens - Premium access, larger discounts (20%), exclusive products

Rules:
  - Minimal stake: 500 ZOO tokens for main perks
  - 2-day lock period after unstake request
  - 5% penalty if unstaking within 3 days
  - Access revoked immediately on unstake request

Usage:
  npm run hard-stake <command> [options]

Commands:
  init [program-id] [mint] [network]
    - Initialize the staking vault (one-time setup)
  
  stake <amount> [user] [network]
    - Stake tokens (lock in vault)
  
  request-unstake [user] [network]
    - Request unstake (starts 2-day lock period)
  
  complete-unstake [user] [network]
    - Complete unstake (after 2-day lock period)
  
  info <user> [network]
    - Get stake information with tier
  
  check-gate <user> <required> [network]
    - Check if user meets staking requirements

Examples:
  npm run hard-stake init
  npm run hard-stake stake 500
  npm run hard-stake request-unstake
  npm run hard-stake complete-unstake
  npm run hard-stake info <user-address>
  npm run hard-stake check-gate <user-address> 500
`);
    process.exit(1);
  }

  try {
    switch (command) {
      case 'init': {
        const programId = args[1] || config.programId;
        const mintAddress = args[2] || config.mintAddress;
        const network = (args[3] || config.network) as 'devnet' | 'mainnet';

        await initializeVault({
          programId,
          mintAddress,
          network,
        });
        break;
      }

      case 'stake': {
        const amount = parseFloat(args[1]);
        const userAddress = args[2];
        const network = (args[3] || config.network) as 'devnet' | 'mainnet';

        if (!amount) {
          console.error('Error: amount required');
          process.exit(1);
        }

        await stakeTokens(amount, {
          programId: config.programId,
          mintAddress: config.mintAddress,
          network,
        }, userAddress);
        break;
      }

      case 'request-unstake': {
        const userAddress = args[1];
        const network = (args[2] || config.network) as 'devnet' | 'mainnet';

        await requestUnstake({
          programId: config.programId,
          mintAddress: config.mintAddress,
          network,
        }, userAddress);
        break;
      }

      case 'complete-unstake': {
        const userAddress = args[1];
        const network = (args[2] || config.network) as 'devnet' | 'mainnet';

        await completeUnstake({
          programId: config.programId,
          mintAddress: config.mintAddress,
          network,
        }, userAddress);
        break;
      }

      case 'info': {
        const userAddress = args[1];
        const network = (args[2] || config.network) as 'devnet' | 'mainnet';

        if (!userAddress) {
          console.error('Error: user address required');
          process.exit(1);
        }

        const stakeInfo = await getStakeInfo(userAddress, {
          programId: config.programId,
          mintAddress: config.mintAddress,
          network,
        });

        if (!stakeInfo) {
          console.log(`\n📊 No stake found for ${userAddress}`);
        } else {
          const amount = stakeInfo.amount / Math.pow(10, 9);
          const tier = getTierFromAmount(amount);
          const tierInfo = STAKING_TIERS[tier] || STAKING_TIERS[0];

          console.log(`\n📊 Stake Information:`);
          console.log(`   User: ${stakeInfo.user}`);
          console.log(`   Amount: ${amount} tokens`);
          console.log(`   Tier: ${tier} - ${tierInfo.name}`);
          console.log(`   Status: ${stakeInfo.status}`);
          console.log(`   Staked At: ${new Date(stakeInfo.timestamp * 1000).toLocaleString()}`);
          
          if (stakeInfo.unstakeTimestamp) {
            console.log(`   Unstake Requested: ${new Date(stakeInfo.unstakeTimestamp * 1000).toLocaleString()}`);
          }
          
          if (stakeInfo.unlockTimestamp) {
            const now = Date.now() / 1000;
            const unlockTime = stakeInfo.unlockTimestamp;
            if (now < unlockTime) {
              const hoursLeft = Math.ceil((unlockTime - now) / 3600);
              console.log(`   ⏳ Unlocks In: ${hoursLeft} hours`);
            } else {
              console.log(`   ✅ Ready to complete unstake`);
            }
          }
          
          if (stakeInfo.penaltyApplied) {
            console.log(`   ⚠️  Penalty: 5% (unstaking within 3 days)`);
          }

          console.log(`\n🎁 Perks:`);
          tierInfo.perks.forEach(perk => {
            console.log(`   - ${perk}`);
          });

          if (amount < MIN_STAKE_FOR_MAIN_PERKS) {
            console.log(`\n⚠️  Warning: Need ${MIN_STAKE_FOR_MAIN_PERKS} tokens for main perks`);
          }
        }
        break;
      }

      case 'check-gate': {
        const userAddress = args[1];
        const requiredAmount = parseFloat(args[2]);
        const network = (args[3] || config.network) as 'devnet' | 'mainnet';

        if (!userAddress || !requiredAmount) {
          console.error('Error: user address and required amount needed');
          process.exit(1);
        }

        const gate = await checkStakeGate(userAddress, requiredAmount, {
          programId: config.programId,
          mintAddress: config.mintAddress,
          network,
        });

        const stakeInfo = await getStakeInfo(userAddress, {
          programId: config.programId,
          mintAddress: config.mintAddress,
          network,
        });

        const tier = stakeInfo ? getTierFromAmount(stakeInfo.amount / Math.pow(10, 9)) : 0;

        console.log(`\n🚪 Stake Gate Check:`);
        console.log(`   User: ${userAddress}`);
        console.log(`   Required: ${requiredAmount} tokens`);
        console.log(`   Staked: ${gate.stakedAmount} tokens`);
        console.log(`   Tier: ${tier}`);
        console.log(`   Access: ${gate.hasAccess ? '✅ Granted' : '❌ Denied'}`);
        
        if (stakeInfo && isAccessRevoked(stakeInfo.status)) {
          console.log(`   ⚠️  Access Revoked: Unstaking in progress`);
        }
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
