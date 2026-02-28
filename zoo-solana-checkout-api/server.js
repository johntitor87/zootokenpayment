// Log first so Render shows output before any require (helps debug "exited early")
console.log("Starting ZOO Solana Checkout API...");
console.log("Node version:", process.version);
console.log("CWD:", process.cwd());

require('dotenv').config();
console.log("PORT (env):", process.env.PORT);

const express = require('express');
const cors = require('cors');
const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');

const TOKEN_MINT = process.env.ZOO_MINT_ADDRESS || 'FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3'; // ZOO: 9 decimals
const RPC_URL = process.env.RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => res.send('ZOO Solana Checkout API is running'));

// Verify ZOO token balance: wallet and amount (amount in ZOO)
app.post('/verify', async (req, res) => {
  const { wallet, amount } = req.body;
  if (!wallet || amount == null) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }

  try {
    const connection = new Connection(RPC_URL);
    const walletPubKey = new PublicKey(wallet);
    const tokenMint = new PublicKey(TOKEN_MINT);

    const tokenAddress = await getAssociatedTokenAddress(tokenMint, walletPubKey);
    const tokenAccount = await connection.getTokenAccountBalance(tokenAddress);

    const balance = parseInt(tokenAccount.value.amount, 10);
    const amountLamports = Math.floor(Number(amount) * 1e9);

    if (balance >= amountLamports) {
      const overpaid = (balance - amountLamports) / 1e9;
      return res.json({ success: true, overpaid });
    } else {
      return res.json({ success: false, error: 'Insufficient ZOO tokens' });
    }
  } catch (err) {
    if (err.message && err.message.includes('could not find account')) {
      return res.json({ success: false, error: 'No ZOO token account' });
    }
    console.error(err);
    return res.json({ success: false, error: err.message });
  }
});

// Verify payment: transaction signature + wallet + amount (called after frontend sends ZOO transfer)
const SHOP_WALLET = process.env.SHOP_WALLET || process.env.ZOO_SHOP_WALLET || '';
app.post('/pay', async (req, res) => {
  const { wallet, amount, txSignature } = req.body;
  if (!wallet || amount == null || !txSignature) {
    return res.status(400).json({ success: false, error: 'Missing parameters (wallet, amount, txSignature)' });
  }

  if (!SHOP_WALLET) {
    return res.status(500).json({ success: false, error: 'Shop wallet not configured' });
  }

  try {
    const connection = new Connection(RPC_URL);
    const tx = await connection.getTransaction(txSignature, { maxSupportedTransactionVersion: 0 });
    if (!tx) {
      return res.json({ success: false, error: 'Transaction not found' });
    }
    if (tx.meta && tx.meta.err) {
      return res.json({ success: false, error: 'Transaction failed on-chain' });
    }

    const amountLamports = Math.floor(Number(amount) * 1e9);
    const tokenMint = new PublicKey(TOKEN_MINT);
    const walletPubKey = new PublicKey(wallet);
    const shopPubKey = new PublicKey(SHOP_WALLET);
    const shopTokenAddress = await getAssociatedTokenAddress(tokenMint, shopPubKey);

    // Optional: parse transaction to verify transfer to shop (postBalance - preBalance on shop ATA)
    const preIdx = tx.meta.preTokenBalances?.findIndex(
      (b) => b.mint === TOKEN_MINT && b.owner === shopTokenAddress.toBase58()
    );
    const postIdx = tx.meta.postTokenBalances?.findIndex(
      (b) => b.mint === TOKEN_MINT && b.owner === shopTokenAddress.toBase58()
    );
    if (postIdx >= 0 && tx.meta.postTokenBalances && tx.meta.preTokenBalances) {
      const postAmount = parseInt(tx.meta.postTokenBalances[postIdx].uiTokenAmount.amount, 10);
      const preBalance = preIdx >= 0 ? tx.meta.preTokenBalances[preIdx] : null;
      const preAmount = preBalance ? parseInt(preBalance.uiTokenAmount.amount, 10) : 0;
      const received = postAmount - preAmount;
      if (received < amountLamports) {
        return res.json({ success: false, error: 'Transfer amount mismatch' });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, error: err.message || 'Server error' });
  }
});

// Verify payment: order_id, publicKey, txSignature (WooCommerce JS payload)
// Same as /pay but accepts the frontend payload shape and returns { verified: true }
app.post('/verify-payment', async (req, res) => {
  const { order_id, publicKey, txSignature } = req.body;

  if (!order_id || !publicKey || !txSignature) {
    return res.status(400).json({ verified: false, error: 'Missing parameters' });
  }

  if (!SHOP_WALLET) {
    return res.status(500).json({ verified: false, error: 'Shop wallet not configured' });
  }

  try {
    const connection = new Connection(RPC_URL);
    const tx = await connection.getTransaction(txSignature, { maxSupportedTransactionVersion: 0 });

    if (!tx) {
      return res.status(400).json({ verified: false, error: 'Transaction not found' });
    }

    if (tx.meta && tx.meta.err) {
      return res.status(400).json({ verified: false, error: 'Transaction failed on-chain' });
    }

    const tokenMint = new PublicKey(TOKEN_MINT);
    const shopPubKey = new PublicKey(SHOP_WALLET);
    const shopTokenAddress = await getAssociatedTokenAddress(tokenMint, shopPubKey);

    const preIdx = tx.meta.preTokenBalances?.findIndex(
      (b) => b.mint === TOKEN_MINT && b.owner === shopTokenAddress.toBase58()
    );
    const postIdx = tx.meta.postTokenBalances?.findIndex(
      (b) => b.mint === TOKEN_MINT && b.owner === shopTokenAddress.toBase58()
    );

    if (postIdx < 0 || !tx.meta.postTokenBalances) {
      return res.status(400).json({ verified: false, error: 'ZOO token transfer to shop not found' });
    }

    const postAmount = parseInt(tx.meta.postTokenBalances[postIdx].uiTokenAmount.amount, 10);
    const preAmount = preIdx >= 0 && tx.meta.preTokenBalances
      ? parseInt(tx.meta.preTokenBalances[preIdx].uiTokenAmount.amount, 10)
      : 0;
    const received = postAmount - preAmount;

    if (received <= 0) {
      return res.status(400).json({ verified: false, error: 'ZOO token transfer not found or incorrect' });
    }

    return res.json({ verified: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ verified: false, error: 'Server error' });
  }
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
