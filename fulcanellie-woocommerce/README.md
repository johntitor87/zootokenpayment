# Fulcanellie Staking API (backend only)

Node backend for ZOO WooCommerce: staking status, payment verification, stake/unstake. **No Rust in this repo** – build the staking program elsewhere and add the IDL here if you use stake/unstake.

## Folder layout

- `package.json` / `package-lock.json`
- `server.ts` – entry (run with `npm start`)
- `routes/` – API route handlers
- `utils/` – config + Solana helpers (`utils/solana/`)

## Run

```bash
npm install
npm start
```

Config: set env vars (`STAKING_PROGRAM_ID`, `MINT_ADDRESS`, `ZOO_STORE_WALLET`, `SOLANA_NETWORK`) or add `staking-config.json` in the project root.

For **stake / request-unstake / complete-unstake** endpoints you need the Anchor IDL: put `zoostaking.json` in `utils/solana/` (from `anchor build` in your staking program repo) or set `STAKING_IDL_PATH`.

## Deploy (e.g. Render)

Build: `npm install`  
Start: `npm start`  
Root directory: this folder.
