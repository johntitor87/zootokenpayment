# Deploy Staking API on Same Server as WordPress (Option A)

Run the Node.js Staking API on the **same server** that hosts lionsinthezoo.com so WordPress can call `http://localhost:3001` for ZOO payment verification and staking.

---

## How to upload the project to your server

You need to get the `fulcanellie` folder onto the machine that hosts lionsinthezoo.com. How you do it depends on what access your host gives you.

### 1. You have SSH access (VPS, dedicated, or “SSH” in your hosting panel)

**Using Git (if your code is in GitHub/GitLab):**

- On the server, open a terminal (SSH in as your user).
- Go to where you want the project (e.g. your home or a web folder):  
  `cd ~` or `cd /var/www`
- Clone the repo (replace with your repo URL):  
  `git clone https://github.com/yourusername/fulcanellie.git`  
  or  
  `git clone git@github.com:yourusername/fulcanellie.git`
- Then: `cd fulcanellie` and continue with “Install dependencies” below.

**Using rsync from your Mac (no Git needed):**

- On your Mac, in a terminal, from the folder that **contains** `fulcanellie` (e.g. your project folder), run (replace `user` and `your-server.com` with your SSH user and server hostname or IP):

```bash
rsync -avz --exclude 'node_modules' --exclude '.git' fulcanellie/ user@your-server.com:~/fulcanellie/
```

- This copies the project and skips `node_modules` and `.git`. Then SSH into the server and run `cd ~/fulcanellie && npm install`.

**Using SCP from your Mac:**

- From the folder that contains `fulcanellie`:

```bash
scp -r fulcanellie user@your-server.com:~/
```

- Then SSH in and run `cd ~/fulcanellie && npm install`. (Uploading `node_modules` is slow, so prefer rsync with `--exclude 'node_modules'` or run `npm install` on the server.)

### 2. You only have FTP/SFTP (e.g. shared hosting)

- Use an FTP/SFTP client:
  - **FileZilla** (free): https://filezilla-project.org  
  - **Cyberduck** (free): https://cyberduck.io  
- Get from your host: **hostname** (e.g. `ftp.lionsinthezoo.com` or your server IP), **username**, **password**, and **port** (often 21 for FTP, 22 for SFTP).
- Connect, then upload the **entire** `fulcanellie` folder (with `package.json`, `staking-config.json`, `src/`, etc.) into a directory on the server (e.g. `fulcanellie` in your home or above `public_html`).  
  You can exclude `node_modules` to save time and run `npm install` on the server if you have SSH; if you have **no** SSH, you may need to upload a zip and unzip on the server (if your host allows), or use a “Node.js app” feature if your host has one.
- **Important:** Many shared hosts do **not** let you run a long‑running Node process or use SSH. If that’s the case, you’ll need a host that supports Node (e.g. a VPS or “Node.js” in the hosting features).

### 3. You use cPanel

- Open **File Manager** (or **FTP**).
- Go to a folder outside the public web root if possible (e.g. `home/youruser/fulcanellie`), so the API isn’t exposed as a website.
- Upload a **zip** of the `fulcanellie` folder (without `node_modules`), then use **Extract** in File Manager.
- If cPanel has **Setup Node.js App** (or “Application Manager” → Node.js), use that to point the app to `fulcanellie`, set the start command to `npm run staking-api` (or the path to your start script), and start the app. Otherwise you need SSH to run `npm install` and `npm run staking-api` or PM2.

### 4. Managed WordPress (WP Engine, Kinsta, etc.)

- These usually **don’t** allow installing and running your own Node app on the same server. You’d use **Option B** instead: run the API on a different server (e.g. a small VPS or a “Node” hosting) and set **Staking API URL** in WordPress to that server’s URL.

---

## 1. What to put on the server

On the server that hosts your WordPress site, you need:

- **Node.js** (v18 or v20 recommended)
- This project (or at least the API + config + dependencies)

### Option 1a: Copy the whole project

Upload your project (e.g. via Git, SFTP, or rsync) to a directory on the server, for example:

```text
/var/www/fulcanellie/   (or /home/youruser/fulcanellie/)
```

Ensure these exist on the server:

- `package.json`
- `staking-config.json` (with your `mintAddress`, `zooStoreWallet`, `network`, etc.)
- `src/api/staking-api.ts`
- `src/solana/verifyZooPayment.ts`
- `src/solana/woocommerceHardGate.ts`
- Any other files those modules import (run from project root so paths resolve)

### Option 1b: Minimal deploy (API only)

If you prefer a minimal folder:

1. Create a directory, e.g. `staking-api`.
2. Copy in:
   - `package.json` (or a minimal one with only the staking API dependencies)
   - `staking-config.json`
   - `src/` (entire `src` tree so imports work)
   - `tsconfig.json` if you use it
3. Run `npm install` in that directory.

## 2. Install dependencies

On the server, in the project root (or minimal deploy folder):

```bash
cd /path/to/fulcanellie   # or your staking-api folder
npm install
```

## 3. Run the API

### One-off (foreground)

```bash
npm run staking-api
```

Or:

```bash
npx ts-node --transpile-only src/api/staking-api.ts
```

You should see: `Staking API server running on port 3001`.

Leave this running while testing. In WooCommerce keep **Staking API URL** as `http://localhost:3001`.

### Keep it running (recommended): PM2

So the API restarts after reboot and stays up:

```bash
# Install PM2 once (globally)
npm install -g pm2

# From project root
cd /path/to/fulcanellie
pm2 start src/api/staking-api.ts --name staking-api --interpreter ./node_modules/.bin/ts-node --interpreter-args "--transpile-only"

# Or use the npm script
pm2 start npm --name staking-api -- run staking-api

# Save process list so it restarts on reboot
pm2 save
pm2 startup
```

Check status:

```bash
pm2 status
pm2 logs staking-api
```

## 4. WordPress / WooCommerce

- In **WordPress → Settings → ZOO Staking**, set **Staking API URL** to:
  - `http://localhost:3001`
- No trailing slash. Save.

The server that serves lionsinthezoo.com will now call the API on the same machine.

## 5. Firewall

Port 3001 does **not** need to be open to the internet. Only WordPress (on the same server) needs to reach `localhost:3001`. Do not expose 3001 in the firewall unless you have another use for it.

## 6. Check staking-config.json

On the server, ensure `staking-config.json` in the project root has the correct values, for example:

```json
{
  "programId": "Zoostaking1111111111111111111111111111111",
  "mintAddress": "FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3",
  "network": "devnet",
  "zooStoreWallet": "6XPtpWPgFfoxRcLCwxTKXawrvzeYjviw4EYpSSLW42gc"
}
```

Same file the plugin and verification logic expect.

## 7. Quick test from the server

From the same server (SSH):

```bash
curl -s "http://localhost:3001/api/staking/status?user_address=6XPtpWPgFfoxRcLCwxTKXawrvzeYjviw4EYpSSLW42gc"
```

You should get JSON with staking status, not a connection error.

---

Summary: deploy the project (or minimal API) to the WordPress server → `npm install` → run with `npm run staking-api` or PM2 → set WooCommerce Staking API URL to `http://localhost:3001`.
