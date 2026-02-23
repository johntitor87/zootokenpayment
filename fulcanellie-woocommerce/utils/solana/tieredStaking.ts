/**
 * Tiered Staking System with Hard Gating
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

export interface StakeTier {
  tier: number;
  name: string;
  minTokens: number;
  perks: string[];
}

export const STAKING_TIERS: StakeTier[] = [
  { tier: 0, name: 'No Access', minTokens: 0, perks: [] },
  { tier: 1, name: 'Base Access', minTokens: 250, perks: ['Basic discounts (5%)'] },
  { tier: 2, name: 'Full Access', minTokens: 500, perks: ['Full product visibility', 'Standard discounts (10%)'] },
  { tier: 3, name: 'Premium Access', minTokens: 1000, perks: ['Larger discounts (20%)', 'Exclusive products'] },
];

export const MIN_STAKE_FOR_MAIN_PERKS = 500;

export interface StakeInfo {
  user: string;
  amount: number;
  timestamp: number;
  unstakeTimestamp?: number;
  unlockTimestamp?: number;
  status: 'Active' | 'Unstaking' | 'Unstaked';
  tier: number;
  penaltyApplied: boolean;
}

export function getTierFromAmount(amount: number): number {
  if (amount >= 1000) return 3;
  if (amount >= 500) return 2;
  if (amount >= 250) return 1;
  return 0;
}

export function hasMainPerks(amount: number): boolean {
  return amount >= MIN_STAKE_FOR_MAIN_PERKS;
}

export function getDiscountForTier(tier: number): number {
  switch (tier) {
    case 3: return 20;
    case 2: return 10;
    case 1: return 5;
    default: return 0;
  }
}

export function canSeeProducts(tier: number): boolean {
  return tier >= 2;
}

export function canCheckout(tier: number): boolean {
  return tier >= 2;
}

export function hasExclusiveAccess(tier: number): boolean {
  return tier >= 3;
}

export function isAccessRevoked(status: string): boolean {
  return status === 'Unstaking' || status === 'Unstaked';
}
