/**
 * /api/zoo/* routes – ZOO payment verification
 */

import { Router } from 'express';
import { loadConfig } from '../utils/config';
import { verifyZooPayment } from '../utils/solana/verifyZooPayment';

const router = Router();

router.post('/verify-payment', async (req, res) => {
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
    const storeWallet = config.zooStoreWallet || (config as Record<string, string>).zoo_store_wallet;
    const mintAddress = config.mintAddress || (config as Record<string, string>).zooMintAddress;

    if (!storeWallet || !mintAddress) {
      return res.status(500).json({ success: false, error: 'Server config missing zooStoreWallet or mintAddress' });
    }

    const result = await verifyZooPayment({
      signature,
      storeWallet,
      mintAddress,
      amountZoo: amountZooNum,
      payerWallet: payer_wallet,
      network: (config.network as 'devnet' | 'mainnet') || 'devnet',
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
    res.json({ success: true, signature: result.signature, order_id: order_id ?? null });
  } catch (error: unknown) {
    console.error('ZOO payment verification exception:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    });
  }
});

export default router;
