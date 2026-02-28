# ZOO Solana WooCommerce – Credentials checklist

After installing the plugin, set these so ZOO payments work. No placeholders are left for the **ZOO token** itself (mint and mint authority are already set in the plugin and checkout API).

## 1. WordPress (WooCommerce → Settings → Payments → ZOO Token)

| Setting | What to set | Required? |
|--------|----------------------------|------------|
| **Store ZOO wallet address** | Your Solana address that receives ZOO (must have a ZOO token account). | **Yes** for ZOO payments |
| **Staking API URL** | URL of your staking/verification API (e.g. `https://your-staking-api.onrender.com` or `http://localhost:3001`). Used to verify on-chain payments. | **Yes** for “Pay with Wallet” (SPL transfer) flow |
| **ZOO Checkout API URL** | URL of your message-sign checkout API (e.g. `https://zoo-solana-checkout-api-1.onrender.com`). Enables the “Pay with Phantom (sign message)” button. | **Optional** (only if using that button) |
| **ZOO mint address** | Already default: `FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3`. Change only if you use a different mint. | Pre-filled |
| **ZOO per 1 USD** | Your conversion rate (e.g. `10` = 10 ZOO per 1 USD). | Adjust as needed |

## 2. ZOO Solana Checkout API (for Phantom message-sign + backend-executed transfer)

In the **zoo-solana-checkout-api** project, copy `.env.example` to `.env` and set:

| Variable | What to set | Required? |
|----------|-------------|-----------|
| **SERVER_SECRET_KEY** | Replace `[YOUR_SERVER_SECRET_KEY_AS_JSON_ARRAY]` with the 64-byte secret key of the wallet that **receives** ZOO, as a JSON array. Generate: `node -e "const k=require('@solana/web3.js').Keypair.generate(); console.log(JSON.stringify(Array.from(k.secretKey)))"` | **Yes** for building/executing transfers |
| **ZOO_MINT_ADDRESS** | Already set in `.env.example` to `FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3`. | Pre-filled |
| **PORT** | Usually set by the host (e.g. Render). Default `10000` locally. | Optional |
| **RPC_URL** | Solana RPC (mainnet/devnet). Optional; defaults to mainnet. | Optional |

**Important:** The wallet whose secret key you put in `SERVER_SECRET_KEY` should be the same as (or funded from) the **Store ZOO wallet address** in WordPress, so received ZOO goes to the same place.

## 3. Staking API (fulcanellie-woocommerce / Node)

If you run the staking/verification API yourself, set env (or `staking-config.json`):

- **MINT_ADDRESS** = `FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3`
- **ZOO_STORE_WALLET** = same as “Store ZOO wallet address” in WordPress
- **STAKING_PROGRAM_ID** (if using staking)
- **SOLANA_NETWORK** = `devnet` or `mainnet`

---

**Token reference (no placeholders):**

- **ZOO mint:** `FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3`
- **Mint authority:** `6XPtpWPgFfoxRcLCwxTKXawrvzeYjviw4EYpSSLW42gc` (for minting only; not needed for checkout)
