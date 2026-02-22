# ZOO Token Features Documentation

Your ZOO token now includes comprehensive token management features:

## 🪙 Token Operations

### Minting
Mint additional tokens (requires mint authority):

```bash
npm run token mint <mint-address> <amount> [recipient] [network]
```

**Example:**
```bash
npm run token mint FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 1000
npm run token mint FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 500 <recipient-address>
```

### Burning
Burn (destroy) tokens to reduce supply:

```bash
npm run token burn <mint-address> <amount> [network]
```

**Example:**
```bash
npm run token burn FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 100
```

### Transfers
Transfer tokens to another wallet:

```bash
npm run token transfer <mint-address> <to-address> <amount> [network]
```

**Example:**
```bash
npm run token transfer FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 <address> 100
```

### Balance Check
Check token balance for any address:

```bash
npm run token balance <mint-address> [owner-address] [network]
```

**Example:**
```bash
npm run token balance FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3
npm run token balance FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 <address>
```

## 🔒 Staking

### Stake Tokens
Lock tokens to earn rewards:

```bash
npm run token stake <mint-address> <amount> [network]
```

**Example:**
```bash
npm run token stake FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 5000
```

### Unstake Tokens
Withdraw staked tokens:

```bash
npm run token unstake <mint-address> <amount> [network]
```

**Example:**
```bash
npm run token unstake FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 2000
```

### Staking Info
Check your staking status and rewards:

```bash
npm run token staking-info [user-address]
```

**Example:**
```bash
npm run token staking-info
```

**Note:** Current staking implementation uses local storage. For production, implement an on-chain staking program.

## 🚪 Token Gating

### Check Token Gate
Verify if a user meets token requirements:

```bash
npm run token check-gate <mint-address> <user-address> <required-amount> [network]
```

**Example:**
```bash
npm run token check-gate FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3 <address> 100
```

### Programmatic Token Gating

```typescript
import { checkTokenGate, createTokenGate } from './src/solana/tokenGating';

// Check single gate
const hasAccess = await checkTokenGate(userAddress, {
  mintAddress: 'FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3',
  requiredAmount: 100,
  network: 'devnet',
});

// Create reusable gate middleware
const gate = createTokenGate({
  mintAddress: 'FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3',
  requiredAmount: 100,
});

const { hasAccess, balance } = await gate(userAddress);
```

## 🛒 WooCommerce Integration

### Setup

```typescript
import { WooCommerceAPI, createWooCommerceWebhook } from './src/solana/woocommerce';

const wcConfig = {
  siteUrl: 'https://your-store.com',
  consumerKey: 'your-key',
  consumerSecret: 'your-secret',
  tokenMint: 'FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3',
  network: 'devnet',
};

const wcAPI = new WooCommerceAPI(wcConfig);
```

### Features

1. **Token Payments**: Accept ZOO tokens as payment
2. **Token Discounts**: Apply discounts based on token balance
3. **Product Gating**: Restrict products to token holders
4. **Webhook Integration**: Handle payment verification

### Example: Token-Gated Product

```typescript
import { checkProductAccess } from './src/solana/woocommerce';

// Check if user can access product
const canAccess = await checkProductAccess(
  userAddress,
  'product-123',
  100, // Required tokens
  'FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3',
  'devnet'
);
```

### Example: Apply Token Discount

```typescript
import { applyTokenDiscount } from './src/solana/woocommerce';

const userBalance = 1000; // User's token balance
const cartTotal = 100; // Cart total in USD
const discountedTotal = applyTokenDiscount(cartTotal, userBalance, 0.1);
// 10% discount per token, max 50% off
```

## 📋 Your Token Details

- **Mint Address**: `FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3`
- **Symbol**: ZOO
- **Decimals**: 9
- **Network**: Devnet
- **Explorer**: https://explorer.solana.com/address/FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3?cluster=devnet

## 🔧 Programmatic Usage

All features can be used programmatically:

```typescript
// Token Operations
import { mintTokens, burnTokens, transferTokens } from './src/solana/tokenOperations';
import { stakeTokens, unstakeTokens } from './src/solana/staking';
import { checkTokenGate } from './src/solana/tokenGating';
import { WooCommerceAPI } from './src/solana/woocommerce';

// Use in your application
```

## ⚠️ Important Notes

1. **Mint Authority**: You need mint authority to mint new tokens. If you revoked it, you cannot mint more.
2. **Staking**: Current implementation uses local storage. For production, deploy an on-chain staking program.
3. **WooCommerce**: Requires WooCommerce REST API setup and webhook configuration.
4. **Network**: All examples use devnet. Change to 'mainnet' for production.

## 🚀 Next Steps

1. **Deploy Staking Program**: Create an on-chain staking program for production
2. **WooCommerce Setup**: Configure WooCommerce API keys and webhooks
3. **Frontend Integration**: Build UI for token operations
4. **Analytics**: Track token usage and staking metrics

## 📚 Resources

- [Solana SPL Token Docs](https://spl.solana.com/token)
- [Metaplex Token Metadata](https://docs.metaplex.com/programs/token-metadata/)
- [WooCommerce REST API](https://woocommerce.github.io/woocommerce-rest-api-docs/)






