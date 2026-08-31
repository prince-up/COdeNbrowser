import type { ExamConfiguration, SignedExamConfigFile } from '../config/schema.js';
/**
 * Digitally sign an ExamConfiguration object with an Ed25519 private key
 */
export declare function signExamConfiguration(config: ExamConfiguration, privateKeyPem: string, publicKeyPem: string, keyId: string): SignedExamConfigFile;
export interface VerificationResult {
    valid: boolean;
    error?: string;
    config?: ExamConfiguration;
    isExpired?: boolean;
}
/**
 * Verify digital signature of a SignedExamConfigFile
 */
export declare function verifySignedConfiguration(signedFile: SignedExamConfigFile, trustedPublicKeyPem?: string): VerificationResult;
//# sourceMappingURL=signer.d.ts.map