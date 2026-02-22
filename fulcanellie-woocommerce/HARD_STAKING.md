# Hard Gating Staking System

## 🔒 Overview

Secure, on-chain staking system using **PDA (Program-Derived Address)** vault. Only the program can move funds - no private keys, maximum security.

## 🏗️ Architecture

### 1. Vault (PDA)
- **Program-derived address** - no private key
- Holds all locked tokens
- Only the program can move funds
- Derived from: `["vault", mint_address]`

### 2. Stake Account (Per User)
- PDA per user: `["stake", vault_address, user_address]`
- Stores:
  - Wallet address
  - Amount staked
  - Timestamp
  - Status (Active / Unstaked)

### 3. Three Instructions

#### `stake(amount)`
- Transfers tokens from user to vault
- Creates/updates stake account
- Emits stake event

#### `unstake()`
- Transfers tokens from vault back to user
- Updates stake account status
- Emits unstake event

#### `get_stake_info()` (Read-only)
- Returns stake information
- No transaction needed
- Used by WooCommerce for gating

## 🚀 Quick Start

### 1. Deploy Program

```bash
cd staking-program
anchor build
anchor deploy --provider.cluster devnet
```

Update `programId` in `staking-config.json` with your deployed program ID.

### 2. Initialize Vault (One-time)

```bash
npm run hard-stake init
```

This creates the PDA vault that will hold all staked tokens.

### 3. Stake Tokens

```bash
npm run hard-stake stake 1000
```

Locks 1000 ZOO tokens in the vault.

### 4. Check Stake Info

```bash
npm run hard-stake info <user-address>
```

### 5. Unstake Tokens

```bash
npm run hard-stake unstake
```

Withdraws all staked tokens from vault.

## 🛒 WooCommerce Integration

### Check Product Access

```typescript
import { checkProductStakeAccess } from './src/solana/woocommerceStaking';

const access = await checkProductStakeAccess(
  userAddress,
  100, // Required stake amount
  {
    programId: 'Zoostaking1111111111111111111111111111111',
    mintAddress: 'FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3',
    network: 'devnet',
  }
);

if (access.hasAccess) {
  // Grant product access
}
```

### Webhook Handler

```typescript
import { createStakingWebhookHandler } from './src/solana/woocommerceStaking';

const handler = createStakingWebhookHandler({
  programId: 'Zoostaking1111111111111111111111111111111',
  mintAddress: 'FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3',
  network: 'devnet',
});

// Use in Express/Fastify
app.post('/api/check-stake', handler);
```

### Staking-Based Discounts

```typescript
import { calculateStakingDiscount, getUserStakingStatus } from './src/solana/woocommerceStaking';

const status = await getUserStakingStatus(userAddress, config);
const discountedTotal = calculateStakingDiscount(
  cartTotal,
  status.stakedAmount,
  0.01 // 1% per staked token
);
```

## 📋 CLI Commands

### Initialize Vault
```bash
npm run hard-stake init [program-id] [mint] [network]
```

### Stake Tokens
```bash
npm run hard-stake stake <amount> [user] [network]
```

### Unstake Tokens
```bash
npm run hard-stake unstake [user] [network]
```

### Get Stake Info
```bash
npm run hard-stake info <user-address> [network]
```

### Check Gate
```bash
npm run hard-stake check-gate <user-address> <required-amount> [network]
```

## 🔐 Security Features

✅ **PDA Vault** - No private key, only program can move funds  
✅ **On-Chain Verification** - All checks happen on Solana blockchain  
✅ **Per-User Accounts** - Each user has their own stake account  
✅ **Immutable Logic** - Program code cannot be changed after deployment  
✅ **Event Emission** - All stakes/unstakes emit events for tracking  

## 📊 How It Works

### Staking Flow
```
1. User calls stake(amount)
2. Program transfers tokens: User → Vault (PDA)
3. Program creates/updates StakeAccount PDA
4. Tokens are locked - only program can move them
```

### Unstaking Flow
```
1. User calls unstake()
2. Program verifies stake account exists and is active
3. Program transfers tokens: Vault (PDA) → User
4. Program updates StakeAccount status to Unstaked
```

### WooCommerce Check
```
1. WooCommerce calls get_stake_info(user)
2. Program reads StakeAccount PDA (read-only)
3. Returns: amount, status, timestamp
4. WooCommerce grants/denies access based on amount
```

## 🎯 Use Cases

### Product Gating
- User must stake X tokens to access product
- Check stake before allowing purchase
- Unstake anytime (tokens returned)

### Tiered Access
- Stake 100 tokens → Basic access
- Stake 500 tokens → Premium access
- Stake 1000 tokens → VIP access

### Discounts
- More staked = bigger discount
- Dynamic pricing based on stake amount

## ⚙️ Configuration

Create `staking-config.json`:

```json
{
  "programId": "Zoostaking1111111111111111111111111111111",
  "mintAddress": "FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3",
  "network": "devnet"
}
```

## 📚 Program Structure

```
staking-program/
├── Anchor.toml
├── Cargo.toml
└── programs/
    └── zoostaking/
        └── src/
            └── lib.rs  # Main program
```

## 🔧 Development

### Build Program
```bash
cd staking-program
anchor build
```

### Deploy to Devnet
```bash
anchor deploy --provider.cluster devnet
```

### Deploy to Mainnet
```bash
anchor deploy --provider.cluster mainnet
```

## ⚠️ Important Notes

1. **One-Time Vault Init**: Vault only needs to be initialized once
2. **Program ID**: Update after deployment
3. **Network**: Change to 'mainnet' for production
4. **WooCommerce**: Requires backend API to check stakes
5. **No Rewards Yet**: Basic staking only - rewards can be added later

## 🚀 Next Steps

1. Deploy program to devnet/mainnet
2. Initialize vault
3. Test staking/unstaking
4. Integrate with WooCommerce
5. Add reward system (optional)

## 📖 Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana PDAs](https://docs.solana.com/developing/programming-model/calling-between-programs#program-derived-addresses)
- [SPL Token](https://spl.solana.com/token)






