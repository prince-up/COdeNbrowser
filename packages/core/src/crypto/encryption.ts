import * as crypto from 'node:crypto';
import { canonicalizeJson } from '../config/canonical.js';
import type { ExamConfiguration, SignedExamConfigFile } from '../config/schema.js';
import { signExamConfiguration } from './signer.js';

export interface EncryptionOptions {
  password?: string;
  symmetricKey?: Buffer; // 32 bytes
  privateKeyPem: string;
  publicKeyPem: string;
  keyId: string;
}

/**
 * Derive a 256-bit encryption key using PBKDF2 with SHA-256
 */
export function deriveKeyFromPassword(password: string, salt: Buffer, iterations = 100_000): Buffer {
  return crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
}

/**
 * Encrypt and sign an ExamConfiguration
 */
export function encryptAndSignExamConfiguration(
  config: ExamConfiguration,
  options: EncryptionOptions
): SignedExamConfigFile {
  // First generate signed base object
  const signed = signExamConfiguration(config, options.privateKeyPem, options.publicKeyPem, options.keyId);

  // Derive or use key
  let encKey: Buffer;
  let salt: Buffer | undefined;
  if (options.password) {
    salt = crypto.randomBytes(16);
    encKey = deriveKeyFromPassword(options.password, salt);
  } else if (options.symmetricKey) {
    encKey = options.symmetricKey;
  } else {
    throw new Error('Either password or symmetricKey must be provided for encryption');
  }

  const iv = crypto.randomBytes(12); // 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);

  const plainText = canonicalizeJson(config);
  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return {
    format: 'SEB_CONFIG_ENCRYPTED_V1',
    header: signed.header,
    signature: signed.signature,
    publicKey: signed.publicKey,
    payload: encrypted,
    encryption: {
      algorithm: 'AES-256-GCM',
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyDerivation: salt ? 'PBKDF2-SHA256' : undefined,
      salt: salt ? salt.toString('base64') : undefined,
    },
  };
}

/**
 * Decrypt an encrypted SignedExamConfigFile
 */
export function decryptExamConfiguration(
  file: SignedExamConfigFile,
  password?: string,
  symmetricKey?: Buffer
): ExamConfiguration {
  if (file.format !== 'SEB_CONFIG_ENCRYPTED_V1' || !file.encryption) {
    throw new Error('File is not in encrypted SEB config format');
  }

  let decKey: Buffer;
  if (password && file.encryption.salt) {
    const salt = Buffer.from(file.encryption.salt, 'base64');
    decKey = deriveKeyFromPassword(password, salt);
  } else if (symmetricKey) {
    decKey = symmetricKey;
  } else {
    throw new Error('Valid decryption password or key must be provided');
  }

  const iv = Buffer.from(file.encryption.iv, 'base64');
  const authTag = Buffer.from(file.encryption.authTag, 'base64');
  const ciphertext = file.payload as string;

  const decipher = crypto.createDecipheriv('aes-256-gcm', decKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted) as ExamConfiguration;
}
