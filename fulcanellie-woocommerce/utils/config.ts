/**
 * Staking API config: from env (Render) or staking-config.json
 */

import * as fs from 'fs';
import * as path from 'path';

export type StakingConfig = {
  programId: string;
  mintAddress: string;
  network: 'devnet' | 'mainnet-beta';
  zooStoreWallet: string;
  [key: string]: unknown;
};

export function loadConfig(): StakingConfig {
  const programId = process.env.STAKING_PROGRAM_ID;
  const mintAddress = process.env.MINT_ADDRESS;
  const network = process.env.SOLANA_NETWORK as 'devnet' | 'mainnet-beta' | undefined;
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
    throw new Error(
      'Staking config missing. Set env vars (STAKING_PROGRAM_ID, MINT_ADDRESS, ZOO_STORE_WALLET, optional SOLANA_NETWORK) or add staking-config.json'
    );
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as StakingConfig;
}
