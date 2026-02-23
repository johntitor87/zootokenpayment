/**
 * WooCommerce Hard Gating Integration
 */

import { getStakeInfo, checkStakeGate } from './hardStaking';
import {
  getTierFromAmount,
  getDiscountForTier,
  canSeeProducts,
  canCheckout,
  hasExclusiveAccess,
  isAccessRevoked,
  STAKING_TIERS,
  type StakeInfo,
} from './tieredStaking';

interface WooCommerceConfig {
  programId: string;
  mintAddress: string;
  network?: 'devnet' | 'mainnet' | 'mainnet-beta';
}

export async function checkProductVisibility(
  userAddress: string,
  config: WooCommerceConfig
): Promise<{ visible: boolean; reason?: string; tier: number }> {
  const stakeInfo = await getStakeInfo(userAddress, config);

  if (!stakeInfo || stakeInfo.status !== 'Active') {
    return { visible: false, reason: 'No active stake found', tier: 0 };
  }
  if (isAccessRevoked(stakeInfo.status)) {
    return { visible: false, reason: 'Access revoked - unstaking in progress', tier: 0 };
  }

  const amount = stakeInfo.amount / Math.pow(10, 9);
  const tier = getTierFromAmount(amount);
  const visible = canSeeProducts(tier);

  return {
    visible,
    reason: visible ? undefined : `Requires Tier 2 (500+ tokens), current: ${tier}`,
    tier,
  };
}

export async function checkCheckoutPermission(
  userAddress: string,
  config: WooCommerceConfig
): Promise<{ allowed: boolean; reason?: string; tier: number }> {
  const stakeInfo = await getStakeInfo(userAddress, config);

  if (!stakeInfo || stakeInfo.status !== 'Active') {
    return { allowed: false, reason: 'No active stake found', tier: 0 };
  }
  if (isAccessRevoked(stakeInfo.status)) {
    return { allowed: false, reason: 'Access revoked - unstaking in progress', tier: 0 };
  }

  const amount = stakeInfo.amount / Math.pow(10, 9);
  const tier = getTierFromAmount(amount);
  const allowed = canCheckout(tier);

  return {
    allowed,
    reason: allowed ? undefined : `Requires Tier 2 (500+ tokens) for checkout`,
    tier,
  };
}

export async function calculateStakingDiscount(
  userAddress: string,
  cartTotal: number,
  config: WooCommerceConfig
): Promise<{ discount: number; discountPercent: number; finalTotal: number; tier: number }> {
  const stakeInfo = await getStakeInfo(userAddress, config);

  if (!stakeInfo || stakeInfo.status !== 'Active' || isAccessRevoked(stakeInfo.status)) {
    return { discount: 0, discountPercent: 0, finalTotal: cartTotal, tier: 0 };
  }

  const amount = stakeInfo.amount / Math.pow(10, 9);
  const tier = getTierFromAmount(amount);
  const discountPercent = getDiscountForTier(tier);
  const discount = (cartTotal * discountPercent) / 100;
  const finalTotal = Math.max(0, cartTotal - discount);

  return { discount, discountPercent, finalTotal, tier };
}

export async function checkExclusiveAccess(
  userAddress: string,
  config: WooCommerceConfig
): Promise<{ hasAccess: boolean; tier: number }> {
  const stakeInfo = await getStakeInfo(userAddress, config);

  if (!stakeInfo || stakeInfo.status !== 'Active' || isAccessRevoked(stakeInfo.status)) {
    return { hasAccess: false, tier: 0 };
  }

  const amount = stakeInfo.amount / Math.pow(10, 9);
  const tier = getTierFromAmount(amount);
  const hasAccess = hasExclusiveAccess(tier);

  return { hasAccess, tier };
}

export async function getUserStakingStatus(
  userAddress: string,
  config: WooCommerceConfig
): Promise<{
  isStaking: boolean;
  tier: number;
  tierName: string;
  stakedAmount: number;
  canSeeProducts: boolean;
  canCheckout: boolean;
  hasExclusiveAccess: boolean;
  discountPercent: number;
  accessRevoked: boolean;
  unlockTimestamp?: number;
}> {
  const stakeInfo = await getStakeInfo(userAddress, config);

  if (!stakeInfo || stakeInfo.status !== 'Active') {
    return {
      isStaking: false,
      tier: 0,
      tierName: 'No Access',
      stakedAmount: 0,
      canSeeProducts: false,
      canCheckout: false,
      hasExclusiveAccess: false,
      discountPercent: 0,
      accessRevoked: true,
    };
  }

  const amount = stakeInfo.amount / Math.pow(10, 9);
  const tier = getTierFromAmount(amount);
  const tierInfo = STAKING_TIERS[tier] || STAKING_TIERS[0];
  const accessRevoked = isAccessRevoked(stakeInfo.status);

  return {
    isStaking: stakeInfo.status === 'Active',
    tier,
    tierName: tierInfo.name,
    stakedAmount: amount,
    canSeeProducts: canSeeProducts(tier) && !accessRevoked,
    canCheckout: canCheckout(tier) && !accessRevoked,
    hasExclusiveAccess: hasExclusiveAccess(tier) && !accessRevoked,
    discountPercent: getDiscountForTier(tier),
    accessRevoked,
    unlockTimestamp: stakeInfo.unlockTimestamp,
  };
}
