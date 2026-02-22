import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  transfer,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Staking Logic - Simple staking system
 * This creates a staking vault and tracks staked amounts
 */

interface StakingConfig {
  mintAddress: string;
  rewardMintAddress?: string; // Optional reward token
  stakingVault?: string; // PDA for staking vault
  network?: 'devnet' | 'mainnet';
}

interface StakeInfo {
  amount: number;
  stakedAt: number;
  rewardsEarned: number;
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
 * Stake tokens - Lock tokens in staking vault
 */
export async function stakeTokens(
  mintAddress: string,
  amount: number,
  decimals: number = 9,
  config?: StakingConfig
) {
  const connection = getConnection(config?.network || 'devnet');
  const payer = loadWallet();
  const mint = new PublicKey(mintAddress);

  console.log(`\n🔒 Staking ${amount} tokens...`);

  // Create or get staking vault (using a simple approach - in production, use a PDA)
  // For now, we'll use a dedicated staking wallet or create a token account
  const stakingVault = config?.stakingVault
    ? new PublicKey(config.stakingVault)
    : payer.publicKey; // In production, use a proper staking program PDA

  // Get user's token account
  const userTokenAccount = await getAssociatedTokenAddress(mint, payer.publicKey);

  // Get or create staking vault token account
  const vaultTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    stakingVault
  );

  // Transfer tokens to staking vault
  const signature = await transfer(
    connection,
    payer,
    userTokenAccount,
    vaultTokenAccount.address,
    payer,
    amount * Math.pow(10, decimals)
  );

  // Save staking info locally (in production, this would be on-chain)
  const stakeInfo: StakeInfo = {
    amount,
    stakedAt: Date.now(),
    rewardsEarned: 0,
  };

  const stakingDataPath = path.join(process.cwd(), 'staking-data.json');
  let stakingData: Record<string, StakeInfo> = {};
  
  if (fs.existsSync(stakingDataPath)) {
    stakingData = JSON.parse(fs.readFileSync(stakingDataPath, 'utf-8'));
  }

  stakingData[payer.publicKey.toBase58()] = stakeInfo;
  fs.writeFileSync(stakingDataPath, JSON.stringify(stakingData, null, 2));

  console.log(`✅ Staked ${amount} tokens`);
  console.log(`   Staking Vault: ${vaultTokenAccount.address.toBase58()}`);
  console.log(`   Signature: ${signature}`);

  return {
    signature,
    vaultAccount: vaultTokenAccount.address.toBase58(),
    stakeInfo,
  };
}

/**
 * Unstake tokens - Withdraw tokens from staking vault
 */
export async function unstakeTokens(
  mintAddress: string,
  amount: number,
  decimals: number = 9,
  config?: StakingConfig
) {
  const connection = getConnection(config?.network || 'devnet');
  const payer = loadWallet();
  const mint = new PublicKey(mintAddress);

  console.log(`\n🔓 Unstaking ${amount} tokens...`);

  const stakingVault = config?.stakingVault
    ? new PublicKey(config.stakingVault)
    : payer.publicKey;

  // Get vault token account
  const vaultTokenAccount = await getAssociatedTokenAddress(mint, stakingVault);

  // Get user's token account
  const userTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  // Transfer tokens back from vault
  const signature = await transfer(
    connection,
    payer,
    vaultTokenAccount,
    userTokenAccount.address,
    stakingVault, // vault is the owner
    amount * Math.pow(10, decimals)
  );

  // Update staking data
  const stakingDataPath = path.join(process.cwd(), 'staking-data.json');
  if (fs.existsSync(stakingDataPath)) {
    const stakingData = JSON.parse(fs.readFileSync(stakingDataPath, 'utf-8'));
    const userKey = payer.publicKey.toBase58();
    if (stakingData[userKey]) {
      stakingData[userKey].amount -= amount;
      if (stakingData[userKey].amount <= 0) {
        delete stakingData[userKey];
      }
      fs.writeFileSync(stakingDataPath, JSON.stringify(stakingData, null, 2));
    }
  }

  console.log(`✅ Unstaked ${amount} tokens`);
  console.log(`   Signature: ${signature}`);

  return { signature };
}

/**
 * Calculate staking rewards (simple time-based calculation)
 */
export function calculateRewards(
  stakedAmount: number,
  stakedAt: number,
  apy: number = 10 // 10% APY default
): number {
  const now = Date.now();
  const daysStaked = (now - stakedAt) / (1000 * 60 * 60 * 24);
  const yearlyReward = stakedAmount * (apy / 100);
  const reward = (yearlyReward * daysStaked) / 365;
  return reward;
}

/**
 * Get staking info for a user
 */
export function getStakingInfo(userAddress?: string): StakeInfo | null {
  const stakingDataPath = path.join(process.cwd(), 'staking-data.json');
  
  if (!fs.existsSync(stakingDataPath)) {
    return null;
  }

  const stakingData = JSON.parse(fs.readFileSync(stakingDataPath, 'utf-8'));
  const wallet = loadWallet();
  const userKey = userAddress || wallet.publicKey.toBase58();

  return stakingData[userKey] || null;
}






