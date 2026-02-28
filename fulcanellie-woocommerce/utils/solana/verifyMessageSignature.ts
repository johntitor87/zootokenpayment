/**
 * Verify an Ed25519 message signature (e.g. Phantom signMessage).
 * Uses @solana/web3.js PublicKey and tweetnacl.
 */

import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Decode signature from base64 or base58 string to Uint8Array (64 bytes for Ed25519).
 */
function signatureToBytes(signature: string): Uint8Array | null {
  if (typeof signature !== 'string' || !signature) return null;
  try {
    const base64 = Buffer.from(signature, 'base64');
    if (base64.length === 64) return new Uint8Array(base64);
  } catch {
    // not base64
  }
  try {
    const decoded = bs58.decode(signature);
    if (decoded.length === 64) return decoded;
  } catch {
    // not base58 or wrong length
  }
  return null;
}

/**
 * Verify that a message was signed by the given public key (Ed25519).
 * @param publicKeyStr - Base58 public key string
 * @param message - Raw message string (same as signed on the client)
 * @param signature - Signature as base64 or base58 string
 * @returns true if the signature is valid
 */
export function verifyMessageSignature(
  publicKeyStr: string,
  message: string,
  signature: string
): boolean {
  const pubKey = new PublicKey(publicKeyStr).toBytes();
  const messageBytes = new TextEncoder().encode(message);
  const sigBytes = signatureToBytes(signature);
  if (!sigBytes || sigBytes.length !== 64) return false;
  return nacl.sign.detached.verify(messageBytes, sigBytes, pubKey);
}
