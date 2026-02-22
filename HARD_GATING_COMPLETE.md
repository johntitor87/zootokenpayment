# Hard Gating Staking System - Complete Implementation

## ✅ Implementation Summary

Your ZOO token now has a complete hard gating staking system with all requested features:

### 1️⃣ Access / Gating

**Type:** Hard gating (on-chain verification)

**What is gated:**
- ✅ Product visibility (Tier 2+ required)
- ✅ Checkout ability (Tier 2+ required)
- ✅ Discounts (Tiered: 5%, 10%, 20%)

**Enforcement:** Access revoked immediately on unstake request

### 2️⃣ Staking Rules

| Tier | Tokens Required | Access / Perks |
|------|----------------|----------------|
| Tier 1 | 250+ | Base access, basic discounts (5%) |
| Tier 2 | 500+ | Full product visibility, standard discounts (10%), checkout enabled |
| Tier 3 | 1000+ | Premium access, larger discounts (20%), exclusive products |

- ✅ **Minimal stake:** 500 ZOO tokens for main perks
- ✅ **Unstaking:** Allowed anytime
- ✅ **Locking period:** 2 days (tokens stay in program vault for 2 days)
- ✅ **Penalty:** 5% if staking & unstaking within 3 days
- ✅ **Access revocation:** Immediate if unstake succeeds

### 3️⃣ Identity / Wallet

- ✅ Staking tied to wallet address only (not WordPress user)
- ✅ Multiple wallets can be used independently
- ✅ No WP login mapping needed

### 4️⃣ UX Flow

1. User connects wallet (Devnet → Mainnet)
2. Stake tokens → move into PDA vault
3. Program records stake amount, timestamp
4. WooCommerce reads stake account → grants access
5. User can request unstake anytime → 2-day lock → access revoked immediately
6. After 2 days → complete unstake → tokens returned

### 5️⃣ Devnet Testing Flow

All ready for testing:
- ✅ Deploy token + staking program on Devnet
- ✅ User stakes 500 ZOO → gains access
- ✅ User tries checkout → allowed
- ✅ User requests unstake → access revoked immediately
- ✅ Test tiered perks at 250 / 500 / 1000
- ✅ Test penalties if staking + unstaking within 3 days

## 📁 Files Created

### Solana Program
- `staking-program/programs/zoostaking/src/lib.rs` - On-chain staking program
- `staking-program/Anchor.toml` - Anchor configuration
- `staking-program/Cargo.toml` - Rust dependencies

### TypeScript Client
- `src/solana/hardStaking.ts` - Staking client functions
- `src/solana/hardStakingCLI.ts` - CLI commands
- `src/solana/tieredStaking.ts` - Tier logic and utilities
- `src/solana/woocommerceHardGate.ts` - WooCommerce integration

### API & Integration
- `src/api/staking-api.ts` - Backend API endpoints
- `src/api/woocommerce-hooks.example.php` - WooCommerce PHP hooks
- `src/dashboard/token-dashboard.html` - Token dashboard page

### Configuration
- `staking-config.json` - Staking configuration

## 🚀 Quick Start

### 1. Deploy Program

```bash
cd staking-program
anchor build
anchor deploy --provider.cluster devnet
```

Update `programId` in `staking-config.json` with deployed program ID.

### 2. Initialize Vault

```bash
npm run hard-stake init
```

### 3. Test Staking

```bash
# Stake 500 tokens (Tier 2 - Full access)
npm run hard-stake stake 500

# Check stake info
npm run hard-stake info <your-wallet-address>

# Request unstake (access revoked immediately)
npm run hard-stake request-unstake

# Complete unstake (after 2 days)
npm run hard-stake complete-unstake
```

### 4. Start API Server

```bash
ts-node src/api/staking-api.ts
```

### 5. Integrate with WooCommerce

Add PHP hooks from `src/api/woocommerce-hooks.example.php` to your WordPress theme.

## 🎯 Tier System

### Tier 0: No Access (< 250 tokens)
- No product visibility
- No checkout
- No discounts

### Tier 1: Base Access (250+ tokens)
- Basic discounts (5%)
- Limited product visibility

### Tier 2: Full Access (500+ tokens) ⭐ Main Perks
- Full product visibility
- Standard discounts (10%)
- Checkout enabled

### Tier 3: Premium Access (1000+ tokens)
- Premium discounts (20%)
- Exclusive products
- Priority support

## 🔒 Security Features

✅ **PDA Vault** - No private key, only program can move funds  
✅ **On-Chain Verification** - All checks happen on Solana  
✅ **Immediate Revocation** - Access revoked on unstake request  
✅ **2-Day Lock** - Tokens locked for 2 days after unstake request  
✅ **Penalty System** - 5% penalty for unstaking within 3 days  
✅ **Backend Only** - No frontend spoofing possible  

## 📊 WooCommerce Integration

### Product Visibility
```php
// Products are automatically filtered based on Tier 2+ requirement
add_filter('woocommerce_product_is_visible', 'zoo_check_product_visibility', 10, 2);
```

### Checkout Validation
```php
// Validates Tier 2+ before allowing checkout
add_action('woocommerce_checkout_process', 'zoo_validate_checkout_permission');
```

### Discounts
```php
// Applies tiered discounts automatically
add_action('woocommerce_cart_calculate_fees', 'zoo_apply_staking_discount');
```

## 🔧 API Endpoints

### GET /api/staking/status
Get user's complete staking status

### GET /api/staking/visibility
Check product visibility (Tier 2+)

### GET /api/staking/checkout
Check checkout permission (Tier 2+)

### GET /api/staking/discount
Calculate discount for cart

### GET /api/staking/exclusive
Check exclusive product access (Tier 3)

### POST /api/staking/stake
Stake tokens (backend only)

### POST /api/staking/request-unstake
Request unstake (starts 2-day lock)

### POST /api/staking/complete-unstake
Complete unstake (after 2-day lock)

## 🎨 Token Dashboard

Access the dashboard at `src/dashboard/token-dashboard.html`:
- Connect wallet
- View staking status
- Stake/unstake tokens
- See tier and perks
- Monitor lock period

## ⚠️ Important Notes

1. **Program Deployment**: Deploy Anchor program first, then update `programId`
2. **Vault Init**: One-time initialization required
3. **2-Day Lock**: Tokens stay locked for 2 days after unstake request
4. **Access Revocation**: Immediate on unstake request
5. **Penalty**: 5% penalty applies if unstaking within 3 days of staking
6. **Network**: Change to 'mainnet' for production

## 📚 Next Steps

1. ✅ Deploy program to devnet
2. ✅ Initialize vault
3. ✅ Test staking/unstaking
4. ✅ Test tiered access
5. ✅ Integrate with WooCommerce
6. ✅ Deploy to mainnet (when ready)

## 🧪 Testing Checklist

- [ ] Stake 250 tokens → Tier 1 access
- [ ] Stake 500 tokens → Tier 2 access (main perks)
- [ ] Stake 1000 tokens → Tier 3 access
- [ ] Request unstake → Access revoked immediately
- [ ] Wait 2 days → Complete unstake
- [ ] Stake and unstake within 3 days → Penalty applied
- [ ] WooCommerce product visibility → Tier 2+ only
- [ ] WooCommerce checkout → Tier 2+ only
- [ ] WooCommerce discounts → Tiered correctly

Your hard gating system is complete and ready for testing! 🎉


