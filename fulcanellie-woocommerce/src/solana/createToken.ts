import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  TOKEN_PROGRAM_ID,
  AuthorityType,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Configuration
const RPC_ENDPOINTS = {
  devnet: 'https://api.devnet.solana.com',
  mainnet: 'https://api.mainnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
};

interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  network: 'devnet' | 'mainnet' | 'testnet';
  mintAuthority?: string; // Public key as string
  freezeAuthority?: string; // Public key as string
}

/**
 * Load keypair from file or generate new one
 */
function loadOrCreateKeypair(filePath: string): Keypair {
  try {
    if (fs.existsSync(filePath)) {
      const secretKey = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return Keypair.fromSecretKey(Uint8Array.from(secretKey));
    } else {
      const keypair = Keypair.generate();
      fs.writeFileSync(filePath, JSON.stringify(Array.from(keypair.secretKey)));
      console.log(`✅ Generated new keypair and saved to ${filePath}`);
      return keypair;
    }
  } catch (error) {
    console.error('❌ Error loading keypair:', error);
    throw error;
  }
}

/**
 * Get user input from command line
 */
function getUserInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Create a new SPL token
 */
async function createSolanaToken(config: TokenConfig, payer: Keypair): Promise<string> {
  const connection = new Connection(RPC_ENDPOINTS[config.network], 'confirmed');
  
  console.log(`\n🌐 Connecting to Solana ${config.network}...`);
  console.log(`📝 Token Details:`);
  console.log(`   Name: ${config.name}`);
  console.log(`   Symbol: ${config.symbol}`);
  console.log(`   Decimals: ${config.decimals}`);
  console.log(`   Initial Supply: ${config.initialSupply}`);
  console.log(`   Network: ${config.network}`);

  try {
    // Check balance
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`\n💰 Payer balance: ${balance / 1e9} SOL`);

    if (balance === 0) {
      console.log(`\n⚠️  Warning: Your wallet has 0 SOL. You need SOL to pay for transaction fees.`);
      if (config.network === 'devnet') {
        console.log(`   Get free devnet SOL at: https://faucet.solana.com/`);
      }
    }

    // Create mint account
    console.log(`\n🔨 Creating token mint...`);
    const mintKeypair = Keypair.generate();
    
    const mintAuthority = config.mintAuthority 
      ? new PublicKey(config.mintAuthority)
      : payer.publicKey;
    
    const freezeAuthority = config.freezeAuthority
      ? new PublicKey(config.freezeAuthority)
      : null;

    const mint = await createMint(
      connection,
      payer,
      mintAuthority,
      freezeAuthority,
      config.decimals,
      mintKeypair,
      undefined,
      TOKEN_PROGRAM_ID
    );

    console.log(`✅ Token mint created: ${mint.toBase58()}`);

    // Create associated token account for the payer
    console.log(`\n📦 Creating token account...`);
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      payer.publicKey
    );

    console.log(`✅ Token account created: ${tokenAccount.address.toBase58()}`);

    // Mint initial supply
    if (config.initialSupply > 0) {
      console.log(`\n🪙 Minting ${config.initialSupply} tokens...`);
      await mintTo(
        connection,
        payer,
        mint,
        tokenAccount.address,
        mintAuthority,
        config.initialSupply * Math.pow(10, config.decimals)
      );
      console.log(`✅ Minted ${config.initialSupply} ${config.symbol} tokens`);
    }

    // Optionally revoke mint authority (makes supply fixed)
    if (config.initialSupply > 0) {
      const revokeMint = await getUserInput(
        '\n❓ Do you want to revoke mint authority? (makes supply fixed) [y/N]: '
      );
      
      if (revokeMint.toLowerCase() === 'y') {
        console.log(`\n🔒 Revoking mint authority...`);
        await setAuthority(
          connection,
          payer,
          mint,
          payer.publicKey,
          AuthorityType.MintTokens,
          null
        );
        console.log(`✅ Mint authority revoked - token supply is now fixed`);
      }
    }

    // Save token info
    const tokenInfo = {
      mint: mint.toBase58(),
      tokenAccount: tokenAccount.address.toBase58(),
      decimals: config.decimals,
      symbol: config.symbol,
      name: config.name,
      network: config.network,
      createdAt: new Date().toISOString(),
    };

    const infoPath = path.join(process.cwd(), `token-${config.symbol}-${Date.now()}.json`);
    fs.writeFileSync(infoPath, JSON.stringify(tokenInfo, null, 2));
    console.log(`\n💾 Token info saved to: ${infoPath}`);

    console.log(`\n🎉 Token created successfully!`);
    console.log(`\n📋 Summary:`);
    console.log(`   Mint Address: ${mint.toBase58()}`);
    console.log(`   Token Account: ${tokenAccount.address.toBase58()}`);
    console.log(`   Explorer: https://explorer.solana.com/address/${mint.toBase58()}?cluster=${config.network}`);

    return mint.toBase58();
  } catch (error) {
    console.error('❌ Error creating token:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Solana Token Creator');
  console.log('======================\n');

  // Load or create payer keypair
  const keypairPath = path.join(process.cwd(), 'solana-keypair.json');
  const payer = loadOrCreateKeypair(keypairPath);
  console.log(`📱 Payer public key: ${payer.publicKey.toBase58()}\n`);

  // Get token configuration
  const name = await getUserInput('Token name: ');
  const symbol = await getUserInput('Token symbol: ');
  const decimalsInput = await getUserInput('Decimals (default 9): ');
  const decimals = decimalsInput ? parseInt(decimalsInput) : 9;
  const supplyInput = await getUserInput('Initial supply (default 0): ');
  const initialSupply = supplyInput ? parseFloat(supplyInput) : 0;
  
  const networkInput = await getUserInput('Network [devnet/mainnet] (default devnet): ');
  const network = (networkInput || 'devnet') as 'devnet' | 'mainnet' | 'testnet';

  const config: TokenConfig = {
    name,
    symbol,
    decimals,
    initialSupply,
    network,
  };

  // Optional: set custom authorities
  const customMintAuthority = await getUserInput('Mint authority (press Enter to use payer): ');
  if (customMintAuthority) {
    config.mintAuthority = customMintAuthority;
  }

  const customFreezeAuthority = await getUserInput('Freeze authority (press Enter for none): ');
  if (customFreezeAuthority) {
    config.freezeAuthority = customFreezeAuthority;
  }

  try {
    await createSolanaToken(config, payer);
  } catch (error) {
    console.error('\n❌ Failed to create token:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { createSolanaToken, TokenConfig };



