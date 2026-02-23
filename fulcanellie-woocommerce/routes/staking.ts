/**
 * /api/staking/* routes
 */

import { Router } from 'express';
import { loadConfig } from '../utils/config';
import {
  getUserStakingStatus,
  checkProductVisibility,
  checkCheckoutPermission,
  calculateStakingDiscount,
  checkExclusiveAccess,
} from '../utils/solana/woocommerceHardGate';
import * as hardStaking from '../utils/solana/hardStaking';

const router = Router();

router.get('/status', async (req, res) => {
  try {
    const { user_address } = req.query;
    if (!user_address || typeof user_address !== 'string') {
      return res.status(400).json({ error: 'Missing user_address parameter' });
    }
    const config = loadConfig();
    const status = await getUserStakingStatus(user_address, config);
    res.json({ success: true, status });
  } catch (error: unknown) {
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
    const config = loadConfig();
    const visibility = await checkProductVisibility(user_address, config);
    res.json({
      success: true,
      visible: visibility.visible,
      reason: visibility.reason,
      tier: visibility.tier,
    });
  } catch (error: unknown) {
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
    const config = loadConfig();
    const permission = await checkCheckoutPermission(user_address, config);
    res.json({
      success: true,
      allowed: permission.allowed,
      reason: permission.reason,
      tier: permission.tier,
    });
  } catch (error: unknown) {
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
    const cartTotal = parseFloat((cart_total as string) || '0') || 0;
    const config = loadConfig();
    const discount = await calculateStakingDiscount(user_address, cartTotal, config);
    res.json({
      success: true,
      discount: discount.discount,
      discountPercent: discount.discountPercent,
      finalTotal: discount.finalTotal,
      tier: discount.tier,
    });
  } catch (error: unknown) {
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
    const config = loadConfig();
    const access = await checkExclusiveAccess(user_address, config);
    res.json({
      success: true,
      hasAccess: access.hasAccess,
      tier: access.tier,
    });
  } catch (error: unknown) {
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
    const config = loadConfig();
    const signature = await hardStaking.stakeTokens(amount, config, user_address);
    res.json({ success: true, signature });
  } catch (error: unknown) {
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
    const config = loadConfig();
    const signature = await hardStaking.requestUnstake(config, user_address);
    res.json({
      success: true,
      signature,
      message: 'Unstake requested. Access revoked immediately. Tokens unlock in 2 days.',
    });
  } catch (error: unknown) {
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
    const config = loadConfig();
    const signature = await hardStaking.completeUnstake(config, user_address);
    res.json({
      success: true,
      signature,
      message: 'Unstake completed. Tokens returned.',
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
