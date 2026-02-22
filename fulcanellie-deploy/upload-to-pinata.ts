import * as fs from 'fs';
import * as path from 'path';
import * as FormData from 'form-data';
import axios from 'axios';

/**
 * Upload file to Pinata IPFS
 * Requires PINATA_JWT environment variable
 */
async function uploadToPinata(filePath: string, pinataJwt?: string) {
  const jwt = pinataJwt || process.env.PINATA_JWT;

  if (!jwt) {
    console.error('❌ PINATA_JWT not found!');
    console.log('\nTo upload via API, you need a Pinata JWT token:');
    console.log('1. Go to https://app.pinata.cloud/');
    console.log('2. Go to API Keys section');
    console.log('3. Create a new API key');
    console.log('4. Set it as: export PINATA_JWT="your-jwt-token"');
    console.log('\nOr pass it as: ts-node upload-to-pinata.ts <file> <jwt-token>');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const fileContent = fs.createReadStream(filePath);
  const fileName = path.basename(filePath);

  const formData = new FormData();
  formData.append('file', fileContent, fileName);

  try {
    console.log(`\n📤 Uploading ${fileName} to Pinata...`);

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    const ipfsHash = response.data.IpfsHash;
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const ipfsUrl = `ipfs://${ipfsHash}`;

    console.log(`\n✅ Upload successful!`);
    console.log(`\n📋 IPFS Details:`);
    console.log(`   Hash: ${ipfsHash}`);
    console.log(`   IPFS URL: ${ipfsUrl}`);
    console.log(`   Gateway URL: ${gatewayUrl}`);

    return {
      hash: ipfsHash,
      ipfsUrl,
      gatewayUrl,
    };
  } catch (error: any) {
    console.error('\n❌ Upload failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n💡 Your JWT token might be invalid or expired.');
    }
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  ts-node upload-to-pinata.ts <file-path> [jwt-token]');
    console.log('\nExample:');
    console.log('  ts-node upload-to-pinata.ts metadata-ZOO.json');
    console.log('  ts-node upload-to-pinata.ts metadata-ZOO.json your-jwt-token');
    console.log('\nOr set PINATA_JWT environment variable');
    process.exit(1);
  }

  const filePath = args[0];
  const jwt = args[1];

  await uploadToPinata(filePath, jwt);
}

if (require.main === module) {
  main().catch(console.error);
}

export { uploadToPinata };






