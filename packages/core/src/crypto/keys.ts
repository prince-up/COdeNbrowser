import * as crypto from 'node:crypto';

export interface KeyPairResult {
  publicKeyPem: string;
  privateKeyPem: string;
  publicKeyBase64: string;
  privateKeyBase64: string;
  keyId: string;
}

/**
 * Generate a cryptographically secure Ed25519 asymmetric keypair
 */
export function generateEd25519KeyPair(): KeyPairResult {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const rawPub = crypto.createPublicKey(publicKey).export({ type: 'spki', format: 'der' });
  const rawPriv = crypto.createPrivateKey(privateKey).export({ type: 'pkcs8', format: 'der' });

  const publicKeyBase64 = rawPub.toString('base64');
  const privateKeyBase64 = rawPriv.toString('base64');

  // Key ID is SHA-256 fingerprint of the public DER (first 16 hex chars)
  const keyId = crypto.createHash('sha256').update(rawPub).digest('hex').substring(0, 16);

  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    publicKeyBase64,
    privateKeyBase64,
    keyId,
  };
}

/**
 * Compute SHA-256 hash of a string or buffer
 */
export function sha256Hex(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Compute SHA-256 hash formatted in Base64
 */
export function sha256Base64(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('base64');
}
