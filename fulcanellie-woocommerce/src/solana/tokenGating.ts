import {
  Connection,
  PublicKey,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Token Gating Logic - Restrict access based on token ownership
 */

interface GateConfig {
  mintAddress: string;
  requiredAmount: number;
  decimals?: number;
  network?: 'devnet' | 'mainnet';
}

function getConnection(network: 'devnet' | 'mainnet' = 'devnet'): Connection {
  const rpcUrl = network === 'devnet'
    ? 'https://api.devnet.solana.com'
    : 'https://api.mainnet.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

/**
 * Check if user has required tokens (token gate)
 */
export async function checkTokenGate(
  userAddress: string,
  config: GateConfig
): Promise<boolean> {
  const connection = getConnection(config.network || 'devnet');
  const mint = new PublicKey(config.mintAddress);
  const user = new PublicKey(userAddress);
  const requiredAmount = config.requiredAmount * Math.pow(10, config.decimals || 9);

  try {
    const tokenAccount = await getAssociatedTokenAddress(mint, user);
    const accountInfo = await getAccount(connection, tokenAccount);
    
    const hasAccess = Number(accountInfo.amount) >= requiredAmount;
    
    return hasAccess;
  } catch (error) {
    // Token account doesn't exist or has no balance
    return false;
  }
}

/**
 * Get user's token balance for gating
 */
export async function getTokenBalanceForGate(
  userAddress: string,
  mintAddress: string,
  network: 'devnet' | 'mainnet' = 'devnet'
): Promise<number> {
  const connection = getConnection(network);
  const mint = new PublicKey(mintAddress);
  const user = new PublicKey(userAddress);

  try {
    const tokenAccount = await getAssociatedTokenAddress(mint, user);
    const accountInfo = await getAccount(connection, tokenAccount);
    return Number(accountInfo.amount) / Math.pow(10, accountInfo.mint.toString() === mintAddress ? accountInfo.decimals : 9);
  } catch (error) {
    return 0;
  }
}

/**
 * Token gate middleware for API endpoints
 */
export function createTokenGate(config: GateConfig) {
  return async (userAddress: string): Promise<{ hasAccess: boolean; balance: number }> => {
    const balance = await getTokenBalanceForGate(
      userAddress,
      config.mintAddress,
      config.network
    );
    const hasAccess = balance >= config.requiredAmount;

    return { hasAccess, balance };
  };
}

/**
 * Multi-token gate (require multiple tokens)
 */
export async function checkMultiTokenGate(
  userAddress: string,
  gates: GateConfig[],
  network: 'devnet' | 'mainnet' = 'devnet'
): Promise<{ hasAccess: boolean; results: Record<string, boolean> }> {
  const results: Record<string, boolean> = {};

  for (const gate of gates) {
    const hasAccess = await checkTokenGate(userAddress, { ...gate, network });
    results[gate.mintAddress] = hasAccess;
  }

  const hasAccess = Object.values(results).every(result => result === true);

  return { hasAccess, results };
}

