# Running the Staking API with HostGator

Your WordPress site (lionsinthezoo.com) is on HostGator. Here’s how to approach running the Node.js Staking API.

---

## 1. Check your HostGator plan and cPanel

**Shared hosting (Baby / Hatchling / Business):**  
- Usually **does not** support Node.js or long‑running processes.  
- You **cannot** run the Staking API on the same server.  
- Use **Option B** below (run the API on a different host).

**VPS or Dedicated:**  
- May support Node.js via cPanel.  
- Check step 2; if you see “Setup Node.js App”, use **Option A** below.

**In cPanel:**  
- Look for **“Setup Node.js App”** or **“Application Manager”** or **“Node.js Selector”** in the **Software** or **Web Tools** section.  
- If you **don’t** see it → treat as shared and use **Option B**.

---

## Option A: You have “Setup Node.js App” in cPanel (VPS or similar)

1. **Upload and extract the project** (as you did):
   - Upload `fulcanellie-deploy.zip` (without `node_modules`).
   - Extract it in a folder **outside** `public_html`, e.g.:
     - `~/fulcanellie/`  
     So the path might be: `/home/your_cpanel_user/fulcanellie/`

2. **Open Setup Node.js App** in cPanel.

3. **Create Application:**
   - **Node.js version:** 18 or 20.
   - **Application root:** `fulcanellie` (or the folder name you used).
   - **Application URL:** You can use a subdomain (e.g. `api.lionsinthezoo.com`) or leave default; the important part is that the app runs.  
   - **Application startup file:** leave blank or set to `src/api/staking-api.ts` if it asks; some setups use a script instead (see below).

4. **Install dependencies and start:**
   - In the same Node.js App screen there is usually an **“Run NPM Install”** (or similar). Run it.
   - For **start command**, you need to run the Staking API. If the UI has a “Start script” or “Run script”:
     - Use: `npm run staking-api`  
     Or the full command:  
     `node_modules/.bin/ts-node --transpile-only src/api/staking-api.ts`
   - If the app expects a single JS file, we can add a small `server.js` that runs the API (see end of this doc).

5. **Port:**  
   The app will usually get a port from cPanel (e.g. 3000 or 3001).  
   - If WordPress is on the **same server**, you may need to point it to **internal** URL/port (e.g. `http://localhost:PORT`). Some setups expose the app at a URL like `api.lionsinthezoo.com`; in that case you’d use that URL in WordPress (see Option B style).

6. **WordPress:**  
   - In **Settings → ZOO Staking**, set **Staking API URL** to:
     - Same server: `http://localhost:3001` (or the port cPanel assigned), **or**
     - If the app is only reachable by URL: `https://api.lionsinthezoo.com` (or whatever URL cPanel gave).

If anything in Setup Node.js App is unclear, HostGator support can confirm how “Start application” and the port/URL work on your plan.

---

## Option B: No Node.js on HostGator (shared hosting) – run the API elsewhere

Run the Staking API on a **different** host and point WordPress to it. No need to upload the zip to HostGator for the API.

### B1. Free / easy options (good for testing and low traffic)

**Railway (free tier):**  
1. Go to [railway.app](https://railway.app), sign up (e.g. with GitHub).  
2. **New Project** → **Deploy from GitHub** (push your `fulcanellie` repo to GitHub first), or **Empty project** and connect GitHub later.  
3. Add a **service** that runs: `npm install && npm run staking-api`.  
4. Set **root directory** to your repo root (where `package.json` and `staking-config.json` are).  
5. In **Variables**, add any env vars if needed (often none for the staking API).  
6. Deploy; Railway will give a URL like `https://your-app.up.railway.app`.  
7. In WordPress **Settings → ZOO Staking**, set **Staking API URL** to that URL (no trailing slash).

**Render (free tier):**  
1. Go to [render.com](https://render.com), sign up.  
2. **New → Web Service**. Connect your GitHub repo (with `fulcanellie` in it).  
3. **Build command:** `npm install`  
4. **Start command:** `npm run staking-api`  
5. **Root directory:** leave blank if the repo root has `package.json`; otherwise set to the folder that has it.  
6. Deploy; Render gives a URL like `https://your-app.onrender.com`.  
7. In WordPress **Settings → ZOO Staking**, set **Staking API URL** to that URL.

**Important:** On the free tier, the app may sleep after inactivity; the first request after sleep can be slow. For production you might later use a paid tier or a small VPS.

### B2. Small VPS (full control, ~$5–6/month)

- **DigitalOcean**, **Linode**, **Vultr**, etc.: create a small droplet/instance (Ubuntu).  
- SSH in, install Node.js, upload the project (e.g. with `rsync` or Git), run `npm install` and `npm run staking-api`, and run it with PM2 so it stays up.  
- Use the server’s public IP or a domain (e.g. `https://api.lionsinthezoo.com`) and set that as **Staking API URL** in WordPress.  
- Full steps are in `DEPLOY-STAKING-API.md` (treat that server as “the server that runs the API”; WordPress stays on HostGator).

---

## Summary for HostGator

| Your situation | What to do |
|----------------|------------|
| **Shared hosting, no “Setup Node.js App”** | Use **Option B**: run the API on Railway, Render, or a VPS; set that URL in **Settings → ZOO Staking**. |
| **VPS (or cPanel has “Setup Node.js App”)** | Use **Option A**: upload zip, extract, use Setup Node.js App to run `npm run staking-api`, then set **Staking API URL** to the app URL or `http://localhost:PORT`. |

If you tell me whether you see “Setup Node.js App” in cPanel and your plan name (e.g. Baby, VPS), I can narrow this to exact steps (or a small `server.js` for Option A if the UI only accepts a single file).
