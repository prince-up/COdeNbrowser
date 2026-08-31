import type { ExamConfiguration, SignedExamConfigFile } from '../config/schema.js';
export interface EncryptionOptions {
    password?: string;
    symmetricKey?: Buffer;
    privateKeyPem: string;
    publicKeyPem: string;
    keyId: string;
}
/**
 * Derive a 256-bit encryption key using PBKDF2 with SHA-256
 */
export declare function deriveKeyFromPassword(password: string, salt: Buffer, iterations?: number): Buffer;
/**
 * Encrypt and sign an ExamConfiguration
 */
export declare function encryptAndSignExamConfiguration(config: ExamConfiguration, options: EncryptionOptions): SignedExamConfigFile;
/**
 * Decrypt an encrypted SignedExamConfigFile
 */
export declare function decryptExamConfiguration(file: SignedExamConfigFile, password?: string, symmetricKey?: Buffer): ExamConfiguration;
//# sourceMappingURL=encryption.d.ts.map