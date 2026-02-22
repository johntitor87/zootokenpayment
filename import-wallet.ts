import { Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Helper script to import a wallet keypair
 * Usage: 
 *   ts-node import-wallet.ts <keypair-file-path>
 *   OR
 *   ts-node import-wallet.ts <public-key> <secret-key-array>
 */

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  ts-node import-wallet.ts <keypair-file-path>');
    console.log('  ts-node import-wallet.ts <public-key> <secret-key-array-json>');
    console.log('\nExample:');
    console.log('  ts-node import-wallet.ts ./my-keypair.json');
    process.exit(1);
  }

  let keypair: Keypair;
  const walletPath = path.join(process.cwd(), 'wallet.json');

  if (args.length === 1) {
    // Load from keypair file
    const keypairPath = path.isAbsolute(args[0]) 
      ? args[0] 
      : path.join(process.cwd(), args[0]);
    
    if (!fs.existsSync(keypairPath)) {
      console.error(`❌ Keypair file not found: ${keypairPath}`);
      process.exit(1);
    }

    const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } else {
    // Create from public key and secret key array
    const publicKeyStr = args[0];
    const secretKeyArray = JSON.parse(args[1]);

    try {
      // Verify public key matches
      const expectedPublicKey = new PublicKey(publicKeyStr);
      keypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
      
      if (!keypair.publicKey.equals(expectedPublicKey)) {
        console.error('❌ Public key does not match secret key!');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Invalid keypair data:', error);
      process.exit(1);
    }
  }

  // Save to wallet.json
  fs.writeFileSync(walletPath, JSON.stringify(Array.from(keypair.secretKey)));
  
  console.log('✅ Wallet imported successfully!');
  console.log(`   Public Key: ${keypair.publicKey.toBase58()}`);
  console.log(`   Saved to: ${walletPath}`);
}

main().catch(console.error);






