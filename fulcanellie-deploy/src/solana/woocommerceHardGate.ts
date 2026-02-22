/**
 * WooCommerce Hard Gating Integration
 * 
 * Enforces:
 * - Product visibility (Tier 2+)
 * - Checkout ability (Tier 2+)
 * - Tiered discounts (Tier 1-3)
 * - Immediate access revocation on unstake
 */

import {
  getStakeInfo,
  checkStakeGate,
} from './hardStaking';
import {
  getTierFromAmount,
  getDiscountForTier,
  canSeeProducts,
  canCheckout,
  hasExclusiveAccess,
  isAccessRevoked,
  MIN_STAKE_FOR_MAIN_PERKS,
  STAKING_TIERS,
  StakeInfo,
} from './tieredStaking';

interface WooCommerceConfig {
  programId: string;
  mintAddress: string;
  network?: 'devnet' | 'mainnet';
}

/**
 * Check product visibility for user
 * Returns false if user doesn't meet Tier 2 requirement
 */
export async function checkProductVisibility(
  userAddress: string,
  config: WooCommerceConfig
): Promise<{ visible: boolean; reason?: string; tier: number }> {
  const stakeInfo = await getStakeInfo(userAddress, config);

  if (!stakeInfo || stakeInfo.status !== 'Active') {
    return {
      visible: false,
      reason: 'No active stake found',
      tier: 0,
    };
  }

  // Access revoked immediately if unstaking
  if (isAccessRevoked(stakeInfo.status)) {
    return {
      visible: false,
      reason: 'Access revoked - unstaking in progress',
      tier: 0,
    };
  }

  const amount = stakeInfo.amount / Math.pow(10, 9); // Convert from raw
  const tier = getTierFromAmount(amount);
  const visible = canSeeProducts(tier);

  return {
    visible,
    reason: visible ? undefined : `Requires Tier 2 (500+ tokens), current: ${tier}`,
    tier,
  };
}

/**
 * Check checkout permission
 * User must have Tier 2+ and active stake
 */
export async function checkCheckoutPermission(
  userAddress: string,
  config: WooCommerceConfig
): Promise<{ allowed: boolean; reason?: string; tier: number }> {
  const stakeInfo = await getStakeInfo(userAddress, config);

  if (!stakeInfo || stakeInfo.status !== 'Active') {
    return {
      allowed: false,
      reason: 'No active stake found',
      tier: 0,
    };
  }

  // Access revoked immediately if unstaking
  if (isAccessRevoked(stakeInfo.status)) {
    return {
      allowed: false,
      reason: 'Access revoked - unstaking in progress',
      tier: 0,
    };
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

/**
 * Calculate discount based on staking tier
 */
export async function calculateStakingDiscount(
  userAddress: string,
  cartTotal: number,
  config: WooCommerceConfig
): Promise<{ discount: number; discountPercent: number; finalTotal: number; tier: number }> {
  const stakeInfo = await getStakeInfo(userAddress, config);

  if (!stakeInfo || stakeInfo.status !== 'Active' || isAccessRevoked(stakeInfo.status)) {
    return {
      discount: 0,
      discountPercent: 0,
      finalTotal: cartTotal,
      tier: 0,
    };
  }

  const amount = stakeInfo.amount / Math.pow(10, 9);
  const tier = getTierFromAmount(amount);
  const discountPercent = getDiscountForTier(tier);
  const discount = (cartTotal * discountPercent) / 100;
  const finalTotal = Math.max(0, cartTotal - discount);

  return {
    discount,
    discountPercent,
    finalTotal,
    tier,
  };
}

/**
 * Check exclusive product access (Tier 3 only)
 */
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

/**
 * Get user's staking status for WooCommerce
 */
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

/**
 * WooCommerce hook handlers
 */

/**
 * Filter products by visibility (Tier 2+)
 */
export function createProductVisibilityFilter(config: WooCommerceConfig) {
  return async (userAddress: string, productId: string): Promise<boolean> => {
    const visibility = await checkProductVisibility(userAddress, config);
    return visibility.visible;
  };
}

/**
 * Validate checkout permission
 */
export function createCheckoutValidator(config: WooCommerceConfig) {
  return async (userAddress: string): Promise<{ valid: boolean; reason?: string }> => {
    const permission = await checkCheckoutPermission(userAddress, config);
    return {
      valid: permission.allowed,
      reason: permission.reason,
    };
  };
}

/**
 * Apply staking discount to cart
 */
export function createDiscountApplier(config: WooCommerceConfig) {
  return async (userAddress: string, cartTotal: number): Promise<number> => {
    const discount = await calculateStakingDiscount(userAddress, cartTotal, config);
    return discount.finalTotal;
  };
}


