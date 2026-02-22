# How to Upload Fulcanellie to GitHub

## 1. Create a new repository on GitHub

1. Go to **https://github.com** and log in.
2. Click the **+** (top right) → **New repository**.
3. **Repository name:** `fulcanellie` (or any name you like).
4. **Description:** optional (e.g. "ZOO token staking & WooCommerce API").
5. Choose **Public**.
6. **Do not** check "Add a README" or "Add .gitignore" (you already have these).
7. Click **Create repository**.

GitHub will show a page with setup commands. You can ignore that and use the steps below.

---

## 2. Open Terminal on your Mac

- Open **Terminal** (Applications → Utilities → Terminal, or search "Terminal").
- Go to your project folder:
  ```bash
  cd /Users/hendrix/eliza-starter/fulcanellie
  ```

---

## 3. Turn this folder into a Git repo and push to GitHub

Run these commands **one at a time** (replace `YOUR_GITHUB_USERNAME` with your actual GitHub username):

```bash
# Make this folder its own Git repo (if it isn’t already)
git init

# Track all files (respects .gitignore, so .env and node_modules stay local)
git add .

# First commit
git commit -m "Initial commit: fulcanellie staking API and ZOO WooCommerce"

# Tell Git where your GitHub repo is (use your username and repo name)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/fulcanellie.git

# Use main as the branch name
git branch -M main

# Upload to GitHub
git push -u origin main
```

When you run `git push`, GitHub may ask you to log in:

- **Username:** your GitHub username.
- **Password:** use a **Personal Access Token**, not your GitHub password.
  - GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**. Give it a name, check **repo**, generate, then copy the token and paste it when the terminal asks for a password.

---

## 4. If you already have Git set up here

If you see something like "reinitialized existing Git repository" when you run `git init`, that’s fine. Then run:

```bash
git add .
git commit -m "Initial commit: fulcanellie staking API and ZOO WooCommerce"
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/fulcanellie.git
git branch -M main
git push -u origin main
```

If `git remote add origin` says "remote origin already exists", use:

```bash
git remote set-url origin https://github.com/YOUR_GITHUB_USERNAME/fulcanellie.git
git push -u origin main
```

---

## 5. After the first push

- Your code will be at: **https://github.com/YOUR_GITHUB_USERNAME/fulcanellie**
- You can use this repo with **Railway** or **Render** (connect the GitHub repo and set build to `npm install`, start to `npm run staking-api`).
- To push future changes:
  ```bash
  cd /Users/hendrix/eliza-starter/fulcanellie
  git add .
  git commit -m "Describe what you changed"
  git push
  ```

---

## Don’t push secrets

Your `.gitignore` already excludes:

- `.env` (secrets)
- `node_modules/`
- `*-keypair.json`, `token-*.json`

So they won’t be uploaded. **Don’t** remove those from `.gitignore`.
