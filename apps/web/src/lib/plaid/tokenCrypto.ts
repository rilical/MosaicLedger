import 'server-only';

import crypto from 'node:crypto';

// Hackathon-grade at-rest encryption for long-lived bank tokens.
// - Deterministic behavior is NOT required here; only confidentiality.
// - Format: enc_v1.<iv_b64>.<tag_b64>.<ciphertext_b64>
// - AES-256-GCM, 12-byte IV, 16-byte auth tag.

const PLAINTEXT_PREFIX = 'enc_v1';

function getPlaidTokenKey(): Buffer {
  const raw = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('Missing PLAID_TOKEN_ENCRYPTION_KEY');

  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('PLAID_TOKEN_ENCRYPTION_KEY must be 32 bytes (base64-encoded)');
  }
  return key;
}

export function hasPlaidTokenEncryptionKey(): boolean {
  try {
    getPlaidTokenKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptPlaidAccessToken(token: string): string {
  if (!token) throw new Error('Cannot encrypt empty token');

  const key = getPlaidTokenKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    PLAINTEXT_PREFIX,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
}

export function decryptPlaidAccessToken(stored: string): string {
  if (!stored) throw new Error('Missing stored token');

  // Back-compat: allow legacy plaintext values (fixture tokens or pre-encryption rows).
  if (!stored.startsWith(`${PLAINTEXT_PREFIX}.`)) return stored;

  const parts = stored.split('.');
  if (parts.length !== 4) throw new Error('Invalid encrypted token format');

  const [, ivB64, tagB64, ctB64] = parts;
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('Invalid encrypted token format');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ctB64, 'base64');

  const key = getPlaidTokenKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}
