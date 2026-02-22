# ZOO Token Burn Program

Solana program for controlled, verified token burning.

## Features

- ✅ On-chain verification
- ✅ Product-specific burn amounts
- ✅ Replay attack prevention
- ✅ Refund support
- ✅ Reward system integration

## Building

```bash
anchor build
```

## Deploying

```bash
anchor deploy --provider.cluster devnet
```

## Testing

```bash
anchor test
```

## Program ID

Update `declare_id!()` in `lib.rs` with your deployed program ID.






