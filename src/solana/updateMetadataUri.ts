import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity, publicKey } from '@metaplex-foundation/umi';
import {
  updateMetadataAccountV2,
  findMetadataPda,
  mplTokenMetadata,
  fetchMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import * as fs from 'fs';
import * as path from 'path';

async function updateMetadataUri(mintAddress: string, newUri: string) {
  // Load wallet
  const walletPath = path.join(process.cwd(), 'wallet.json');
  if (!fs.existsSync(walletPath)) {
    throw new Error('Wallet not found. Please create a wallet first.');
  }

  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));

  // Determine network
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

  console.log(`\n📝 Updating metadata URI for token: ${mintAddress}`);
  console.log(`   New URI: ${newUri}`);

  // Find metadata PDA
  const metadataPda = findMetadataPda(umi, { mint: mintPublicKey });
  console.log(`\n🔍 Metadata PDA: ${metadataPda}`);

  try {
    // Fetch existing metadata to preserve other fields
    const existingMetadata = await fetchMetadata(umi, metadataPda);
    
    if (!existingMetadata) {
      throw new Error('Metadata account not found. Create metadata first.');
    }

    // Update metadata account - update URI, keep everything else
    const tx = await updateMetadataAccountV2(umi, {
      metadata: metadataPda,
      updateAuthority: signer,
      data: {
        name: existingMetadata.name,
        symbol: existingMetadata.symbol,
        uri: newUri, // Update URI
        sellerFeeBasisPoints: existingMetadata.sellerFeeBasisPoints,
        creators: existingMetadata.creators,
        collection: existingMetadata.collection,
        uses: existingMetadata.uses,
      },
    }).sendAndConfirm(umi);

    console.log(`\n✅ Metadata URI updated!`);
    console.log(`   Transaction: ${tx}`);

    return {
      metadataPda,
      signature: tx,
    };
  } catch (error: any) {
    console.error('\n❌ Error updating metadata:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npm run update-metadata-uri <mint-address> <new-uri>');
    console.log('\nExample:');
    console.log('  npm run update-metadata-uri FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 https://gateway.pinata.cloud/ipfs/QmXXX');
    process.exit(1);
  }

  const mintAddress = args[0];
  const newUri = args[1];

  await updateMetadataUri(mintAddress, newUri);
}

if (require.main === module) {
  main().catch(console.error);
}

export { updateMetadataUri };

