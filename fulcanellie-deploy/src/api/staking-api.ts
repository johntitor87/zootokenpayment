/**
 * Staking API Endpoints for WooCommerce
 * 
 * Backend API that WooCommerce calls to check staking status
 */

import express from 'express';
import {
  getUserStakingStatus,
  checkProductVisibility,
  checkCheckoutPermission,
  calculateStakingDiscount,
  checkExclusiveAccess,
} from '../solana/woocommerceHardGate';
import { verifyZooPayment } from '../solana/verifyZooPayment';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
app.use(express.json());

// Load config
function loadConfig() {
  const configPath = path.join(process.cwd(), 'staking-config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('staking-config.json not found');
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

/**
 * GET /api/staking/status
 * Get user's staking status (for WooCommerce)
 */
app.get('/api/staking/status', async (req, res) => {
  try {
    const { user_address } = req.query;

    if (!user_address || typeof user_address !== 'string') {
      return res.status(400).json({ error: 'Missing user_address parameter' });
    }

    const config = loadConfig();
    const status = await getUserStakingStatus(user_address, config);

    res.json({
      success: true,
      status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/staking/visibility
 * Check product visibility (Tier 2+)
 */
app.get('/api/staking/visibility', async (req, res) => {
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/staking/checkout
 * Check checkout permission (Tier 2+)
 */
app.get('/api/staking/checkout', async (req, res) => {
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/staking/discount
 * Calculate discount for cart
 */
app.get('/api/staking/discount', async (req, res) => {
  try {
    const { user_address, cart_total } = req.query;

    if (!user_address || typeof user_address !== 'string') {
      return res.status(400).json({ error: 'Missing user_address' });
    }

    const cartTotal = parseFloat(cart_total as string) || 0;
    const config = loadConfig();
    const discount = await calculateStakingDiscount(user_address, cartTotal, config);

    res.json({
      success: true,
      discount: discount.discount,
      discountPercent: discount.discountPercent,
      finalTotal: discount.finalTotal,
      tier: discount.tier,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/staking/exclusive
 * Check exclusive product access (Tier 3)
 */
app.get('/api/staking/exclusive', async (req, res) => {
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/staking/stake
 * Stake tokens (backend only)
 */
app.post('/api/staking/stake', async (req, res) => {
  try {
    const { user_address, amount } = req.body;

    if (!user_address || !amount) {
      return res.status(400).json({ error: 'Missing user_address or amount' });
    }

    const config = loadConfig();
    const { stakeTokens } = await import('../solana/hardStaking');
    
    const signature = await stakeTokens(amount, config, user_address);

    res.json({
      success: true,
      signature,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/staking/request-unstake
 * Request unstake (starts 2-day lock)
 */
app.post('/api/staking/request-unstake', async (req, res) => {
  try {
    const { user_address } = req.body;

    if (!user_address) {
      return res.status(400).json({ error: 'Missing user_address' });
    }

    const config = loadConfig();
    const { requestUnstake } = await import('../solana/hardStaking');
    
    const signature = await requestUnstake(config, user_address);

    res.json({
      success: true,
      signature,
      message: 'Unstake requested. Access revoked immediately. Tokens unlock in 2 days.',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/staking/complete-unstake
 * Complete unstake (after 2-day lock)
 */
app.post('/api/staking/complete-unstake', async (req, res) => {
  try {
    const { user_address } = req.body;

    if (!user_address) {
      return res.status(400).json({ error: 'Missing user_address' });
    }

    const config = loadConfig();
    const { completeUnstake } = await import('../solana/hardStaking');
    
    const signature = await completeUnstake(config, user_address);

    res.json({
      success: true,
      signature,
      message: 'Unstake completed. Tokens returned.',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/zoo/verify-payment
 * Verify a Solana tx is a ZOO transfer to the store; used by WooCommerce ZOO payment gateway.
 * Body: { order_id, signature, payer_wallet, amount_zoo }
 */
app.post('/api/zoo/verify-payment', async (req, res) => {
  try {
    const { order_id, signature, payer_wallet, amount_zoo } = req.body;

    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid signature' });
    }
    const amountZooNum = typeof amount_zoo === 'number' ? amount_zoo : parseFloat(amount_zoo);
    if (!Number.isFinite(amountZooNum) || amountZooNum <= 0) {
      return res.status(400).json({ success: false, error: 'Missing or invalid amount_zoo' });
    }

    const config = loadConfig();
    const storeWallet = config.zooStoreWallet || config.zoo_store_wallet;
    const mintAddress = config.mintAddress || config.zooMintAddress;

    if (!storeWallet || !mintAddress) {
      return res.status(500).json({ success: false, error: 'Server config missing zooStoreWallet or mintAddress' });
    }

    const result = await verifyZooPayment({
      signature,
      storeWallet,
      mintAddress,
      amountZoo: amountZooNum,
      payerWallet: payer_wallet,
      network: config.network || 'devnet',
    });

    if (!result.ok) {
      console.error('ZOO payment verification failed:', {
        order_id,
        signature,
        payer_wallet,
        amount_zoo,
        storeWallet,
        mintAddress,
        error: result.error,
      });
      return res.status(400).json({ success: false, error: result.error });
    }

    console.log('ZOO payment verified:', { order_id, signature, payer_wallet, amount_zoo });
    res.json({ success: true, signature: result.signature, order_id: order_id || null });
  } catch (error: any) {
    console.error('ZOO payment verification exception:', error);
    res.status(500).json({ success: false, error: error?.message || 'Verification failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Staking API server running on port ${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /api/staking/status?user_address=<address>`);
  console.log(`  GET  /api/staking/visibility?user_address=<address>`);
  console.log(`  GET  /api/staking/checkout?user_address=<address>`);
  console.log(`  GET  /api/staking/discount?user_address=<address>&cart_total=<amount>`);
  console.log(`  GET  /api/staking/exclusive?user_address=<address>`);
  console.log(`  POST /api/staking/stake`);
  console.log(`  POST /api/staking/request-unstake`);
  console.log(`  POST /api/staking/complete-unstake`);
  console.log(`  POST /api/zoo/verify-payment`);
});

export default app;

