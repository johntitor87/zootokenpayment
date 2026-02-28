/**
 * /api/zoo/* routes – ZOO payment verification
 */

import { Router } from 'express';
import { loadConfig } from '../utils/config';
import { verifyZooPayment } from '../utils/solana/verifyZooPayment';
import { verifyMessageSignature } from '../utils/solana/verifyMessageSignature';

const router = Router();

const ORDER_MESSAGE_PREFIX = 'Authorize transaction for order #';

router.post('/verify-payment', async (req, res) => {
  try {
    const { order_id, signature, payer_wallet, amount_zoo, signed_message, signed_message_pubkey } = req.body;

    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid signature' });
    }
    const amountZooNum = typeof amount_zoo === 'number' ? amount_zoo : parseFloat(amount_zoo);
    if (!Number.isFinite(amountZooNum) || amountZooNum <= 0) {
      return res.status(400).json({ success: false, error: 'Missing or invalid amount_zoo' });
    }

    if (signed_message != null && signed_message_pubkey != null) {
      const msg = ORDER_MESSAGE_PREFIX + String(order_id ?? '');
      const sig = typeof signed_message === 'string' ? signed_message : '';
      const pubkey = typeof signed_message_pubkey === 'string' ? signed_message_pubkey : '';
      if (!sig || !pubkey) {
        return res.status(400).json({ success: false, error: 'Invalid signed_message or signed_message_pubkey' });
      }
      if (!verifyMessageSignature(pubkey, msg, sig)) {
        return res.status(400).json({ success: false, error: 'Message signature verification failed' });
      }
      if (payer_wallet && pubkey !== payer_wallet) {
        return res.status(400).json({ success: false, error: 'Message signer does not match payer wallet' });
      }
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
