import * as crypto from 'node:crypto';
import type { ExamConfiguration, URLRule, ProcessRule } from '@seb/core';
import { sha256Hex } from '@seb/core';

export class ExamConfigBuilder {
  private config: ExamConfiguration;

  constructor(examId: string, examName: string, startURL: string, organization = 'University Examination Board') {
    const now = new Date();
    const expiry = new Date(now.getTime() + 4 * 3600 * 1000); // 4 hours default

    this.config = {
      configurationId: crypto.randomUUID(),
      configurationVersion: '1.0.0',
      examId,
      examName,
      organization,
      createdAt: now.toISOString(),
      validUntil: expiry.toISOString(),
      minClientVersion: '1.0.0',
      startURL,
      allowedURLs: [
        {
          pattern: `${new URL(startURL).origin}/**`,
          action: 'ALLOW',
          allowSubdomains: true,
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
        },
      ],
      blockedURLs: [],
      allowedProtocols: ['https'],
      blockedProtocols: ['http', 'file', 'javascript', 'vbscript', 'data', 'about', 'custom'],
      navigationPolicy: {
        allowBackForward: false,
        allowReload: true,
        allowAddressBar: false,
        allowNewTabs: false,
        allowNewWindows: false,
        allowDevTools: false,
        allowInspectElement: false,
        allowViewSource: false,
      },
      popupPolicy: 'BLOCK_ALL',
      clipboardPolicy: 'DISABLED',
      downloadPolicy: 'BLOCK_ALL',
      uploadPolicy: 'BLOCK_ALL',
      printingPolicy: {
        allowPrinting: false,
        allowedPrinters: [],
      },
      displayPolicy: {
        allowMultipleDisplays: false,
        actionOnMultipleDisplays: 'LOCK',
        actionOnDisplayChange: 'LOCK',
      },
      screenCapturePolicy: {
        enableWindowDisplayAffinity: true,
        allowScreenshots: false,
      },
      virtualMachinePolicy: {
        action: 'BLOCK',
      },
      remoteSessionPolicy: {
        action: 'BLOCK',
      },
      mediaPermissions: {
        allowCamera: false,
        allowMicrophone: false,
        allowGeolocation: false,
        allowNotifications: false,
        allowWebRTC: true,
      },
      processPolicy: {
        defaultAction: 'ALLOW',
        rules: this.getDefaultBlockedProcesses(),
      },
      securityProfile: 'BYOD',
      heartbeatIntervalSeconds: 10,
      networkFailurePolicy: {
        action: 'PAUSE',
        gracePeriodSeconds: 60,
      },
      quitPolicy: {
        requireExitPassword: true,
        exitPasswordHash: sha256Hex('AdminExit2026!'), // Default template exit password
        allowQuitBeforeExamStart: true,
        allowQuitAfterSubmit: true,
      },
    };
  }

  public setValidityHours(hours: number): this {
    const start = new Date(this.config.createdAt);
    this.config.validUntil = new Date(start.getTime() + hours * 3600 * 1000).toISOString();
    return this;
  }

  public setExitPassword(plainPassword: string): this {
    this.config.quitPolicy.requireExitPassword = true;
    this.config.quitPolicy.exitPasswordHash = sha256Hex(plainPassword);
    return this;
  }

  public addAllowedURL(pattern: string, allowSubdomains = false): this {
    this.config.allowedURLs.push({
      pattern,
      action: 'ALLOW',
      allowSubdomains,
      allowedMethods: ['GET', 'POST', 'HEAD'],
    });
    return this;
  }

  public addBlockedURL(pattern: string, description?: string): this {
    this.config.blockedURLs.push({
      pattern,
      action: 'BLOCK',
      allowSubdomains: true,
      description,
      allowedMethods: [],
    });
    return this;
  }

  public setClipboardMode(mode: 'DISABLED' | 'COPY_ONLY' | 'PASTE_ONLY' | 'FULL'): this {
    this.config.clipboardPolicy = mode;
    return this;
  }

  public setProctoringMedia(camera: boolean, microphone: boolean): this {
    this.config.mediaPermissions.allowCamera = camera;
    this.config.mediaPermissions.allowMicrophone = microphone;
    return this;
  }

  public setServerEndpoint(url: string): this {
    this.config.serverEndpoint = url;
    return this;
  }

  public setSecurityProfile(profile: 'MANAGED_DEVICE' | 'BYOD'): this {
    this.config.securityProfile = profile;
    return this;
  }

  public build(): ExamConfiguration {
    return JSON.parse(JSON.stringify(this.config));
  }

  private getDefaultBlockedProcesses(): ProcessRule[] {
    return [
      { name: 'discord.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: ['*Discord*'], description: 'Communication' },
      { name: 'telegram.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: ['*Telegram*'], description: 'Communication' },
      { name: 'whatsapp.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: ['*WhatsApp*'], description: 'Communication' },
      { name: 'slack.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: ['*Slack*'], description: 'Communication' },
      { name: 'obs64.exe', action: 'TERMINATE_EXAM', pathPatterns: [], sha256Hashes: [], windowTitles: ['*OBS*'], description: 'Screen recorder' },
      { name: 'obs32.exe', action: 'TERMINATE_EXAM', pathPatterns: [], sha256Hashes: [], windowTitles: [], description: 'Screen recorder' },
      { name: 'camtasia.exe', action: 'TERMINATE_EXAM', pathPatterns: [], sha256Hashes: [], windowTitles: [], description: 'Screen recorder' },
      { name: 'cheatengine-x86_64.exe', action: 'TERMINATE_EXAM', pathPatterns: [], sha256Hashes: [], windowTitles: ['*Cheat Engine*'], description: 'Memory modifier' },
      { name: 'anydesk.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: ['*AnyDesk*'], description: 'Remote control' },
      { name: 'teamviewer.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: ['*TeamViewer*'], description: 'Remote control' },
      { name: 'chrome.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: [], description: 'External browser' },
      { name: 'firefox.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: [], description: 'External browser' },
      { name: 'msedge.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: [], description: 'External browser' },
    ];
  }
}
