"use strict";
/**
 * Staking API config: from env (Render) or staking-config.json
 */
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
exports.loadConfig = loadConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function loadConfig() {
    const programId = process.env.STAKING_PROGRAM_ID;
    const mintAddress = process.env.MINT_ADDRESS;
    const network = process.env.SOLANA_NETWORK;
    const zooStoreWallet = process.env.ZOO_STORE_WALLET;
    if (programId && mintAddress && zooStoreWallet) {
        return {
            programId,
            mintAddress,
            network: network === 'mainnet-beta' ? 'mainnet-beta' : 'devnet',
            zooStoreWallet,
        };
    }
    const configPath = path.join(process.cwd(), 'staking-config.json');
    if (!fs.existsSync(configPath)) {
        throw new Error('Staking config missing. Set env vars (STAKING_PROGRAM_ID, MINT_ADDRESS, ZOO_STORE_WALLET, optional SOLANA_NETWORK) or add staking-config.json');
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}
