# Deploy Fulcanellie WooCommerce Staking API on Render.com

This guide walks you through deploying the **Staking API** (the backend WooCommerce calls for ZOO payments and staking) to Render.com. The WordPress plugin stays on your WordPress site; only the API runs on Render.

---

## What gets deployed

- **Staking API** – Node/Express server that:
  - Verifies ZOO token payments (`POST /api/zoo/verify-payment`)
  - Returns staking status, visibility, checkout permission, discounts (`GET /api/staking/*`)
  - Handles stake / request-unstake / complete-unstake (`POST /api/staking/*`)

Your WordPress site will call this API over HTTPS using the URL Render gives you (e.g. `https://fulcanellie-staking-api.onrender.com`).

---

## Prerequisites

- GitHub (or GitLab) repo that contains the `fulcanellie-woocommerce` project.
- Your Solana config values:
  - Staking program ID
  - ZOO token mint address
  - Store wallet (receives ZOO payments)
  - Network: `devnet` or `mainnet-beta`

---

## Step 1: Push the WooCommerce project to a repo Render can access

**Option A – This repo is already the full “fulcanellie” repo**

- Render can use a **root directory** so you don’t need a separate repo.
- In Step 2, when creating the Web Service, set **Root Directory** to:  
  `fulcanellie-woocommerce`

**Option B – Separate repo for the API only**

- Create a new repo and push only the contents of `fulcanellie-woocommerce` (so that repo root has `package.json`, `src/`, `render.yaml`, etc.).
- Connect that repo to Render in Step 2 (no root directory needed).

---

## Step 2: Create a Web Service on Render

1. Go to [dashboard.render.com](https://dashboard.render.com) and sign in.
2. Click **New +** → **Web Service**.
3. Connect your GitHub/GitLab account if needed, then select the repo that contains the Staking API (see Step 1).
4. Configure:
   - **Name**: e.g. `fulcanellie-staking-api`
   - **Region**: Choose one close to your WordPress server or users.
   - **Branch**: e.g. `main`
   - **Root Directory**:  
     - If the repo is the full fulcanellie repo: set to **`fulcanellie-woocommerce`**.  
     - If the repo is only the WooCommerce project: leave blank.
   - **Runtime**: **Node**
   - **Build Command**:  
     `npm install`  
     (Render runs this in the project root, or in the root directory you set.)
   - **Start Command**:  
     `npm run staking-api`
5. Click **Advanced** and add **Environment Variables** (see Step 3).
6. Click **Create Web Service**.

Render will run `npm install` and then `npm run staking-api`. The service will listen on the port Render sets via `PORT` (usually 10000).

---

## Step 3: Set environment variables (required for production)

The API can run using either a `staking-config.json` file or **environment variables**. On Render, use env vars so you don’t commit secrets.

In the Render service → **Environment** tab, add:

| Key | Value | Required |
|-----|--------|----------|
| `STAKING_PROGRAM_ID` | Your staking program ID (e.g. `Zoostaking111...`) | Yes |
| `MINT_ADDRESS` | ZOO token mint address | Yes |
| `ZOO_STORE_WALLET` | Solana wallet that receives ZOO payments | Yes |
| `SOLANA_NETWORK` | `devnet` or `mainnet-beta` | Yes (defaults to devnet if unset) |

Optional:

| Key | Value |
|-----|--------|
| `PORT` | Usually set by Render (10000); only override if needed. |

Example (devnet):

- `STAKING_PROGRAM_ID` = `Zoostaking1111111111111111111111111111111`
- `MINT_ADDRESS` = `FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3`
- `ZOO_STORE_WALLET` = `6XPtpWPgFfoxRcLCwxTKXawrvzeYjviw4EYpSSLW42gc`
- `SOLANA_NETWORK` = `devnet`

Save. Render will redeploy if it’s already running.

---

## Step 4: Wait for deploy and get the URL

1. After **Create Web Service**, Render runs the build and start commands.
2. Wait until the deploy shows **Live** (green).
3. At the top of the service page you’ll see the public URL, e.g.:  
   `https://fulcanellie-staking-api.onrender.com`  
   (No trailing slash.)

If the deploy fails:

- Open **Logs** and look for errors (e.g. missing env vars, `staking-config.json not found` before env support, or Node/ts-node issues).
- Ensure **Root Directory** is correct and that **Build** runs in the folder that contains `package.json` and `src/api/staking-api.ts`.

---

## Step 5: Test the API

In a browser or with `curl`:

```bash
# Replace with your Render URL and a real Solana address
curl "https://fulcanellie-staking-api.onrender.com/api/staking/status?user_address=6XPtpWPgFfoxRcLCwxTKXawrvzeYjviw4EYpSSLW42gc"
```

You should get JSON like:

```json
{ "success": true, "status": { ... } }
```

If you get 404 or 500, check Render logs and env vars.

---

## Step 6: Point WordPress / WooCommerce at the API

1. In **WordPress** go to the ZOO/Staking settings (wherever the plugin stores “Staking API URL”).
2. Set **Staking API URL** to your Render URL, e.g.:  
   `https://fulcanellie-staking-api.onrender.com`  
   (No trailing slash.)
3. Save.

The WordPress site must be able to reach Render over HTTPS (it can, from anywhere). No CORS is required for server-to-server calls from WordPress to Render.

---

## Step 7: (Optional) Use `render.yaml` in the repo

If your Render service is created from the same repo and root directory, you can use the included `render.yaml` as a blueprint:

- It defines a **Web Service** with:
  - `buildCommand: npm install`
  - `startCommand: npm run staking-api`
  - `NODE_VERSION: 20`

You can create the service from the **Blueprint** flow (Dashboard → New + → Blueprint) and point it at this repo; then set **Root Directory** to `fulcanellie-woocommerce` in the generated service, and add the env vars in the Render dashboard as in Step 3.

---

## Summary checklist

- [ ] Repo (full or WooCommerce-only) is connected to Render.
- [ ] Web Service has **Root Directory** = `fulcanellie-woocommerce` if the repo is the full fulcanellie repo.
- [ ] Build: `npm install`; Start: `npm run staking-api`.
- [ ] Env vars set: `STAKING_PROGRAM_ID`, `MINT_ADDRESS`, `ZOO_STORE_WALLET`, `SOLANA_NETWORK`.
- [ ] Deploy is **Live** and the status URL returns JSON.
- [ ] WordPress **Staking API URL** is set to your Render URL (no trailing slash).

After that, the Fulcanellie WooCommerce Staking API is deployed on Render and ready for your store.
