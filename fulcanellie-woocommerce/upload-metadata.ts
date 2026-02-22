import { NFTStorage, File } from 'nft.storage';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Upload metadata JSON to IPFS using NFT.Storage (free, no API key needed)
 */
async function uploadMetadata(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    console.log(`\nFull path: ${path.resolve(filePath)}`);
    process.exit(1);
  }

  console.log(`\n📤 Uploading ${path.basename(filePath)} to IPFS via NFT.Storage...`);
  console.log(`   File: ${path.resolve(filePath)}`);

  // NFT.Storage is free and doesn't require API keys for basic usage
  // But you can optionally set NFT_STORAGE_API_KEY if you have one
  const apiKey = process.env.NFT_STORAGE_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDg1MkY3MkE4M0U1M0U2M0U2M0U2M0U2M0U2M0U2M0UiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTYzODQ2ODAwMCwiZXhwIjoxOTU0MDQ0MDAwfQ.example';
  
  const client = new NFTStorage({ token: apiKey });

  try {
    const fileContent = fs.readFileSync(filePath);
    const file = new File([fileContent], path.basename(filePath), {
      type: 'application/json',
    });

    const cid = await client.storeBlob(file);
    
    const ipfsUrl = `ipfs://${cid}`;
    const gatewayUrl = `https://ipfs.io/ipfs/${cid}`;
    const pinataUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

    console.log(`\n✅ Upload successful!`);
    console.log(`\n📋 IPFS Details:`);
    console.log(`   CID: ${cid}`);
    console.log(`   IPFS URL: ${ipfsUrl}`);
    console.log(`   Gateway URL: ${gatewayUrl}`);
    console.log(`   Pinata Gateway: ${pinataUrl}`);

    console.log(`\n📝 Next step - Update metadata URI:`);
    console.log(`   npm run update-metadata-uri FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 ${gatewayUrl}`);

    return {
      cid,
      ipfsUrl,
      gatewayUrl,
      pinataUrl,
    };
  } catch (error: any) {
    console.error('\n❌ Upload failed:', error.message);
    console.log('\n💡 Alternative: Try uploading manually via Pinata web interface');
    console.log(`   File location: ${path.resolve(filePath)}`);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0] || path.join(process.cwd(), 'metadata-ZOO.json');

  await uploadMetadata(filePath);
}

if (require.main === module) {
  main().catch(console.error);
}

export { uploadMetadata };

