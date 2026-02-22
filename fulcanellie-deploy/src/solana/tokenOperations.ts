import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  mintTo,
  burn,
  transfer,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Token Operations - Minting, Burning, Transfers
 */

// Load wallet helper
function loadWallet(): Keypair {
  const walletPath = path.join(process.cwd(), 'wallet.json');
  if (!fs.existsSync(walletPath)) {
    throw new Error('Wallet not found. Please create a wallet first.');
  }
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

// Get connection
function getConnection(network: 'devnet' | 'mainnet' = 'devnet'): Connection {
  const rpcUrl = network === 'devnet'
    ? 'https://api.devnet.solana.com'
    : 'https://api.mainnet.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

/**
 * Mint additional tokens
 */
export async function mintTokens(
  mintAddress: string,
  amount: number,
  decimals: number = 9,
  recipientAddress?: string,
  network: 'devnet' | 'mainnet' = 'devnet'
) {
  const connection = getConnection(network);
  const payer = loadWallet();
  const mint = new PublicKey(mintAddress);

  // Determine recipient
  const recipient = recipientAddress
    ? new PublicKey(recipientAddress)
    : payer.publicKey;

  console.log(`\n🪙 Minting ${amount} tokens...`);
  console.log(`   Mint: ${mintAddress}`);
  console.log(`   Recipient: ${recipient.toBase58()}`);

  // Get or create token account
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    recipient
  );

  // Mint tokens
  const signature = await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer, // mint authority
    amount * Math.pow(10, decimals)
  );

  console.log(`✅ Minted ${amount} tokens`);
  console.log(`   Token Account: ${tokenAccount.address.toBase58()}`);
  console.log(`   Signature: ${signature}`);

  return {
    signature,
    tokenAccount: tokenAccount.address.toBase58(),
  };
}

/**
 * Burn tokens
 */
export async function burnTokens(
  mintAddress: string,
  amount: number,
  decimals: number = 9,
  tokenAccountAddress?: string,
  network: 'devnet' | 'mainnet' = 'devnet'
) {
  const connection = getConnection(network);
  const payer = loadWallet();
  const mint = new PublicKey(mintAddress);

  // Get token account
  let tokenAccount: PublicKey;
  if (tokenAccountAddress) {
    tokenAccount = new PublicKey(tokenAccountAddress);
  } else {
    tokenAccount = await getAssociatedTokenAddress(mint, payer.publicKey);
  }

  console.log(`\n🔥 Burning ${amount} tokens...`);
  console.log(`   Mint: ${mintAddress}`);
  console.log(`   Token Account: ${tokenAccount.toBase58()}`);

  // Burn tokens
  const signature = await burn(
    connection,
    payer,
    tokenAccount,
    mint,
    payer, // owner
    amount * Math.pow(10, decimals)
  );

  console.log(`✅ Burned ${amount} tokens`);
  console.log(`   Signature: ${signature}`);

  return { signature };
}

/**
 * Transfer tokens
 */
export async function transferTokens(
  mintAddress: string,
  toAddress: string,
  amount: number,
  decimals: number = 9,
  fromAddress?: string,
  network: 'devnet' | 'mainnet' = 'devnet'
) {
  const connection = getConnection(network);
  const payer = loadWallet();
  const mint = new PublicKey(mintAddress);
  const to = new PublicKey(toAddress);

  // Determine sender
  const from = fromAddress ? new PublicKey(fromAddress) : payer.publicKey;

  console.log(`\n📤 Transferring ${amount} tokens...`);
  console.log(`   From: ${from.toBase58()}`);
  console.log(`   To: ${to.toBase58()}`);

  // Get source token account
  const sourceTokenAccount = await getAssociatedTokenAddress(mint, from);

  // Get or create destination token account
  const destTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    to
  );

  // Transfer tokens
  const signature = await transfer(
    connection,
    payer, // payer for fees
    sourceTokenAccount,
    destTokenAccount.address,
    from, // owner of source account
    amount * Math.pow(10, decimals)
  );

  console.log(`✅ Transferred ${amount} tokens`);
  console.log(`   Signature: ${signature}`);

  return {
    signature,
    fromAccount: sourceTokenAccount.toBase58(),
    toAccount: destTokenAccount.address.toBase58(),
  };
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  mintAddress: string,
  ownerAddress?: string,
  network: 'devnet' | 'mainnet' = 'devnet'
) {
  const connection = getConnection(network);
  const payer = loadWallet();
  const mint = new PublicKey(mintAddress);
  const owner = ownerAddress ? new PublicKey(ownerAddress) : payer.publicKey;

  const tokenAccount = await getAssociatedTokenAddress(mint, owner);
  
  try {
    const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
    const balance = Number(accountInfo.value.amount) / Math.pow(10, accountInfo.value.decimals);
    
    return {
      balance,
      decimals: accountInfo.value.decimals,
      uiAmount: accountInfo.value.uiAmount,
      tokenAccount: tokenAccount.toBase58(),
    };
  } catch (error) {
    return {
      balance: 0,
      decimals: 9,
      uiAmount: 0,
      tokenAccount: tokenAccount.toBase58(),
    };
  }
}






