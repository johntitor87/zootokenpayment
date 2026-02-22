import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// Generate a new wallet
const keypair = Keypair.generate();

// Get the secret key as an array
const secretKey = Array.from(keypair.secretKey);

// Display wallet information
console.log('\n🔑 New Wallet Generated!\n');
console.log('═══════════════════════════════════════════════════════');
console.log(`Public Key (Address): ${keypair.publicKey.toBase58()}`);
console.log('═══════════════════════════════════════════════════════');
console.log('\nPrivate Key (Secret Key Array):');
console.log(JSON.stringify(secretKey));
console.log('\n═══════════════════════════════════════════════════════');

// Save to wallet.json
const walletPath = path.join(process.cwd(), 'wallet.json');
fs.writeFileSync(walletPath, JSON.stringify(secretKey));

console.log(`\n✅ Wallet saved to: ${walletPath}`);
console.log('\n⚠️  IMPORTANT: Keep your private key secure!');
console.log('   Never share it or commit it to version control.\n');






