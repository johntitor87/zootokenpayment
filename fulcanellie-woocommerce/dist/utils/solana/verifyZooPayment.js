"use strict";
/**
 * Verify a Solana transaction is a valid ZOO (SPL) transfer to the store.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyZooPayment = verifyZooPayment;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const ZOO_DECIMALS = 9;
function getRpcUrl(network) {
    return network === 'devnet'
        ? 'https://api.devnet.solana.com'
        : 'https://api.mainnet-beta.solana.com';
}
async function verifyZooPayment(params) {
    const { signature, storeWallet, mintAddress, amountZoo, network = 'devnet' } = params;
    const connection = new web3_js_1.Connection(getRpcUrl(network), 'confirmed');
    const mint = new web3_js_1.PublicKey(mintAddress);
    const store = new web3_js_1.PublicKey(storeWallet);
    const amountLamports = Math.floor(amountZoo * Math.pow(10, ZOO_DECIMALS));
    try {
        let tx = null;
        let attempts = 0;
        const maxAttempts = 10;
        while (!tx && attempts < maxAttempts) {
            tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
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
        const storeWalletStr = store.toBase58();
        const post = tx.meta.postTokenBalances || [];
        const pre = tx.meta.preTokenBalances || [];
        function lamportsFromBalance(b) {
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
        if (storePost === 0 && storePre === 0) {
            const storeAta = await (0, spl_token_1.getAssociatedTokenAddress)(mint, store);
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
            return {
                ok: false,
                error: `Insufficient amount: received ${received / Math.pow(10, ZOO_DECIMALS)} ZOO, need ${amountZoo}`,
            };
        }
        return { ok: true, signature };
    }
    catch (e) {
        const message = e instanceof Error ? e.message : 'Verification failed';
        return { ok: false, error: message };
    }
}
