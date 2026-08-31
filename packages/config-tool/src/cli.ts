#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from 'commander';
import {
  generateEd25519KeyPair,
  signExamConfiguration,
  verifySignedConfiguration,
  encryptAndSignExamConfiguration,
  decryptExamConfiguration,
  type ExamConfiguration,
  type SignedExamConfigFile,
} from '@seb/core';
import { ExamConfigBuilder } from './generator/builder.js';

const program = new Command();

program
  .name('seb-config')
  .description('Secure Exam Browser Administrator Configuration & Key Management Tool')
  .version('1.0.0');

// Key generation command
program
  .command('keygen')
  .description('Generate Ed25519 asymmetric keypair for digital signing')
  .option('-o, --out <dir>', 'Output directory for keys', '.')
  .option('-n, --name <name>', 'Key file prefix name', 'university-exam-key')
  .action((options) => {
    const keyPair = generateEd25519KeyPair();
    const outDir = path.resolve(process.cwd(), options.out);

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const privPath = path.join(outDir, `${options.name}.priv.pem`);
    const pubPath = path.join(outDir, `${options.name}.pub.pem`);

    fs.writeFileSync(privPath, keyPair.privateKeyPem, 'utf8');
    fs.writeFileSync(pubPath, keyPair.publicKeyPem, 'utf8');

    console.log('✅ Generated Ed25519 Signing Keypair successfully!');
    console.log(`🔑 Key ID: ${keyPair.keyId}`);
    console.log(`📄 Private Key: ${privPath}`);
    console.log(`📄 Public Key:  ${pubPath}`);
  });

// Create and export signed config command
program
  .command('create')
  .description('Create and digitally sign a new .examconfig file')
  .requiredOption('-e, --exam-id <id>', 'Exam ID (e.g. CS-101-FINAL)')
  .requiredOption('-n, --name <name>', 'Exam title name')
  .requiredOption('-u, --url <url>', 'Examination start URL (HTTPS required)')
  .requiredOption('-k, --key <path>', 'Path to Ed25519 private key PEM')
  .option('-p, --pub-key <path>', 'Path to Ed25519 public key PEM')
  .option('-o, --output <file>', 'Output .examconfig file path', 'exam.examconfig')
  .option('--org <org>', 'Issuing university/organization name', 'University Academic Board')
  .option('--hours <hours>', 'Validity duration in hours', '4')
  .option('--password <password>', 'Optional exit password (default: AdminExit2026!)', 'AdminExit2026!')
  .option('--server <url>', 'Exam server backend URL')
  .action((options) => {
    const builder = new ExamConfigBuilder(options.examId, options.name, options.url, options.org);
    builder.setValidityHours(Number(options.hours) || 4);
    builder.setExitPassword(options.password);

    if (options.server) {
      builder.setServerEndpoint(options.server);
    }

    const config = builder.build();

    const privKeyPem = fs.readFileSync(path.resolve(options.key), 'utf8');
    let pubKeyPem = '';
    if (options.pubKey) {
      pubKeyPem = fs.readFileSync(path.resolve(options.pubKey), 'utf8');
    } else {
      // derive public key from private key
      const kp = generateEd25519KeyPair();
      pubKeyPem = kp.publicKeyPem;
    }

    const keyId = config.configurationId.substring(0, 16);
    const signed = signExamConfiguration(config, privKeyPem, pubKeyPem, keyId);

    const outPath = path.resolve(options.output);
    fs.writeFileSync(outPath, JSON.stringify(signed, null, 2), 'utf8');

    console.log(`✅ Created and digitally signed configuration: ${outPath}`);
    console.log(`🎯 Start URL: ${config.startURL}`);
    console.log(`⏳ Valid Until: ${config.validUntil}`);
  });

// Verify command
program
  .command('verify')
  .description('Verify cryptographic signature and integrity of a .examconfig file')
  .argument('<file>', 'Path to .examconfig file')
  .option('-k, --pub-key <path>', 'Path to trusted public key PEM (optional)')
  .action((file, options) => {
    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const signed: SignedExamConfigFile = JSON.parse(raw);

    let pubKeyPem: string | undefined;
    if (options.pubKey) {
      pubKeyPem = fs.readFileSync(path.resolve(options.pubKey), 'utf8');
    }

    const result = verifySignedConfiguration(signed, pubKeyPem);

    if (result.valid && result.config) {
      console.log('✅ Configuration cryptographic signature is VALID!');
      console.log(`📋 Exam ID: ${result.config.examId} (${result.config.examName})`);
      console.log(`🏛️ Organization: ${result.config.organization}`);
      console.log(`🌐 Start URL: ${result.config.startURL}`);
      console.log(`🔒 Security Profile: ${result.config.securityProfile}`);
      console.log(`⏰ Expiry: ${result.config.validUntil}`);
    } else {
      console.error(`❌ Signature Verification FAILED: ${result.error}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
