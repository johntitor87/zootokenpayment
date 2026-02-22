# Fulcanellie WooCommerce – ZOO Solana Payments

Solana token payments and staking gating for WooCommerce. This project includes:

- **WordPress plugin**: `wordpress-plugin/zoo-solana-woocommerce/` – ZOO token payment gateway and wallet connect
- **Staking API**: Node server that WooCommerce calls to verify ZOO payments and staking tiers
- **Solana scripts**: Token creation, metadata, burning, staking, token gating (CLI and program integrations)

## Structure

- `wordpress-plugin/zoo-solana-woocommerce/` – Install this in WordPress as a plugin
- `src/api/` – Staking API (run with `npm run staking-api`)
- `src/solana/` – Token and staking scripts (create token, burn, hard stake, etc.)
- `staking-program/`, `burn-program/` – Anchor programs (if you build from source)
- `staking-config.json` – Staking program IDs, mint, tiers (see `product-configs.example.json` for product mapping)

## Setup

1. Install dependencies: `npm install`
2. Add `wallet.json` and `staking-config.json` in project root (see docs)
3. Run Staking API: `npm run staking-api` (default port 3001)
4. Install the WordPress plugin from `wordpress-plugin/zoo-solana-woocommerce/`

## Docs in this repo

- **SOLANA_TOKEN_GUIDE.md** – Token creation and setup
- **HARD_STAKING.md**, **DEPLOY-STAKING-API.md** – Staking and API deployment
- **TOKEN_FEATURES.md**, **HARD_GATING_COMPLETE.md** – Gating and features
- **CONTROLLED_BURNING.md** – Burn program
- **DEPLOY-HOSTGATOR.md**, **UPLOAD-TO-GITHUB.md** – Hosting and deployment

## License

MIT
