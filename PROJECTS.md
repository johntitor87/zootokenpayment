# Fulcanellie – Project Layout

This repo contained two separate products that are now split into dedicated folders:

## 1. **fulcanellie-earthquake-bot** – Twitter earthquake bot

- **What it is**: Bot that monitors USGS earthquakes and NOAA magnetic data, then posts analyses to X (Twitter) with a “mystical alchemist” character (Fulcanellie).
- **Location**: `fulcanellie-earthquake-bot/`
- **Run**: `cd fulcanellie-earthquake-bot && npm install && npm run build && npm start`
- **Config**: Copy `.env.example` to `.env` and set Twitter (and optional NOAA) credentials.

## 2. **fulcanellie-woocommerce** – Solana payments for WooCommerce

- **What it is**: ZOO token payment gateway and staking gating for WooCommerce (WordPress plugin + Node staking API + Solana scripts).
- **Location**: `fulcanellie-woocommerce/`
- **Run Staking API**: `cd fulcanellie-woocommerce && npm install && npm run staking-api`
- **WordPress**: Install the plugin from `fulcanellie-woocommerce/wordpress-plugin/zoo-solana-woocommerce/`.

---

The original mixed content (bot + Solana/WooCommerce in one tree) remains at the repo root for reference. You can:

- Use **fulcanellie-earthquake-bot** and **fulcanellie-woocommerce** as the canonical projects and delete or archive the root-level `src/`, `wordpress-plugin/`, and Solana scripts, or
- Move each folder to its own repo and keep this repo only for one of them.

To run only the bot from the repo root in the old way: `npm start` (still runs the earthquake bot). To run only the Staking API from the repo root: `npm run staking-api`.
