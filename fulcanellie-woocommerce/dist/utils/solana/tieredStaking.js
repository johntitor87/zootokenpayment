"use strict";
/**
 * Tiered Staking System with Hard Gating
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_STAKE_FOR_MAIN_PERKS = exports.STAKING_TIERS = void 0;
exports.getTierFromAmount = getTierFromAmount;
exports.hasMainPerks = hasMainPerks;
exports.getDiscountForTier = getDiscountForTier;
exports.canSeeProducts = canSeeProducts;
exports.canCheckout = canCheckout;
exports.hasExclusiveAccess = hasExclusiveAccess;
exports.isAccessRevoked = isAccessRevoked;
exports.STAKING_TIERS = [
    { tier: 0, name: 'No Access', minTokens: 0, perks: [] },
    { tier: 1, name: 'Base Access', minTokens: 250, perks: ['Basic discounts (5%)'] },
    { tier: 2, name: 'Full Access', minTokens: 500, perks: ['Full product visibility', 'Standard discounts (10%)'] },
    { tier: 3, name: 'Premium Access', minTokens: 1000, perks: ['Larger discounts (20%)', 'Exclusive products'] },
];
exports.MIN_STAKE_FOR_MAIN_PERKS = 500;
function getTierFromAmount(amount) {
    if (amount >= 1000)
        return 3;
    if (amount >= 500)
        return 2;
    if (amount >= 250)
        return 1;
    return 0;
}
function hasMainPerks(amount) {
    return amount >= exports.MIN_STAKE_FOR_MAIN_PERKS;
}
function getDiscountForTier(tier) {
    switch (tier) {
        case 3: return 20;
        case 2: return 10;
        case 1: return 5;
        default: return 0;
    }
}
function canSeeProducts(tier) {
    return tier >= 2;
}
function canCheckout(tier) {
    return tier >= 2;
}
function hasExclusiveAccess(tier) {
    return tier >= 3;
}
function isAccessRevoked(status) {
    return status === 'Unstaking' || status === 'Unstaked';
}
