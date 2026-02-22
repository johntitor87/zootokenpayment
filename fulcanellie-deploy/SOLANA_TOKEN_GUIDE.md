# Solana Token Creation Guide

This guide explains how to create Solana tokens directly in Cursor without using Docker.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Solana CLI** (optional, but recommended for wallet management)
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

## Installation

Install the required dependencies:

```bash
npm install
```

This will install:
- `@solana/web3.js` - Solana JavaScript SDK
- `@solana/spl-token` - SPL Token library

## Getting Started

### Option 1: Interactive Token Creation

Run the interactive script:

```bash
npm run create-token
```

This will prompt you for:
- Token name
- Token symbol
- Decimals (default: 9)
- Initial supply (default: 0)
- Network (devnet/mainnet, default: devnet)
- Mint authority (optional)
- Freeze authority (optional)

### Option 2: Programmatic Token Creation

You can also create tokens programmatically by importing the function:

```typescript
import { createTokenSimple } from './src/solana/createTokenSimple';

const token = await createTokenSimple({
  name: 'My Token',
  symbol: 'MTK',
  decimals: 9,
  initialSupply: 1000000,
  network: 'devnet',
  revokeMintAuthority: false,
});

console.log('Mint address:', token.mint);
```

## Getting SOL for Fees

### Devnet (for testing)

Get free devnet SOL from the faucet:
- https://faucet.solana.com/
- Or use CLI: `solana airdrop 2 <YOUR_PUBLIC_KEY>`

### Mainnet

You'll need real SOL. You can:
- Buy SOL from an exchange
- Transfer from another wallet
- Use a service like Coinbase, Binance, etc.

## Keypair Management

The script automatically creates a keypair file (`solana-keypair.json`) in your project root if it doesn't exist.

**⚠️ Security Warning:**
- Never commit `solana-keypair.json` to version control
- Keep your private keys secure
- For mainnet, use a hardware wallet or secure key management

Add to `.gitignore`:
```
solana-keypair.json
token-*.json
```

## Token Configuration

### Decimals
- Most tokens use 9 decimals (like SOL)
- Common choices: 6, 8, 9, 18
- Lower decimals = simpler math, less precision

### Initial Supply
- Set to 0 if you want to mint later
- Or set initial supply to mint tokens immediately

### Mint Authority
- Controls who can mint new tokens
- Can be revoked to make supply fixed
- Default: your wallet address

### Freeze Authority
- Controls who can freeze token accounts
- Set to `null` for no freeze authority
- Default: `null` (no freeze authority)

## Network Options

- **devnet**: For testing (free SOL available)
- **mainnet**: Real blockchain (costs real SOL)
- **testnet**: Alternative test network

## Example: Create a Token

```bash
# Interactive mode
npm run create-token

# Follow prompts:
# Token name: My Awesome Token
# Token symbol: MAT
# Decimals: 9
# Initial supply: 1000000
# Network: devnet
```

## Viewing Your Token

After creation, you'll get:
- **Mint Address**: The unique identifier for your token
- **Token Account**: Your wallet's account for this token
- **Explorer Link**: View on Solana Explorer

Example explorer link:
```
https://explorer.solana.com/address/<MINT_ADDRESS>?cluster=devnet
```

## Advanced Usage

### Using Existing Keypair

If you have an existing Solana keypair:

```typescript
import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';

const secretKey = JSON.parse(fs.readFileSync('path/to/keypair.json', 'utf-8'));
const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
```

### Custom Mint Authority

```typescript
const config = {
  name: 'My Token',
  symbol: 'MTK',
  mintAuthority: 'YOUR_PUBLIC_KEY_HERE', // Custom mint authority
};
```

### Revoke Mint Authority

To make your token supply fixed (no more minting):

```typescript
const config = {
  name: 'My Token',
  symbol: 'MTK',
  initialSupply: 1000000,
  revokeMintAuthority: true, // Makes supply fixed
};
```

## Troubleshooting

### "Insufficient funds"
- Make sure you have SOL in your wallet
- For devnet, get free SOL from the faucet

### "Transaction failed"
- Check your network connection
- Verify you have enough SOL for fees
- Try again (network can be busy)

### "Invalid keypair"
- Make sure `solana-keypair.json` is valid JSON
- Regenerate if needed (delete the file and run again)

## Next Steps

After creating your token:
1. **Distribute tokens**: Send tokens to other wallets
2. **Add liquidity**: List on a DEX like Raydium or Orca
3. **Create metadata**: Use Metaplex to add name, symbol, image
4. **Build integrations**: Use the mint address in your dApp

## Resources

- [Solana Documentation](https://docs.solana.com/)
- [SPL Token Program](https://spl.solana.com/token)
- [Solana Explorer](https://explorer.solana.com/)
- [Solana Cookbook](https://solanacookbook.com/)

## Support

If you encounter issues:
1. Check the error message
2. Verify your network connection
3. Ensure you have sufficient SOL
4. Check Solana network status



