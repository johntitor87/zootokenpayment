# Controlled Burning System Documentation

## 🔥 Overview

The ZOO token controlled burning system provides **secure, on-chain verified burning** that cannot be spoofed by frontend manipulation. All burns are verified on-chain or via backend services.

## 🛡️ Security Features

✅ **No Frontend Burning** - All burns must go through backend/on-chain verification  
✅ **On-Chain Verification** - Conditions checked on Solana blockchain  
✅ **Replay Protection** - Unique confirmation IDs prevent duplicate burns  
✅ **Product-Specific** - Different burn amounts per product  
✅ **Refund Logic** - Automatic refund if purchase fails  
✅ **Upgradeable** - Configurable without changing token  

## 📋 Features

### 1. Product-Specific Burning
- Different burn amounts for different products
- Active/inactive status per product
- Configurable without token changes

### 2. Conditional Burning
- Verify purchase before burn
- Verify access rights
- Verify voting eligibility
- Custom conditions

### 3. Confirmation Required
- Unique confirmation ID per burn
- Prevents replay attacks
- Tracks all burn transactions

### 4. Refund Logic
- Automatic refund if purchase fails
- Track original burn signature
- Prevent double refunds

### 5. Reward System
- Burn tokens → Unlock product
- Burn tokens → Receive NFT
- Burn tokens → Get access
- Custom rewards per burn

## 🏗️ Architecture

### On-Chain Program (Anchor)

The Solana program (`burn-program/`) handles:
- Burn configuration per product
- On-chain verification
- CPI (Cross-Program Invocation) for burning
- Event emission for tracking

### Backend Service

The TypeScript service (`src/solana/controlledBurn.ts`) provides:
- Pre-burn verification
- Secure burn execution
- Refund processing
- Burn history tracking

## 🚀 Usage

### Backend API Endpoint

```typescript
import { createBurnAPIHandler } from './src/solana/controlledBurn';

const burnHandler = createBurnAPIHandler({
  productId: 'product-123',
  burnAmount: 10,
  isActive: true,
  mintAddress: 'FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3',
  network: 'devnet',
});

// Use in Express/Fastify/etc.
app.post('/api/burn', burnHandler);
```

### Process Purchase with Burn

```typescript
import { processPurchaseWithBurn } from './src/solana/controlledBurn';

const result = await processPurchaseWithBurn(
  userAddress,
  'product-123',
  {
    productId: 'product-123',
    burnAmount: 10,
    isActive: true,
    mintAddress: 'FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3',
  }
);

// result contains: signature, amount, productId, confirmation
```

### Verify Before Burn

```typescript
import { verifyBurnConditions } from './src/solana/controlledBurn';

const verification = await verifyBurnConditions(
  userAddress,
  'product-123',
  10,
  config
);

if (verification.valid) {
  // Proceed with burn
} else {
  // Handle error: verification.reason
}
```

### Refund Burn

```typescript
import { refundBurn } from './src/solana/controlledBurn';

const refundSignature = await refundBurn(
  originalBurnSignature,
  userAddress,
  10, // refund amount
  mintAddress,
  'devnet'
);
```

## 📝 CLI Commands

### Process Purchase (Backend Only)

```bash
npm run burn purchase <user-address> <product-id> <mint-address> [network]
```

**Example:**
```bash
npm run burn purchase 6XPtpWPgFfoxRcLCwxTKXawrvzeYjviw4EYpSSLW42gc product-123 FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3
```

### Verify Burn Conditions

```bash
npm run burn verify <user-address> <product-id> <amount> <mint-address> [network]
```

**Example:**
```bash
npm run burn verify 6XPtpWPgFfoxRcLCwxTKXawrvzeYjviw4EYpSSLW42gc product-123 10 FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3
```

### Refund Burn

```bash
npm run burn refund <signature> <user-address> <amount> <mint-address> [network]
```

**Example:**
```bash
npm run burn refund <original-signature> 6XPtpWPgFfoxRcLCwxTKXawrvzeYjviw4EYpSSLW42gc 10 FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3
```

### View Burn History

```bash
npm run burn history [user-address]
```

## 🔧 Product Configuration

Create `product-configs.json`:

```json
{
  "product-123": {
    "productId": "product-123",
    "burnAmount": 10,
    "isActive": true,
    "mintAddress": "FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3",
    "network": "devnet"
  },
  "product-456": {
    "productId": "product-456",
    "burnAmount": 50,
    "isActive": true,
    "mintAddress": "FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3",
    "network": "devnet"
  },
  "premium-access": {
    "productId": "premium-access",
    "burnAmount": 100,
    "isActive": true,
    "mintAddress": "FKkgeZxYLxoZ1WciErXKbeNTf5CB296zv51euCR7MZN3",
    "network": "devnet"
  }
}
```

## 🎯 Use Cases

### 1. Purchase with Burn
```
User buys product → Backend verifies → Burns tokens → Product unlocked
```

### 2. Access Control
```
User requests access → Check token balance → Burn required amount → Grant access
```

### 3. Voting
```
User votes → Verify token balance → Burn voting tokens → Record vote
```

### 4. NFT Unlock
```
User burns tokens → Verify burn → Mint NFT to user
```

## 🔐 Security Best Practices

1. **Never expose burn functions to frontend**
   - All burns must go through backend API
   - Frontend only requests burns, never executes

2. **Always verify before burning**
   ```typescript
   const verification = await verifyBurnConditions(...);
   if (!verification.valid) {
     throw new Error(verification.reason);
   }
   ```

3. **Use unique confirmations**
   - Generate unique confirmation ID per request
   - Track used confirmations to prevent replay

4. **Log all burns**
   - Store burn signatures
   - Track for refunds and auditing

5. **Implement refund logic**
   - Check purchase status
   - Refund if purchase fails
   - Prevent double refunds

## 📊 Burn Events

All burns emit events that can be tracked:

```typescript
{
  user: "6XPtpWPgFfoxRcLCwxTKXawrvzeYjviw4EYpSSLW42gc",
  productId: "product-123",
  amount: 10,
  confirmation: "abc123...",
  signature: "5j7s8...",
  timestamp: 1234567890
}
```

## 🚧 Deploying On-Chain Program

To deploy the Anchor program:

```bash
cd burn-program
anchor build
anchor deploy --provider.cluster devnet
```

Then update your backend to use the program ID.

## ⚠️ Important Notes

1. **Mint Authority Required**: Refunds require mint authority to mint tokens back
2. **Backend Only**: Never expose burn functions to frontend
3. **Network**: Change to 'mainnet' for production
4. **Program Deployment**: Deploy Anchor program for full on-chain verification

## 📚 Next Steps

1. Deploy Anchor program to devnet/mainnet
2. Set up backend API endpoints
3. Configure product burn amounts
4. Implement reward system (NFTs, access, etc.)
5. Set up monitoring and alerts






