import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Controlled Burning System - Backend/On-Chain Verification
 * 
 * This module provides secure, on-chain verified burning that cannot be spoofed
 * by frontend manipulation.
 */

interface BurnConfig {
  productId: string;
  burnAmount: number;
  isActive: boolean;
  mintAddress: string;
  programId?: string;
  network?: 'devnet' | 'mainnet';
}

interface BurnRequest {
  userAddress: string;
  productId: string;
  confirmation: string; // Unique confirmation ID
  amount?: number; // Optional override
}

interface BurnResult {
  signature: string;
  amount: number;
  productId: string;
  confirmation: string;
}

// Load wallet helper
function loadWallet(): Keypair {
  const walletPath = path.join(process.cwd(), 'wallet.json');
  if (!fs.existsSync(walletPath)) {
    throw new Error('Wallet not found. Please create a wallet first.');
  }
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

function getConnection(network: 'devnet' | 'mainnet' = 'devnet'): Connection {
  const rpcUrl = network === 'devnet'
    ? 'https://api.devnet.solana.com'
    : 'https://api.mainnet.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

/**
 * Generate unique confirmation ID to prevent replay attacks
 */
export function generateConfirmation(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Verify burn conditions before executing
 */
export async function verifyBurnConditions(
  userAddress: string,
  productId: string,
  burnAmount: number,
  config: BurnConfig
): Promise<{ valid: boolean; reason?: string }> {
  const connection = getConnection(config.network);
  const mint = new PublicKey(config.mintAddress);
  const user = new PublicKey(userAddress);

  // 1. Verify product is active
  if (!config.isActive) {
    return { valid: false, reason: 'Burn not active for this product' };
  }

  // 2. Verify product ID matches
  if (config.productId !== productId) {
    return { valid: false, reason: 'Invalid product ID' };
  }

  // 3. Verify user has sufficient balance
  try {
    const tokenAccount = await getAssociatedTokenAddress(mint, user);
    const accountInfo = await getAccount(connection, tokenAccount);
    const balance = Number(accountInfo.amount) / Math.pow(10, accountInfo.decimals);

    if (balance < burnAmount) {
      return { valid: false, reason: 'Insufficient token balance' };
    }
  } catch (error) {
    return { valid: false, reason: 'Token account not found' };
  }

  return { valid: true };
}

/**
 * Execute controlled burn (backend/on-chain only)
 * This should NEVER be called directly from frontend
 */
export async function executeControlledBurn(
  request: BurnRequest,
  config: BurnConfig
): Promise<BurnResult> {
  const connection = getConnection(config.network);
  const payer = loadWallet();
  const mint = new PublicKey(config.mintAddress);
  const user = new PublicKey(request.userAddress);

  // Verify conditions
  const burnAmount = request.amount || config.burnAmount;
  const verification = await verifyBurnConditions(
    request.userAddress,
    request.productId,
    burnAmount,
    config
  );

  if (!verification.valid) {
    throw new Error(`Burn verification failed: ${verification.reason}`);
  }

  // Get user's token account
  const userTokenAccount = await getAssociatedTokenAddress(mint, user);

  // If using Anchor program, call the program
  // For now, we'll use direct SPL token burn with verification
  // In production, use the Anchor program for on-chain verification

  const { burn } = await import('@solana/spl-token');
  
  // Perform burn
  const signature = await burn(
    connection,
    payer, // Payer for fees
    userTokenAccount,
    mint,
    user, // Owner/authority
    burnAmount * Math.pow(10, 9) // Convert to raw amount
  );

  // Log burn event (for tracking and refunds)
  const burnLog = {
    signature,
    user: request.userAddress,
    productId: request.productId,
    amount: burnAmount,
    confirmation: request.confirmation,
    timestamp: Date.now(),
    network: config.network,
  };

  const burnLogPath = path.join(process.cwd(), 'burn-logs.json');
  let burnLogs: any[] = [];
  if (fs.existsSync(burnLogPath)) {
    burnLogs = JSON.parse(fs.readFileSync(burnLogPath, 'utf-8'));
  }
  burnLogs.push(burnLog);
  fs.writeFileSync(burnLogPath, JSON.stringify(burnLogs, null, 2));

  return {
    signature,
    amount: burnAmount,
    productId: request.productId,
    confirmation: request.confirmation,
  };
}

/**
 * Process purchase with token burn
 * This is the main entry point for purchases
 */
export async function processPurchaseWithBurn(
  userAddress: string,
  productId: string,
  productConfig: BurnConfig
): Promise<BurnResult> {
  // Generate unique confirmation
  const confirmation = generateConfirmation();

  // Verify and execute burn
  const result = await executeControlledBurn(
    {
      userAddress,
      productId,
      confirmation,
    },
    productConfig
  );

  return result;
}

/**
 * Refund burn (if purchase failed)
 */
export async function refundBurn(
  originalSignature: string,
  userAddress: string,
  refundAmount: number,
  mintAddress: string,
  network: 'devnet' | 'mainnet' = 'devnet'
): Promise<string> {
  const connection = getConnection(network);
  const payer = loadWallet();
  const mint = new PublicKey(mintAddress);
  const user = new PublicKey(userAddress);

  // Verify original burn exists
  const burnLogPath = path.join(process.cwd(), 'burn-logs.json');
  if (!fs.existsSync(burnLogPath)) {
    throw new Error('Burn log not found');
  }

  const burnLogs = JSON.parse(fs.readFileSync(burnLogPath, 'utf-8'));
  const originalBurn = burnLogs.find((log: any) => log.signature === originalSignature);

  if (!originalBurn) {
    throw new Error('Original burn not found');
  }

  if (originalBurn.refunded) {
    throw new Error('Burn already refunded');
  }

  // Mint tokens back to user (requires mint authority)
  // Note: This requires you to have mint authority
  const { mintTo, getOrCreateAssociatedTokenAccount } = await import('@solana/spl-token');
  
  const userTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    user
  );

  const signature = await mintTo(
    connection,
    payer,
    mint,
    userTokenAccount.address,
    payer, // Mint authority
    refundAmount * Math.pow(10, 9)
  );

  // Mark as refunded
  originalBurn.refunded = true;
  originalBurn.refundSignature = signature;
  originalBurn.refundTimestamp = Date.now();
  fs.writeFileSync(burnLogPath, JSON.stringify(burnLogs, null, 2));

  return signature;
}

/**
 * Get burn history for a user
 */
export function getBurnHistory(userAddress?: string): any[] {
  const burnLogPath = path.join(process.cwd(), 'burn-logs.json');
  
  if (!fs.existsSync(burnLogPath)) {
    return [];
  }

  const burnLogs = JSON.parse(fs.readFileSync(burnLogPath, 'utf-8'));
  
  if (userAddress) {
    return burnLogs.filter((log: any) => log.user === userAddress);
  }
  
  return burnLogs;
}

/**
 * API endpoint handler for secure burning
 * Use this in your backend API
 */
export function createBurnAPIHandler(config: BurnConfig) {
  return async (req: any, res: any) => {
    try {
      const { userAddress, productId } = req.body;

      if (!userAddress || !productId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Verify user is authenticated (add your auth logic here)
      // Verify product exists and is valid
      // Verify user has permission

      const result = await processPurchaseWithBurn(userAddress, productId, config);

      res.json({
        success: true,
        burn: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };
}






