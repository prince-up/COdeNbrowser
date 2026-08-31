import * as crypto from 'node:crypto';
import { canonicalizeJson } from '../config/canonical.js';
/**
 * Digitally sign an ExamConfiguration object with an Ed25519 private key
 */
export function signExamConfiguration(config, privateKeyPem, publicKeyPem, keyId) {
    const canonicalData = canonicalizeJson(config);
    const dataBuffer = Buffer.from(canonicalData, 'utf8');
    // Sign data buffer with Ed25519
    const signatureBuffer = crypto.sign(null, dataBuffer, privateKeyPem);
    const signatureBase64 = signatureBuffer.toString('base64');
    const pubDer = crypto.createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' });
    const publicKeyBase64 = pubDer.toString('base64');
    return {
        format: 'SEB_CONFIG_SIGNED_V1',
        header: {
            configurationId: config.configurationId,
            examId: config.examId,
            algorithm: 'Ed25519',
            createdAt: config.createdAt,
            validUntil: config.validUntil,
            keyId,
        },
        signature: signatureBase64,
        publicKey: publicKeyBase64,
        payload: config,
    };
}
/**
 * Verify digital signature of a SignedExamConfigFile
 */
export function verifySignedConfiguration(signedFile, trustedPublicKeyPem) {
    try {
        if (signedFile.format !== 'SEB_CONFIG_SIGNED_V1') {
            return { valid: false, error: `Unsupported configuration format: ${signedFile.format}` };
        }
        if (typeof signedFile.payload !== 'object' || signedFile.payload === null) {
            return { valid: false, error: 'Expected object payload for signed configuration' };
        }
        const config = signedFile.payload;
        // Verify expiry timestamp against current time
        const now = new Date();
        const expiry = new Date(signedFile.header.validUntil);
        if (now > expiry) {
            return {
                valid: false,
                error: `Configuration expired on ${expiry.toISOString()}`,
                isExpired: true,
            };
        }
        const canonicalData = canonicalizeJson(config);
        const dataBuffer = Buffer.from(canonicalData, 'utf8');
        const signatureBuffer = Buffer.from(signedFile.signature, 'base64');
        // Use trusted key if provided; otherwise reconstruct public key from file
        let verifyKey;
        if (trustedPublicKeyPem) {
            verifyKey = crypto.createPublicKey(trustedPublicKeyPem);
        }
        else {
            const pubDer = Buffer.from(signedFile.publicKey, 'base64');
            verifyKey = crypto.createPublicKey({ key: pubDer, format: 'der', type: 'spki' });
        }
        const isVerified = crypto.verify(null, dataBuffer, verifyKey, signatureBuffer);
        if (!isVerified) {
            return { valid: false, error: 'Digital signature verification failed. Configuration may have been tampered with.' };
        }
        return { valid: true, config };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { valid: false, error: `Signature verification exception: ${message}` };
    }
}
//# sourceMappingURL=signer.js.map