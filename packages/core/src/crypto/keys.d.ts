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
export declare function generateEd25519KeyPair(): KeyPairResult;
/**
 * Compute SHA-256 hash of a string or buffer
 */
export declare function sha256Hex(data: string | Buffer): string;
/**
 * Compute SHA-256 hash formatted in Base64
 */
export declare function sha256Base64(data: string | Buffer): string;
//# sourceMappingURL=keys.d.ts.map