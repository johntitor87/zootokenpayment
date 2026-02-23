"use strict";
/**
 * /api/staking/* routes
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
const express_1 = require("express");
const config_1 = require("../utils/config");
const woocommerceHardGate_1 = require("../utils/solana/woocommerceHardGate");
const hardStaking = __importStar(require("../utils/solana/hardStaking"));
const router = (0, express_1.Router)();
router.get('/status', async (req, res) => {
    try {
        const { user_address } = req.query;
        if (!user_address || typeof user_address !== 'string') {
            return res.status(400).json({ error: 'Missing user_address parameter' });
        }
        const config = (0, config_1.loadConfig)();
        const status = await (0, woocommerceHardGate_1.getUserStakingStatus)(user_address, config);
        res.json({ success: true, status });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
router.get('/visibility', async (req, res) => {
    try {
        const { user_address } = req.query;
        if (!user_address || typeof user_address !== 'string') {
            return res.status(400).json({ error: 'Missing user_address' });
        }
        const config = (0, config_1.loadConfig)();
        const visibility = await (0, woocommerceHardGate_1.checkProductVisibility)(user_address, config);
        res.json({
            success: true,
            visible: visibility.visible,
            reason: visibility.reason,
            tier: visibility.tier,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
router.get('/checkout', async (req, res) => {
    try {
        const { user_address } = req.query;
        if (!user_address || typeof user_address !== 'string') {
            return res.status(400).json({ error: 'Missing user_address' });
        }
        const config = (0, config_1.loadConfig)();
        const permission = await (0, woocommerceHardGate_1.checkCheckoutPermission)(user_address, config);
        res.json({
            success: true,
            allowed: permission.allowed,
            reason: permission.reason,
            tier: permission.tier,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
router.get('/discount', async (req, res) => {
    try {
        const { user_address, cart_total } = req.query;
        if (!user_address || typeof user_address !== 'string') {
            return res.status(400).json({ error: 'Missing user_address' });
        }
        const cartTotal = parseFloat(cart_total || '0') || 0;
        const config = (0, config_1.loadConfig)();
        const discount = await (0, woocommerceHardGate_1.calculateStakingDiscount)(user_address, cartTotal, config);
        res.json({
            success: true,
            discount: discount.discount,
            discountPercent: discount.discountPercent,
            finalTotal: discount.finalTotal,
            tier: discount.tier,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
router.get('/exclusive', async (req, res) => {
    try {
        const { user_address } = req.query;
        if (!user_address || typeof user_address !== 'string') {
            return res.status(400).json({ error: 'Missing user_address' });
        }
        const config = (0, config_1.loadConfig)();
        const access = await (0, woocommerceHardGate_1.checkExclusiveAccess)(user_address, config);
        res.json({
            success: true,
            hasAccess: access.hasAccess,
            tier: access.tier,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
router.post('/stake', async (req, res) => {
    try {
        const { user_address, amount } = req.body;
        if (!user_address || !amount) {
            return res.status(400).json({ error: 'Missing user_address or amount' });
        }
        const config = (0, config_1.loadConfig)();
        const signature = await hardStaking.stakeTokens(amount, config, user_address);
        res.json({ success: true, signature });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
router.post('/request-unstake', async (req, res) => {
    try {
        const { user_address } = req.body;
        if (!user_address) {
            return res.status(400).json({ error: 'Missing user_address' });
        }
        const config = (0, config_1.loadConfig)();
        const signature = await hardStaking.requestUnstake(config, user_address);
        res.json({
            success: true,
            signature,
            message: 'Unstake requested. Access revoked immediately. Tokens unlock in 2 days.',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
router.post('/complete-unstake', async (req, res) => {
    try {
        const { user_address } = req.body;
        if (!user_address) {
            return res.status(400).json({ error: 'Missing user_address' });
        }
        const config = (0, config_1.loadConfig)();
        const signature = await hardStaking.completeUnstake(config, user_address);
        res.json({
            success: true,
            signature,
            message: 'Unstake completed. Tokens returned.',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.default = router;
