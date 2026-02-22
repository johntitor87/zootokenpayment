#!/usr/bin/env node

/**
 * CLI for Controlled Burning
 * 
 * SECURITY: These commands should only be run from backend/server
 * NEVER expose these functions to frontend
 */

import {
  processPurchaseWithBurn,
  refundBurn,
  getBurnHistory,
  verifyBurnConditions,
  generateConfirmation,
} from './controlledBurn';
import * as fs from 'fs';
import * as path from 'path';

interface ProductConfig {
  productId: string;
  burnAmount: number;
  isActive: boolean;
  mintAddress: string;
  network?: 'devnet' | 'mainnet';
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
Controlled Burning CLI

⚠️  SECURITY WARNING: These commands should only be run from backend/server
    NEVER expose these functions to frontend clients

Usage:
  npm run burn <command> [options]

Commands:
  purchase <user> <product-id> <mint> [network]
    - Process purchase with token burn (backend only)
  
  verify <user> <product-id> <amount> <mint> [network]
    - Verify burn conditions before executing
  
  refund <signature> <user> <amount> <mint> [network]
    - Refund a burn (if purchase failed)
  
  history [user]
    - View burn history

Examples:
  npm run burn purchase <user-address> product-123 FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3
  npm run burn verify <user-address> product-123 100 FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3
  npm run burn refund <signature> <user-address> 100 FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3
`);
    process.exit(1);
  }

  try {
    switch (command) {
      case 'purchase': {
        const userAddress = args[1];
        const productId = args[2];
        const mintAddress = args[3];
        const network = (args[4] || 'devnet') as 'devnet' | 'mainnet';

        if (!userAddress || !productId || !mintAddress) {
          console.error('Error: user address, product ID, and mint address required');
          process.exit(1);
        }

        // Load product config (in production, load from database)
        const configPath = path.join(process.cwd(), 'product-configs.json');
        let productConfigs: Record<string, ProductConfig> = {};

        if (fs.existsSync(configPath)) {
          productConfigs = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }

        const productConfig = productConfigs[productId] || {
          productId,
          burnAmount: 10, // Default
          isActive: true,
          mintAddress,
          network,
        };

        const result = await processPurchaseWithBurn(
          userAddress,
          productId,
          productConfig
        );

        console.log(`\n✅ Purchase processed with burn:`);
        console.log(`   User: ${userAddress}`);
        console.log(`   Product: ${productId}`);
        console.log(`   Burned: ${result.amount} tokens`);
        console.log(`   Signature: ${result.signature}`);
        console.log(`   Confirmation: ${result.confirmation}`);
        break;
      }

      case 'verify': {
        const userAddress = args[1];
        const productId = args[2];
        const burnAmount = parseFloat(args[3]);
        const mintAddress = args[4];
        const network = (args[5] || 'devnet') as 'devnet' | 'mainnet';

        if (!userAddress || !productId || !burnAmount || !mintAddress) {
          console.error('Error: all parameters required');
          process.exit(1);
        }

        const config = {
          productId,
          burnAmount,
          isActive: true,
          mintAddress,
          network,
        };

        const verification = await verifyBurnConditions(
          userAddress,
          productId,
          burnAmount,
          config
        );

        if (verification.valid) {
          console.log(`\n✅ Burn conditions verified`);
        } else {
          console.log(`\n❌ Burn verification failed: ${verification.reason}`);
        }
        break;
      }

      case 'refund': {
        const signature = args[1];
        const userAddress = args[2];
        const refundAmount = parseFloat(args[3]);
        const mintAddress = args[4];
        const network = (args[5] || 'devnet') as 'devnet' | 'mainnet';

        if (!signature || !userAddress || !refundAmount || !mintAddress) {
          console.error('Error: all parameters required');
          process.exit(1);
        }

        const refundSig = await refundBurn(
          signature,
          userAddress,
          refundAmount,
          mintAddress,
          network
        );

        console.log(`\n✅ Refund processed:`);
        console.log(`   Original: ${signature}`);
        console.log(`   Refund: ${refundSig}`);
        console.log(`   Amount: ${refundAmount} tokens`);
        break;
      }

      case 'history': {
        const userAddress = args[1];
        const history = getBurnHistory(userAddress);

        if (history.length === 0) {
          console.log('\n📋 No burn history found');
        } else {
          console.log(`\n📋 Burn History${userAddress ? ` for ${userAddress}` : ''}:`);
          history.forEach((log: any, index: number) => {
            console.log(`\n${index + 1}. ${log.productId}`);
            console.log(`   Amount: ${log.amount} tokens`);
            console.log(`   Signature: ${log.signature}`);
            console.log(`   Time: ${new Date(log.timestamp).toLocaleString()}`);
            if (log.refunded) {
              console.log(`   ⚠️  REFUNDED`);
            }
          });
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






