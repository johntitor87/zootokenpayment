"use strict";
/**
 * WooCommerce Hard Gating Integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkProductVisibility = checkProductVisibility;
exports.checkCheckoutPermission = checkCheckoutPermission;
exports.calculateStakingDiscount = calculateStakingDiscount;
exports.checkExclusiveAccess = checkExclusiveAccess;
exports.getUserStakingStatus = getUserStakingStatus;
const hardStaking_1 = require("./hardStaking");
const tieredStaking_1 = require("./tieredStaking");
async function checkProductVisibility(userAddress, config) {
    const stakeInfo = await (0, hardStaking_1.getStakeInfo)(userAddress, config);
    if (!stakeInfo || stakeInfo.status !== 'Active') {
        return { visible: false, reason: 'No active stake found', tier: 0 };
    }
    if ((0, tieredStaking_1.isAccessRevoked)(stakeInfo.status)) {
        return { visible: false, reason: 'Access revoked - unstaking in progress', tier: 0 };
    }
    const amount = stakeInfo.amount / Math.pow(10, 9);
    const tier = (0, tieredStaking_1.getTierFromAmount)(amount);
    const visible = (0, tieredStaking_1.canSeeProducts)(tier);
    return {
        visible,
        reason: visible ? undefined : `Requires Tier 2 (500+ tokens), current: ${tier}`,
        tier,
    };
}
async function checkCheckoutPermission(userAddress, config) {
    const stakeInfo = await (0, hardStaking_1.getStakeInfo)(userAddress, config);
    if (!stakeInfo || stakeInfo.status !== 'Active') {
        return { allowed: false, reason: 'No active stake found', tier: 0 };
    }
    if ((0, tieredStaking_1.isAccessRevoked)(stakeInfo.status)) {
        return { allowed: false, reason: 'Access revoked - unstaking in progress', tier: 0 };
    }
    const amount = stakeInfo.amount / Math.pow(10, 9);
    const tier = (0, tieredStaking_1.getTierFromAmount)(amount);
    const allowed = (0, tieredStaking_1.canCheckout)(tier);
    return {
        allowed,
        reason: allowed ? undefined : `Requires Tier 2 (500+ tokens) for checkout`,
        tier,
    };
}
async function calculateStakingDiscount(userAddress, cartTotal, config) {
    const stakeInfo = await (0, hardStaking_1.getStakeInfo)(userAddress, config);
    if (!stakeInfo || stakeInfo.status !== 'Active' || (0, tieredStaking_1.isAccessRevoked)(stakeInfo.status)) {
        return { discount: 0, discountPercent: 0, finalTotal: cartTotal, tier: 0 };
    }
    const amount = stakeInfo.amount / Math.pow(10, 9);
    const tier = (0, tieredStaking_1.getTierFromAmount)(amount);
    const discountPercent = (0, tieredStaking_1.getDiscountForTier)(tier);
    const discount = (cartTotal * discountPercent) / 100;
    const finalTotal = Math.max(0, cartTotal - discount);
    return { discount, discountPercent, finalTotal, tier };
}
async function checkExclusiveAccess(userAddress, config) {
    const stakeInfo = await (0, hardStaking_1.getStakeInfo)(userAddress, config);
    if (!stakeInfo || stakeInfo.status !== 'Active' || (0, tieredStaking_1.isAccessRevoked)(stakeInfo.status)) {
        return { hasAccess: false, tier: 0 };
    }
    const amount = stakeInfo.amount / Math.pow(10, 9);
    const tier = (0, tieredStaking_1.getTierFromAmount)(amount);
    const hasAccess = (0, tieredStaking_1.hasExclusiveAccess)(tier);
    return { hasAccess, tier };
}
async function getUserStakingStatus(userAddress, config) {
    const stakeInfo = await (0, hardStaking_1.getStakeInfo)(userAddress, config);
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
    const tier = (0, tieredStaking_1.getTierFromAmount)(amount);
    const tierInfo = tieredStaking_1.STAKING_TIERS[tier] || tieredStaking_1.STAKING_TIERS[0];
    const accessRevoked = (0, tieredStaking_1.isAccessRevoked)(stakeInfo.status);
    return {
        isStaking: stakeInfo.status === 'Active',
        tier,
        tierName: tierInfo.name,
        stakedAmount: amount,
        canSeeProducts: (0, tieredStaking_1.canSeeProducts)(tier) && !accessRevoked,
        canCheckout: (0, tieredStaking_1.canCheckout)(tier) && !accessRevoked,
        hasExclusiveAccess: (0, tieredStaking_1.hasExclusiveAccess)(tier) && !accessRevoked,
        discountPercent: (0, tieredStaking_1.getDiscountForTier)(tier),
        accessRevoked,
        unlockTimestamp: stakeInfo.unlockTimestamp,
    };
}
