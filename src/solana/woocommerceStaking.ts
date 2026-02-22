/**
 * WooCommerce Integration for Hard Gating Staking
 * 
 * Check user's staked amount for product access
 */

import { checkStakeGate, getStakeInfo } from './hardStaking';
import { getDiscountForTier, getTierFromAmount, isAccessRevoked } from './tieredStaking';

interface WooCommerceStakingConfig {
  programId: string;
  mintAddress: string;
  network?: 'devnet' | 'mainnet';
}

/**
 * Check if user can access a product based on staking
 */
export async function checkProductStakeAccess(
  userAddress: string,
  requiredStake: number,
  config: WooCommerceStakingConfig
): Promise<{ hasAccess: boolean; stakedAmount: number; requiredAmount: number }> {
  const gate = await checkStakeGate(userAddress, requiredStake, config);

  return {
    hasAccess: gate.hasAccess,
    stakedAmount: gate.stakedAmount,
    requiredAmount: requiredStake,
  };
}

/**
 * Get user's staking status for WooCommerce
 */
export async function getUserStakingStatus(
  userAddress: string,
  config: WooCommerceStakingConfig
) {
  const stakeInfo = await getStakeInfo(userAddress, config);

  if (!stakeInfo) {
    return {
      isStaking: false,
      stakedAmount: 0,
      tier: 0,
      discountPercent: 0,
      accessRevoked: true,
      stakedSince: null,
      unlockTimestamp: null,
    };
  }

  const stakedAmountTokens = stakeInfo.amount / Math.pow(10, 9);
  const tier = getTierFromAmount(stakedAmountTokens);
  const accessRevoked = isAccessRevoked(stakeInfo.status);

  return {
    isStaking: stakeInfo?.status === 'Active',
    stakedAmount: stakedAmountTokens,
    tier,
    discountPercent: getDiscountForTier(tier),
    accessRevoked,
    stakedSince: stakeInfo?.timestamp ? new Date(stakeInfo.timestamp * 1000).toISOString() : null,
    unlockTimestamp: stakeInfo.unlockTimestamp ?? null,
  };
}

/**
 * WooCommerce webhook handler for staking checks
 */
export function createStakingWebhookHandler(config: WooCommerceStakingConfig) {
  return async (req: any, res: any) => {
    try {
      const { user_address, required_stake } = req.body;

      if (!user_address) {
        return res.status(400).json({ error: 'Missing user_address' });
      }

      const required = required_stake || 0;
      const access = await checkProductStakeAccess(
        user_address,
        required,
        config
      );

      res.json({
        success: true,
        access: access.hasAccess,
        staked_amount: access.stakedAmount,
        required_amount: access.requiredAmount,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };
}

/**
 * Apply staking-based discount
 */
export function calculateStakingDiscount(
  cartTotal: number,
  stakedAmount: number,
  _discountPerStake: number = 0.01 // Deprecated: kept for backwards compat
): number {
  // Tier-based discount:
  // - Tier 1 (250+): 5%
  // - Tier 2 (500+): 10%
  // - Tier 3 (1000+): 20%
  const tier = getTierFromAmount(stakedAmount);
  const discountPercent = getDiscountForTier(tier);
  const discount = (cartTotal * discountPercent) / 100;
  return Math.max(0, cartTotal - discount);
}





