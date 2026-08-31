import { describe, it, expect } from 'vitest';
import { ExamConfigBuilder } from '../generator/builder.js';
import { generateEd25519KeyPair, signExamConfiguration, verifySignedConfiguration } from '@seb/core';

describe('@seb/config-tool Builder & Generator Tests', () => {
  it('builds standard exam configuration with secure defaults', () => {
    const builder = new ExamConfigBuilder('BIO-101', 'Introductory Biology', 'https://exam.biology.edu/quiz/1', 'State University');
    builder.setValidityHours(3);
    builder.setExitPassword('SecretExit999');
    builder.addAllowedURL('https://biology-assets.edu/**', false);
    builder.setClipboardMode('DISABLED');

    const config = builder.build();

    expect(config.examId).toBe('BIO-101');
    expect(config.allowedURLs.length).toBeGreaterThanOrEqual(2);
    expect(config.clipboardPolicy).toBe('DISABLED');
    expect(config.processPolicy.rules.length).toBeGreaterThanOrEqual(10);
    expect(config.screenCapturePolicy.enableWindowDisplayAffinity).toBe(true);
    expect(config.virtualMachinePolicy.action).toBe('BLOCK');
  });

  it('generates, signs and verifies config through builder pipeline', () => {
    const builder = new ExamConfigBuilder('CHEM-300', 'Organic Chemistry', 'https://exam.chem.edu/start');
    const config = builder.build();

    const keys = generateEd25519KeyPair();
    const signed = signExamConfiguration(config, keys.privateKeyPem, keys.publicKeyPem, keys.keyId);

    const verification = verifySignedConfiguration(signed, keys.publicKeyPem);
    expect(verification.valid).toBe(true);
    expect(verification.config?.examName).toBe('Organic Chemistry');
  });
});
