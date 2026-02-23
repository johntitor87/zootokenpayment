import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import { BN, Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { getTierFromAmount } from './tieredStaking';

interface StakingConfig {
  programId: string;
  mintAddress: string;
  network?: 'devnet' | 'mainnet' | 'mainnet-beta';
}

interface StakeInfo {
  user: string;
  amount: number;
  timestamp: number;
  unstakeTimestamp?: number;
  unlockTimestamp?: number;
  status: 'Active' | 'Unstaking' | 'Unstaked';
  tier: number;
  penaltyApplied: boolean;
}

type ProgramIdl = Record<string, unknown>;

function loadWallet(): Keypair {
  const walletPath = path.join(process.cwd(), 'wallet.json');
  if (!fs.existsSync(walletPath)) {
    throw new Error('Wallet not found. Please create a wallet first.');
  }
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

function getConnection(network: 'devnet' | 'mainnet' | 'mainnet-beta' = 'devnet'): Connection {
  const rpcUrl = network === 'mainnet-beta' || network === 'mainnet'
    ? 'https://api.mainnet.solana.com'
    : 'https://api.devnet.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

function loadIdl(): ProgramIdl {
  const envPath = process.env.STAKING_IDL_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return JSON.parse(fs.readFileSync(envPath, 'utf-8')) as ProgramIdl;
  }
  const localPath = path.join(process.cwd(), 'utils', 'solana', 'zoostaking.json');
  if (fs.existsSync(localPath)) {
    return JSON.parse(fs.readFileSync(localPath, 'utf-8')) as ProgramIdl;
  }
  throw new Error(
    'Staking IDL not found. Set STAKING_IDL_PATH or add utils/solana/zoostaking.json (from anchor build).'
  );
}

function makeProvider(connection: Connection, wallet: Keypair): AnchorProvider {
  const nodeWallet = new Wallet(wallet);
  return new AnchorProvider(connection, nodeWallet, { commitment: 'confirmed' });
}

function makeProgram(connection: Connection, wallet: Keypair, programId: PublicKey): Program {
  const idl = loadIdl() as Record<string, unknown>;
  if (!idl.address) {
    (idl as Record<string, string>).address = programId.toBase58();
  }
  const provider = makeProvider(connection, wallet);
  return new Program(idl as any, provider);
}

export function getVaultPDA(mint: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), mint.toBuffer()],
    programId
  );
}

export function getStakeAccountPDA(vault: PublicKey, user: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('stake'), vault.toBuffer(), user.toBuffer()],
    programId
  );
}

export function getProposalPDA(vault: PublicKey, proposalId: number, programId: PublicKey): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(proposalId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from('proposal'), vault.toBuffer(), buf],
    programId
  );
}

export function getVoteRecordPDA(proposal: PublicKey, voter: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vote'), proposal.toBuffer(), voter.toBuffer()],
    programId
  );
}

export async function getStakeInfo(
  userAddress: string,
  config: StakingConfig
): Promise<StakeInfo | null> {
  const connection = getConnection(config.network);
  const wallet = loadWallet();
  const mint = new PublicKey(config.mintAddress);
  const programId = new PublicKey(config.programId);
  const user = new PublicKey(userAddress);

  const [vaultPDA] = getVaultPDA(mint, programId);
  const [stakeAccountPDA] = getStakeAccountPDA(vaultPDA, user, programId);

  try {
    const program = makeProgram(connection, wallet, programId);
    const stakeAccountRaw = await (program.account as { stakeAccount: { fetchNullable: (p: PublicKey) => Promise<Record<string, unknown> | null> } }).stakeAccount.fetchNullable(stakeAccountPDA);
    if (!stakeAccountRaw) return null;
    const stakeAccount: Record<string, unknown> = stakeAccountRaw;

    const amountRaw: number =
      typeof (stakeAccount.amount as { toNumber?: () => number })?.toNumber === 'function'
        ? (stakeAccount.amount as { toNumber: () => number }).toNumber()
        : Number(stakeAccount.amount ?? 0);

    const timestamp: number =
      typeof (stakeAccount.timestamp as { toNumber?: () => number })?.toNumber === 'function'
        ? (stakeAccount.timestamp as { toNumber: () => number }).toNumber()
        : Number(stakeAccount.timestamp ?? 0);

    const unstakeTimestamp: number | undefined = (() => {
      const v = stakeAccount.unstakeTimestamp ?? stakeAccount.unstake_timestamp ?? null;
      if (v === null || v === undefined) return undefined;
      if (typeof (v as { toNumber?: () => number })?.toNumber === 'function') return (v as { toNumber: () => number }).toNumber();
      return Number(v);
    })();

    const penaltyApplied: boolean = Boolean(stakeAccount.penaltyApplied ?? stakeAccount.penalty_applied ?? false);

    const status: StakeInfo['status'] = (() => {
      const s = stakeAccount.status;
      if (!s) return 'Unstaked';
      const so = s as Record<string, unknown>;
      if (so.active !== undefined) return 'Active';
      if (so.unstaking !== undefined) return 'Unstaking';
      if (so.unstaked !== undefined) return 'Unstaked';
      const asStr = String(s);
      if (asStr.toLowerCase().includes('unstaking')) return 'Unstaking';
      if (asStr.toLowerCase().includes('active')) return 'Active';
      return 'Unstaked';
    })();

    const amountTokens = amountRaw / Math.pow(10, 9);
    const tier = getTierFromAmount(amountTokens);

    const unlockTimestamp =
      status === 'Unstaking' && unstakeTimestamp !== undefined
        ? unstakeTimestamp + (2 * 24 * 60 * 60)
        : undefined;

    return {
      user: userAddress,
      amount: amountRaw,
      timestamp,
      unstakeTimestamp,
      unlockTimestamp,
      status,
      tier,
      penaltyApplied,
    };
  } catch {
    return null;
  }
}

