"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVaultPDA = getVaultPDA;
exports.getStakeAccountPDA = getStakeAccountPDA;
exports.getProposalPDA = getProposalPDA;
exports.getVoteRecordPDA = getVoteRecordPDA;
exports.getStakeInfo = getStakeInfo;
exports.checkStakeGate = checkStakeGate;
exports.stakeTokens = stakeTokens;
exports.requestUnstake = requestUnstake;
exports.completeUnstake = completeUnstake;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const anchor_1 = require("@coral-xyz/anchor");
const tieredStaking_1 = require("./tieredStaking");
function loadWallet() {
    const walletPath = path.join(process.cwd(), 'wallet.json');
    if (!fs.existsSync(walletPath)) {
        throw new Error('Wallet not found. Please create a wallet first.');
    }
    const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(secretKey));
}
function getConnection(network = 'devnet') {
    const rpcUrl = network === 'mainnet-beta' || network === 'mainnet'
        ? 'https://api.mainnet.solana.com'
        : 'https://api.devnet.solana.com';
    return new web3_js_1.Connection(rpcUrl, 'confirmed');
}
function loadIdl() {
    const envPath = process.env.STAKING_IDL_PATH;
    if (envPath && fs.existsSync(envPath)) {
        return JSON.parse(fs.readFileSync(envPath, 'utf-8'));
    }
    const localPath = path.join(process.cwd(), 'utils', 'solana', 'zoostaking.json');
    if (fs.existsSync(localPath)) {
        return JSON.parse(fs.readFileSync(localPath, 'utf-8'));
    }
    throw new Error('Staking IDL not found. Set STAKING_IDL_PATH or add utils/solana/zoostaking.json (from anchor build).');
}
function makeProvider(connection, wallet) {
    const nodeWallet = new anchor_1.Wallet(wallet);
    return new anchor_1.AnchorProvider(connection, nodeWallet, { commitment: 'confirmed' });
}
function makeProgram(connection, wallet, programId) {
    const idl = loadIdl();
    if (!idl.address) {
        idl.address = programId.toBase58();
    }
    const provider = makeProvider(connection, wallet);
    return new anchor_1.Program(idl, provider);
}
function getVaultPDA(mint, programId) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('vault'), mint.toBuffer()], programId);
}
function getStakeAccountPDA(vault, user, programId) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('stake'), vault.toBuffer(), user.toBuffer()], programId);
}
function getProposalPDA(vault, proposalId, programId) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(proposalId));
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('proposal'), vault.toBuffer(), buf], programId);
}
function getVoteRecordPDA(proposal, voter, programId) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('vote'), proposal.toBuffer(), voter.toBuffer()], programId);
}
async function getStakeInfo(userAddress, config) {
    const connection = getConnection(config.network);
    const wallet = loadWallet();
    const mint = new web3_js_1.PublicKey(config.mintAddress);
    const programId = new web3_js_1.PublicKey(config.programId);
    const user = new web3_js_1.PublicKey(userAddress);
    const [vaultPDA] = getVaultPDA(mint, programId);
    const [stakeAccountPDA] = getStakeAccountPDA(vaultPDA, user, programId);
    try {
        const program = makeProgram(connection, wallet, programId);
        const stakeAccountRaw = await program.account.stakeAccount.fetchNullable(stakeAccountPDA);
        if (!stakeAccountRaw)
            return null;
        const stakeAccount = stakeAccountRaw;
        const amountRaw = typeof stakeAccount.amount?.toNumber === 'function'
            ? stakeAccount.amount.toNumber()
            : Number(stakeAccount.amount ?? 0);
        const timestamp = typeof stakeAccount.timestamp?.toNumber === 'function'
            ? stakeAccount.timestamp.toNumber()
            : Number(stakeAccount.timestamp ?? 0);
        const unstakeTimestamp = (() => {
            const v = stakeAccount.unstakeTimestamp ?? stakeAccount.unstake_timestamp ?? null;
            if (v === null || v === undefined)
                return undefined;
            if (typeof v?.toNumber === 'function')
                return v.toNumber();
            return Number(v);
        })();
        const penaltyApplied = Boolean(stakeAccount.penaltyApplied ?? stakeAccount.penalty_applied ?? false);
        const status = (() => {
            const s = stakeAccount.status;
            if (!s)
                return 'Unstaked';
            const so = s;
            if (so.active !== undefined)
                return 'Active';
            if (so.unstaking !== undefined)
                return 'Unstaking';
            if (so.unstaked !== undefined)
                return 'Unstaked';
            const asStr = String(s);
            if (asStr.toLowerCase().includes('unstaking'))
                return 'Unstaking';
            if (asStr.toLowerCase().includes('active'))
                return 'Active';
            return 'Unstaked';
        })();
        const amountTokens = amountRaw / Math.pow(10, 9);
        const tier = (0, tieredStaking_1.getTierFromAmount)(amountTokens);
        const unlockTimestamp = status === 'Unstaking' && unstakeTimestamp !== undefined
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
    }
    catch {
        return null;
    }
}
async function checkStakeGate(userAddress, requiredAmount, config) {
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
async function stakeTokens(amount, config, userAddress) {
    const connection = getConnection(config.network);
    const wallet = loadWallet();
    const user = userAddress ? new web3_js_1.PublicKey(userAddress) : wallet.publicKey;
    const mint = new web3_js_1.PublicKey(config.mintAddress);
    const programId = new web3_js_1.PublicKey(config.programId);
    const program = makeProgram(connection, wallet, programId);
    const [vaultPDA] = getVaultPDA(mint, programId);
    const [stakeAccountPDA] = getStakeAccountPDA(vaultPDA, user, programId);
    const userTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mint, user);
    const vaultTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mint, vaultPDA, true);
    const amountBN = new anchor_1.BN(amount * Math.pow(10, 9));
    const tx = await program.methods
        .stake(amountBN)
        .accounts({
        vault: vaultPDA,
        stakeAccount: stakeAccountPDA,
        user: user,
        userTokenAccount: userTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
        systemProgram: web3_js_1.SystemProgram.programId,
    })
        .rpc();
    return tx;
}
async function requestUnstake(config, userAddress) {
    const connection = getConnection(config.network);
    const wallet = loadWallet();
    const user = userAddress ? new web3_js_1.PublicKey(userAddress) : wallet.publicKey;
    const mint = new web3_js_1.PublicKey(config.mintAddress);
    const programId = new web3_js_1.PublicKey(config.programId);
    const program = makeProgram(connection, wallet, programId);
    const [vaultPDA] = getVaultPDA(mint, programId);
    const [stakeAccountPDA] = getStakeAccountPDA(vaultPDA, user, programId);
    const tx = await program.methods
        .requestUnstake()
        .accounts({
        vault: vaultPDA,
        stakeAccount: stakeAccountPDA,
        user: user,
        systemProgram: web3_js_1.SystemProgram.programId,
    })
        .rpc();
    return tx;
}
async function completeUnstake(config, userAddress) {
    const connection = getConnection(config.network);
    const wallet = loadWallet();
    const user = userAddress ? new web3_js_1.PublicKey(userAddress) : wallet.publicKey;
    const mint = new web3_js_1.PublicKey(config.mintAddress);
    const programId = new web3_js_1.PublicKey(config.programId);
    const program = makeProgram(connection, wallet, programId);
    const [vaultPDA] = getVaultPDA(mint, programId);
    const [stakeAccountPDA] = getStakeAccountPDA(vaultPDA, user, programId);
    const userTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mint, user);
    const vaultTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mint, vaultPDA, true);
    const tx = await program.methods
        .completeUnstake()
        .accounts({
        vault: vaultPDA,
        stakeAccount: stakeAccountPDA,
        user: user,
        userTokenAccount: userTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
        systemProgram: web3_js_1.SystemProgram.programId,
    })
        .rpc();
    return tx;
}
