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

async function updateMetadataName(
  mintAddress: string,
  newName: string,
  newSymbol?: string,
  newDescription?: string
) {
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

  console.log(`\n📝 Updating metadata for token: ${mintAddress}`);
  console.log(`   New Name: ${newName}`);
  if (newSymbol) console.log(`   New Symbol: ${newSymbol}`);
  if (newDescription) console.log(`   New Description: ${newDescription}`);

  // Find metadata PDA
  const metadataPda = findMetadataPda(umi, { mint: mintPublicKey });
  console.log(`\n🔍 Metadata PDA: ${metadataPda}`);

  try {
    // Fetch existing metadata to preserve other fields
    const existingMetadata = await fetchMetadata(umi, metadataPda);
    
    if (!existingMetadata) {
      throw new Error('Metadata account not found. Create metadata first.');
    }

    // Update metadata account
    const tx = await updateMetadataAccountV2(umi, {
      metadata: metadataPda,
      updateAuthority: signer,
      data: {
        name: newName,
        symbol: newSymbol || existingMetadata.symbol,
        uri: existingMetadata.uri, // Keep existing URI
        sellerFeeBasisPoints: existingMetadata.sellerFeeBasisPoints,
        creators: existingMetadata.creators,
        collection: existingMetadata.collection,
        uses: existingMetadata.uses,
      },
    }).sendAndConfirm(umi);

    console.log(`\n✅ Metadata updated!`);
    console.log(`   Transaction: ${tx}`);

    // Update local token info file
    const tokenInfoPath = path.join(process.cwd(), 'token-ZOO.json');
    if (fs.existsSync(tokenInfoPath)) {
      const tokenInfo = JSON.parse(fs.readFileSync(tokenInfoPath, 'utf-8'));
      tokenInfo.name = newName;
      if (newSymbol) tokenInfo.symbol = newSymbol;
      if (newDescription) tokenInfo.description = newDescription;
      fs.writeFileSync(tokenInfoPath, JSON.stringify(tokenInfo, null, 2));
      console.log(`\n💾 Updated local token info: ${tokenInfoPath}`);
    }

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
    console.log('Usage: npm run update-metadata-name <mint-address> <new-name> [new-symbol] [new-description]');
    console.log('\nExample:');
    console.log('  npm run update-metadata-name FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 "Lions in the zoo"');
    console.log('  npm run update-metadata-name FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 "Lions in the zoo" ZOO "Lions in the zoo token"');
    process.exit(1);
  }

  const mintAddress = args[0];
  const newName = args[1];
  const newSymbol = args[2];
  const newDescription = args[3];

  await updateMetadataName(mintAddress, newName, newSymbol, newDescription);
}

if (require.main === module) {
  main().catch(console.error);
}

export { updateMetadataName };






