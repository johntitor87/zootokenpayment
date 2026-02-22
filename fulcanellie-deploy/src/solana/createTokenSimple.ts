import {
  Connection,
  Keypair,
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

// Simple token creation function
async function createToken(
  name: string,
  symbol: string,
  decimals: number = 9,
  supply: number = 0,
  network: 'devnet' | 'mainnet' = 'devnet',
  imagePath?: string
) {
  // RPC endpoints
  const RPC_URL = network === 'devnet' 
    ? 'https://api.devnet.solana.com'
    : 'https://api.mainnet.solana.com';

  const connection = new Connection(RPC_URL, 'confirmed');

  // Load or create payer keypair
  const keypairPath = path.join(process.cwd(), 'wallet.json');
  let payer: Keypair;

  if (fs.existsSync(keypairPath)) {
    const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    console.log(`✅ Loaded wallet: ${payer.publicKey.toBase58()}`);
  } else {
    payer = Keypair.generate();
    fs.writeFileSync(keypairPath, JSON.stringify(Array.from(payer.secretKey)));
    console.log(`✅ Created new wallet: ${payer.publicKey.toBase58()}`);
    console.log(`   Saved to: ${keypairPath}`);
  }

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`💰 Balance: ${balance / 1e9} SOL`);

  if (balance === 0) {
    console.log(`\n⚠️  You need SOL for transaction fees!`);
    if (network === 'devnet') {
      console.log(`   Get free devnet SOL: https://faucet.solana.com/`);
    }
    return;
  }

  // Create token mint
  console.log(`\n🔨 Creating token: ${name} (${symbol})...`);
  const mintKeypair = Keypair.generate();
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey, // mint authority
    null, // freeze authority (none)
    decimals,
    mintKeypair
  );

  console.log(`✅ Token mint: ${mint.toBase58()}`);

  // Create token account
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  console.log(`✅ Token account: ${tokenAccount.address.toBase58()}`);

  // Mint initial supply if specified
  if (supply > 0) {
    console.log(`\n🪙 Minting ${supply} ${symbol}...`);
    await mintTo(
      connection,
      payer,
      mint,
      tokenAccount.address,
      payer.publicKey,
      supply * Math.pow(10, decimals)
    );
    console.log(`✅ Minted ${supply} ${symbol}`);
  }

  // Handle image if provided
  let imageUri: string | undefined;
  if (imagePath) {
    const imageFullPath = path.isAbsolute(imagePath) 
      ? imagePath 
      : path.join(process.cwd(), imagePath);
    
    if (fs.existsSync(imageFullPath)) {
      // Create token assets directory
      const assetsDir = path.join(process.cwd(), 'token-assets', symbol);
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      
      // Copy image to assets directory
      const imageExt = path.extname(imageFullPath);
      const imageFileName = `token-image${imageExt}`;
      const destImagePath = path.join(assetsDir, imageFileName);
      fs.copyFileSync(imageFullPath, destImagePath);
      
      imageUri = `./token-assets/${symbol}/${imageFileName}`;
      console.log(`\n🖼️  Image saved: ${imageUri}`);
    } else if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      // It's a URL
      imageUri = imagePath;
      console.log(`\n🖼️  Using image URL: ${imageUri}`);
    } else {
      console.log(`\n⚠️  Image file not found: ${imagePath}`);
    }
  }

  // Create metadata
  const metadata = {
    name,
    symbol,
    description: `${name} (${symbol}) token on Solana ${network}`,
    image: imageUri || '',
    decimals,
    supply: supply.toString(),
    network,
    mint: mint.toBase58(),
    tokenAccount: tokenAccount.address.toBase58(),
    wallet: payer.publicKey.toBase58(),
    explorer: `https://explorer.solana.com/address/${mint.toBase58()}?cluster=${network}`,
    createdAt: new Date().toISOString(),
  };

  // Save token info and metadata
  const infoFile = `token-${symbol}.json`;
  fs.writeFileSync(infoFile, JSON.stringify(metadata, null, 2));
  console.log(`\n💾 Token info saved: ${infoFile}`);

  // Also save metadata in standard format
  const metadataFile = path.join(process.cwd(), 'token-assets', symbol, 'metadata.json');
  if (fs.existsSync(path.dirname(metadataFile))) {
    fs.writeFileSync(metadataFile, JSON.stringify({
      name,
      symbol,
      description: metadata.description,
      image: imageUri || '',
      properties: {
        mint: mint.toBase58(),
        decimals,
        supply: supply.toString(),
        network,
      }
    }, null, 2));
    console.log(`💾 Metadata saved: ${metadataFile}`);
  }

  console.log(`\n🎉 Token created successfully!`);
  console.log(`\n📋 Details:`);
  console.log(`   Name: ${name}`);
  console.log(`   Symbol: ${symbol}`);
  console.log(`   Decimals: ${decimals}`);
  console.log(`   Supply: ${supply}`);
  console.log(`   Mint: ${mint.toBase58()}`);
  if (imageUri) {
    console.log(`   Image: ${imageUri}`);
  }
  console.log(`   Explorer: ${metadata.explorer}`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npm run create-token-simple <name> <symbol> [decimals] [supply] [network] [image.jpg]');
    console.log('\nExamples:');
    console.log('  npm run create-token-simple "My Token" MYT 9 1000000 devnet');
    console.log('  npm run create-token-simple "Dad Token" DAD 9 1000000 devnet ./dad-token.jpg');
    console.log('  npm run create-token-simple "My Token" MYT 9 0 mainnet https://example.com/image.jpg');
    process.exit(1);
  }

  const name = args[0];
  const symbol = args[1];
  const decimals = args[2] ? parseInt(args[2]) : 9;
  const supply = args[3] ? parseFloat(args[3]) : 0;
  const network = (args[4] || 'devnet') as 'devnet' | 'mainnet';
  const imagePath = args[5]; // Optional image path or URL

  await createToken(name, symbol, decimals, supply, network, imagePath);
}

main().catch(console.error);
