import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity, publicKey } from '@metaplex-foundation/umi';
import {
  createMetadataAccountV3,
  findMetadataPda,
  mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import { Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

async function addMetadata(
  mintAddress: string,
  name: string,
  symbol: string,
  imageUrl: string,
  description?: string
) {
  // Load wallet
  const walletPath = path.join(process.cwd(), 'wallet.json');
  if (!fs.existsSync(walletPath)) {
    throw new Error('Wallet not found. Please create a wallet first.');
  }

  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));

  // Determine network from mint or use devnet
  const network = 'devnet';
  const rpcUrl = network === 'devnet'
    ? 'https://api.devnet.solana.com'
    : 'https://api.mainnet.solana.com';

  // Create UMI instance
  const umi = createUmi(rpcUrl);
  
  // Convert keypair to UMI signer
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(
    Uint8Array.from(secretKey)
  );
  const signer = createSignerFromKeypair(umi, umiKeypair);
  
  umi.use(signerIdentity(signer));
  umi.use(mplTokenMetadata());

  const mintPublicKey = publicKey(mintAddress);

  console.log(`\n📝 Adding metadata to token: ${mintAddress}`);
  console.log(`   Name: ${name}`);
  console.log(`   Symbol: ${symbol}`);
  console.log(`   Image: ${imageUrl}`);

  // Create metadata JSON file first
  const metadataJson = {
    name,
    symbol,
    description: description || `${name} token`,
    image: imageUrl,
  };

  const metadataJsonPath = path.join(process.cwd(), `metadata-${symbol}.json`);
  fs.writeFileSync(metadataJsonPath, JSON.stringify(metadataJson, null, 2));
  console.log(`\n📄 Created metadata JSON: ${metadataJsonPath}`);
  console.log(`\n⚠️  IMPORTANT: Upload this JSON file to IPFS/Pinata and use that URI!`);
  console.log(`   For now, we'll create metadata with a placeholder URI.`);
  console.log(`   You can update it later with the IPFS URI.`);

  // Find metadata PDA
  const metadataPda = findMetadataPda(umi, { mint: mintPublicKey });
  console.log(`\n🔍 Metadata PDA: ${metadataPda}`);

  // For now, use a placeholder URI - user needs to upload JSON to IPFS
  const metadataUri = imageUrl; // Temporary - should be IPFS URI to JSON file

  try {
    // Create metadata account
    const tx = await createMetadataAccountV3(umi, {
      metadata: metadataPda,
      mint: mintPublicKey,
      mintAuthority: signer,
      payer: signer,
      updateAuthority: signer,
      data: {
        name,
        symbol,
        uri: metadataUri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
      },
      isMutable: true,
      collectionDetails: null,
    }).sendAndConfirm(umi);

    console.log(`\n✅ Metadata transaction sent!`);
    console.log(`   Signature: ${tx}`);

    console.log(`\n📋 Next Steps:`);
    console.log(`   1. Upload ${metadataJsonPath} to Pinata/IPFS`);
    console.log(`   2. Get the IPFS URI (e.g., ipfs://QmXXX... or https://gateway.pinata.cloud/ipfs/QmXXX...)`);
    console.log(`   3. Update the metadata URI using an update script`);

    return {
      metadataPda: metadataPda,
      signature: tx,
      metadataJsonPath,
    };
  } catch (error: any) {
    console.error('\n❌ Error creating metadata:', error);
    if (error.message?.includes('already in use')) {
      console.log('\n💡 Metadata may already exist. Try updating it instead.');
    }
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.log('Usage: npm run add-metadata <mint-address> <name> <symbol> <image-url> [description]');
    console.log('\nExample:');
    console.log('  npm run add-metadata FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 "ZOO" "ZOO" "https://..." "ZOO token description"');
    process.exit(1);
  }

  const mintAddress = args[0];
  const name = args[1];
  const symbol = args[2];
  const imageUrl = args[3];
  const description = args[4];

  await addMetadata(mintAddress, name, symbol, imageUrl, description);
}

if (require.main === module) {
  main().catch(console.error);
}

export { addMetadata };

