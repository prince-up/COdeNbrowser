import { z } from 'zod';

export const ProcessRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  action: z.enum(['ALLOW', 'WARN', 'BLOCK', 'TERMINATE_EXAM']),
  pathPatterns: z.array(z.string()).default([]),
  sha256Hashes: z.array(z.string()).default([]),
  windowTitles: z.array(z.string()).default([]),
});

export type ProcessRule = z.infer<typeof ProcessRuleSchema>;

export const URLRuleSchema = z.object({
  pattern: z.string().min(1), // e.g. "https://exam.university.edu/**", "*.moodle.org"
  action: z.enum(['ALLOW', 'BLOCK']),
  description: z.string().optional(),
  allowSubdomains: z.boolean().default(false),
  allowedMethods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']),
});

export type URLRule = z.infer<typeof URLRuleSchema>;

export const ExamConfigurationSchema = z.object({
  // Metadata & Identification
  configurationId: z.string().uuid(),
  configurationVersion: z.string().default('1.0.0'),
  examId: z.string().min(1),
  examName: z.string().min(1),
  organization: z.string().min(1),
  createdAt: z.string().datetime(),
  validUntil: z.string().datetime(),

  // Browser Requirements
  minClientVersion: z.string().default('1.0.0'),
  maxClientVersion: z.string().optional(),

  // URL & Start Target
  startURL: z.string().url(),
  allowedURLs: z.array(URLRuleSchema).default([]),
  blockedURLs: z.array(URLRuleSchema).default([]),
  allowedProtocols: z.array(z.string()).default(['https']),
  blockedProtocols: z.array(z.string()).default(['http', 'file', 'javascript', 'vbscript', 'data', 'about', 'custom']),

  // Browser Policies
  navigationPolicy: z.object({
    allowBackForward: z.boolean().default(false),
    allowReload: z.boolean().default(true),
    allowAddressBar: z.boolean().default(false),
    allowNewTabs: z.boolean().default(false),
    allowNewWindows: z.boolean().default(false),
    allowDevTools: z.boolean().default(false),
    allowInspectElement: z.boolean().default(false),
    allowViewSource: z.boolean().default(false),
  }),

  popupPolicy: z.enum(['BLOCK_ALL', 'ALLOW_SAME_DOMAIN', 'ALLOW_WHITELIST']).default('BLOCK_ALL'),
  clipboardPolicy: z.enum(['DISABLED', 'COPY_ONLY', 'PASTE_ONLY', 'FULL']).default('DISABLED'),
  downloadPolicy: z.enum(['BLOCK_ALL', 'ALLOW_WHITELIST', 'ALLOW_ALL']).default('BLOCK_ALL'),
  uploadPolicy: z.enum(['BLOCK_ALL', 'ALLOW_WHITELIST', 'ALLOW_ALL']).default('BLOCK_ALL'),
  printingPolicy: z.object({
    allowPrinting: z.boolean().default(false),
    allowedPrinters: z.array(z.string()).default([]),
  }),

  // Hardware & Device Policies
  displayPolicy: z.object({
    allowMultipleDisplays: z.boolean().default(false),
    actionOnMultipleDisplays: z.enum(['ALLOW', 'WARN', 'LOCK', 'END_SESSION']).default('LOCK'),
    actionOnDisplayChange: z.enum(['ALLOW', 'WARN', 'LOCK', 'END_SESSION']).default('LOCK'),
  }),

  screenCapturePolicy: z.object({
    enableWindowDisplayAffinity: z.boolean().default(true),
    allowScreenshots: z.boolean().default(false),
  }),

  virtualMachinePolicy: z.object({
    action: z.enum(['ALLOW', 'WARN', 'BLOCK']).default('BLOCK'),
  }),

  remoteSessionPolicy: z.object({
    action: z.enum(['ALLOW', 'WARN', 'BLOCK']).default('BLOCK'),
  }),

  mediaPermissions: z.object({
    allowCamera: z.boolean().default(false),
    allowMicrophone: z.boolean().default(false),
    allowGeolocation: z.boolean().default(false),
    allowNotifications: z.boolean().default(false),
    allowWebRTC: z.boolean().default(true),
  }),

  // Process & Application Restrictions
  processPolicy: z.object({
    defaultAction: z.enum(['ALLOW', 'WARN', 'BLOCK']).default('ALLOW'),
    rules: z.array(ProcessRuleSchema).default([]),
  }),

  // Session & Security Control
  securityProfile: z.enum(['MANAGED_DEVICE', 'BYOD']).default('BYOD'),
  heartbeatIntervalSeconds: z.number().min(3).max(60).default(10),
  networkFailurePolicy: z.object({
    action: z.enum(['CONTINUE', 'PAUSE', 'LOCK', 'TERMINATE']).default('PAUSE'),
    gracePeriodSeconds: z.number().min(5).max(600).default(60),
  }),

  // Exit Control
  quitPolicy: z.object({
    requireExitPassword: z.boolean().default(true),
    exitPasswordHash: z.string().optional(), // SHA-256 or Argon2/scrypt hashed password
    allowQuitBeforeExamStart: z.boolean().default(true),
    allowQuitAfterSubmit: z.boolean().default(true),
    exitUrl: z.string().url().optional(), // URL that triggers automated exit
  }),

  // Backend Integration
  serverEndpoint: z.string().url().optional(),
});

export type ExamConfiguration = z.infer<typeof ExamConfigurationSchema>;

export interface SignedExamConfigFile {
  format: 'SEB_CONFIG_ENCRYPTED_V1' | 'SEB_CONFIG_SIGNED_V1';
  header: {
    configurationId: string;
    examId: string;
    algorithm: 'Ed25519';
    createdAt: string;
    validUntil: string;
    keyId: string;
  };
  signature: string; // Base64 signature
  publicKey: string; // Base64 Ed25519 public key
  payload: ExamConfiguration | string; // Plain configuration or Base64 AES-256-GCM ciphertext
  encryption?: {
    algorithm: 'AES-256-GCM';
    iv: string; // Base64 12 bytes
    authTag: string; // Base64 16 bytes
    keyDerivation?: 'PBKDF2-SHA256' | 'SCRYPT';
    salt?: string;
  };
}