export async function checkStakeGate(
  userAddress: string,
  requiredAmount: number,
  config: StakingConfig
): Promise<{ hasAccess: boolean; stakedAmount: number }> {
  const stakeInfo = await getStakeInfo(userAddress, config);
  if (!stakeInfo || stakeInfo.status !== 'Active') {
    return { hasAccess: false, stakedAmount: 0 };
  }
  const hasAccess = stakeInfo.amount >= requiredAmount * Math.pow(10, 9);
  return {
    hasAccess,
    stakedAmount: stakeInfo.amount / Math.pow(10, 9),
  };
}

export async function stakeTokens(
  amount: number,
  config: StakingConfig,
  userAddress?: string
): Promise<string> {
  const connection = getConnection(config.network);
  const wallet = loadWallet();
  const user = userAddress ? new PublicKey(userAddress) : wallet.publicKey;
  const mint = new PublicKey(config.mintAddress);
  const programId = new PublicKey(config.programId);

  const program = makeProgram(connection, wallet, programId);

  const [vaultPDA] = getVaultPDA(mint, programId);
  const [stakeAccountPDA] = getStakeAccountPDA(vaultPDA, user, programId);

  const userTokenAccount = await getAssociatedTokenAddress(mint, user);
  const vaultTokenAccount = await getAssociatedTokenAddress(mint, vaultPDA, true);

  const amountBN = new BN(amount * Math.pow(10, 9));

  const tx = await program.methods
    .stake(amountBN)
    .accounts({
      vault: vaultPDA,
      stakeAccount: stakeAccountPDA,
      user: user,
      userTokenAccount: userTokenAccount,
      vaultTokenAccount: vaultTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

export async function requestUnstake(config: StakingConfig, userAddress?: string): Promise<string> {
  const connection = getConnection(config.network);
  const wallet = loadWallet();
  const user = userAddress ? new PublicKey(userAddress) : wallet.publicKey;
  const mint = new PublicKey(config.mintAddress);
  const programId = new PublicKey(config.programId);

  const program = makeProgram(connection, wallet, programId);

  const [vaultPDA] = getVaultPDA(mint, programId);
  const [stakeAccountPDA] = getStakeAccountPDA(vaultPDA, user, programId);

  const tx = await program.methods
    .requestUnstake()
    .accounts({
      vault: vaultPDA,
      stakeAccount: stakeAccountPDA,
      user: user,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

export async function completeUnstake(config: StakingConfig, userAddress?: string): Promise<string> {
  const connection = getConnection(config.network);
  const wallet = loadWallet();
  const user = userAddress ? new PublicKey(userAddress) : wallet.publicKey;
  const mint = new PublicKey(config.mintAddress);
  const programId = new PublicKey(config.programId);

  const program = makeProgram(connection, wallet, programId);

  const [vaultPDA] = getVaultPDA(mint, programId);
  const [stakeAccountPDA] = getStakeAccountPDA(vaultPDA, user, programId);

  const userTokenAccount = await getAssociatedTokenAddress(mint, user);
  const vaultTokenAccount = await getAssociatedTokenAddress(mint, vaultPDA, true);

  const tx = await program.methods
    .completeUnstake()
    .accounts({
      vault: vaultPDA,
      stakeAccount: stakeAccountPDA,
      user: user,
      userTokenAccount: userTokenAccount,
      vaultTokenAccount: vaultTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}
