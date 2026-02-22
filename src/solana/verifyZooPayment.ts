/**
 * Verify a Solana transaction is a valid ZOO (SPL) transfer to the store.
 * Uses pre/post token balances from transaction meta.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const ZOO_DECIMALS = 9;

export interface VerifyZooPaymentParams {
  signature: string;
  storeWallet: string;
  mintAddress: string;
  amountZoo: number;
  payerWallet?: string;
  network?: 'devnet' | 'mainnet';
}

export interface VerifyZooPaymentResult {
  ok: boolean;
  error?: string;
  signature?: string;
}

function getRpcUrl(network: 'devnet' | 'mainnet'): string {
  return network === 'devnet'
    ? 'https://api.devnet.solana.com'
    : 'https://api.mainnet-beta.solana.com';
}

/**
 * Verify that the given transaction signature is a valid SPL transfer of ZOO
 * to the store's wallet for at least amountZoo (in human units).
 */
export async function verifyZooPayment(params: VerifyZooPaymentParams): Promise<VerifyZooPaymentResult> {
  const { signature, storeWallet, mintAddress, amountZoo, network = 'devnet' } = params;

  const connection = new Connection(getRpcUrl(network), 'confirmed');
  const mint = new PublicKey(mintAddress);
  const store = new PublicKey(storeWallet);

  const amountLamports = Math.floor(amountZoo * Math.pow(10, ZOO_DECIMALS));

  try {
    let tx = null;
    let attempts = 0;
    const maxAttempts = 10;
    while (!tx && attempts < maxAttempts) {
      tx = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      if (!tx) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!tx || !tx.meta) {
      return { ok: false, error: 'Transaction not found or not confirmed after ' + maxAttempts + ' attempts' };
    }
    if (tx.meta.err) {
      return { ok: false, error: 'Transaction failed: ' + JSON.stringify(tx.meta.err) };
    }

    // In Solana RPC, token balance "owner" is the wallet that owns the token account (authority), not the ATA address.
    const storeWalletStr = store.toBase58();
    const post = tx.meta.postTokenBalances || [];
    const pre = tx.meta.preTokenBalances || [];

    function lamportsFromBalance(b: { mint: string; owner: string; uiTokenAmount?: { amount: string; decimals?: number }; tokenAmount?: { amount: string } }): number {
      const amt = b.uiTokenAmount?.amount ?? b.tokenAmount?.amount;
      return amt ? Number(amt) : 0;
    }

    let storePost = 0;
    let storePre = 0;
    for (const b of post) {
      if (b.mint === mintAddress && b.owner === storeWalletStr) {
        storePost = lamportsFromBalance(b);
        break;
      }
    }
    for (const b of pre) {
      if (b.mint === mintAddress && b.owner === storeWalletStr) {
        storePre = lamportsFromBalance(b);
        break;
      }
    }
    // Fallback: match by mint only for store's new ATA (first receive; owner might appear as ATA in some RPCs)
    if (storePost === 0 && storePre === 0) {
      const storeAta = await getAssociatedTokenAddress(mint, store);
      const storeAtaStr = storeAta.toBase58();
      for (const b of post) {
        if (b.mint === mintAddress && (b.owner === storeWalletStr || b.owner === storeAtaStr)) {
          storePost = lamportsFromBalance(b);
          break;
        }
      }
      for (const b of pre) {
        if (b.mint === mintAddress && (b.owner === storeWalletStr || b.owner === storeAtaStr)) {
          storePre = lamportsFromBalance(b);
          break;
        }
      }
    }

    const received = storePost - storePre;
    if (received < amountLamports) {
      console.error('ZOO payment verification failed:', {
        storeWallet,
        mintAddress,
        expected: amountLamports,
        received,
        storePre,
        storePost,
        postBalances: post.map(b => ({ mint: b.mint, owner: b.owner, amount: lamportsFromBalance(b) })),
        preBalances: pre.map(b => ({ mint: b.mint, owner: b.owner, amount: lamportsFromBalance(b) })),
      });
      return {
        ok: false,
        error: `Insufficient amount: received ${received / Math.pow(10, ZOO_DECIMALS)} ZOO, need ${amountZoo}`,
      };
    }

    return { ok: true, signature };
  } catch (e: any) {
    console.error('ZOO payment verification error:', e);
    return {
      ok: false,
      error: e?.message || 'Verification failed',
    };
  }
}
