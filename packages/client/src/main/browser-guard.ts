import { session, WebContents } from 'electron';
import { URLPolicyEngine, PermissionPolicyEngine, type ExamConfiguration, type SecurityEvent } from '@seb/core';

export type SecurityEventCallback = (event: Partial<SecurityEvent>) => void;

export class BrowserGuardService {
  private urlEngine: URLPolicyEngine;
  private permEngine: PermissionPolicyEngine;
  private onSecurityEvent?: SecurityEventCallback;
  private config: ExamConfiguration;

  constructor(config: ExamConfiguration, onEvent?: SecurityEventCallback) {
    this.config = config;
    this.urlEngine = new URLPolicyEngine(config);
    this.permEngine = new PermissionPolicyEngine(config);
    this.onSecurityEvent = onEvent;
  }

  /**
   * Apply strict network interception, URL policy filtering, and permission enforcement
   */
  public applyPolicy(sess = session.defaultSession): void {
    // 1. URL Filtering Interception (sub-request & navigation level)
    sess.webRequest.onBeforeRequest((details, callback) => {
      // Allow internal app renderer files (e.g. file:/// or app://) during startup
      if (details.url.startsWith('file://') && details.url.includes('/renderer/')) {
        return callback({ cancel: false });
      }

      const evaluation = this.urlEngine.evaluate(details.url, details.method);

      if (!evaluation.allowed) {
        console.warn(`[BrowserGuard] Blocked request: ${details.url} -> ${evaluation.reason}`);
        if (this.onSecurityEvent) {
          this.onSecurityEvent({
            eventType: 'NAVIGATION_BLOCKED',
            severity: 'WARNING',
            message: `Blocked unauthorized URL: ${details.url} (${evaluation.reason})`,
            metadata: { url: details.url, method: details.method, reason: evaluation.reason },
          });
        }
        return callback({ cancel: true });
      }

      return callback({ cancel: false });
    });

    // 2. Permission Request Handler (Camera, Mic, Geolocation, Notifications)
    sess.setPermissionRequestHandler((webContents, permission, callback) => {
      const allowed = this.permEngine.checkPermission(permission);
      if (!allowed && this.onSecurityEvent) {
        this.onSecurityEvent({
          eventType: 'SECURITY_POLICY_VIOLATION',
          severity: 'INFO',
          message: `Denied browser permission request: ${permission}`,
        });
      }
      callback(allowed);
    });

    sess.setPermissionCheckHandler((webContents, permission) => {
      return this.permEngine.checkPermission(permission);
    });
  }

  /**
   * Harden an individual WebContents instance
   */
  public hardenWebContents(wc: WebContents): void {
    // Popup & New Window Policy on WebContents
    wc.setWindowOpenHandler((details) => {
      if (this.config.popupPolicy === 'BLOCK_ALL') {
        if (this.onSecurityEvent) {
          this.onSecurityEvent({
            eventType: 'POPUP_BLOCKED',
            severity: 'INFO',
            message: `Blocked popup window to: ${details.url}`,
          });
        }
        return { action: 'deny' };
      }

      const evaluation = this.urlEngine.evaluate(details.url);
      if (!evaluation.allowed) {
        if (this.onSecurityEvent) {
          this.onSecurityEvent({
            eventType: 'POPUP_BLOCKED',
            severity: 'WARNING',
            message: `Blocked popup with unauthorized URL: ${details.url}`,
          });
        }
        return { action: 'deny' };
      }

      return { action: 'allow' };
    });

    // Disable DevTools
    if (!this.config.navigationPolicy.allowDevTools) {
      wc.on('devtools-opened', () => {
        wc.closeDevTools();
        if (this.onSecurityEvent) {
          this.onSecurityEvent({
            eventType: 'DEVTOOLS_BLOCKED',
            severity: 'CRITICAL',
            message: 'Attempted to open Developer Tools; automatically closed',
          });
        }
      });
    }

    // Intercept top-level navigation
    wc.on('will-navigate', (event, url) => {
      const evaluation = this.urlEngine.evaluate(url);
      if (!evaluation.allowed) {
        event.preventDefault();
        console.warn(`[BrowserGuard] Blocked top-level navigation to: ${url}`);
        if (this.onSecurityEvent) {
          this.onSecurityEvent({
            eventType: 'NAVIGATION_BLOCKED',
            severity: 'WARNING',
            message: `Blocked navigation attempt: ${url}`,
            metadata: { url, reason: evaluation.reason },
          });
        }
      }
    });

    // Intercept redirect chains
    wc.on('will-redirect', (event, url) => {
      const evaluation = this.urlEngine.evaluate(url);
      if (!evaluation.allowed) {
        event.preventDefault();
        console.warn(`[BrowserGuard] Blocked redirect to: ${url}`);
        if (this.onSecurityEvent) {
          this.onSecurityEvent({
            eventType: 'NAVIGATION_BLOCKED',
            severity: 'WARNING',
            message: `Blocked redirect attempt to unauthorized URL: ${url}`,
          });
        }
      }
    });
  }
}
