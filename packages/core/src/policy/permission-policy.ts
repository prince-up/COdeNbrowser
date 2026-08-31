import type { ExamConfiguration } from '../config/schema.js';

export type BrowserPermissionType =
  | 'camera'
  | 'microphone'
  | 'geolocation'
  | 'notifications'
  | 'midi'
  | 'midiSysex'
  | 'pointerLock'
  | 'fullscreen'
  | 'openExternal'
  | 'clipboard-read'
  | 'clipboard-sanitized-write'
  | 'display-capture';

export class PermissionPolicyEngine {
  private media: ExamConfiguration['mediaPermissions'];
  private clipboard: ExamConfiguration['clipboardPolicy'];
  private allowFullscreen: boolean;

  constructor(config: ExamConfiguration) {
    this.media = config.mediaPermissions;
    this.clipboard = config.clipboardPolicy;
    this.allowFullscreen = true; // Kiosk operates in fullscreen
  }

  /**
   * Determine whether a specific browser permission request is allowed
   */
  public checkPermission(permission: string): boolean {
    switch (permission) {
      case 'media':
      case 'camera':
        return this.media.allowCamera;
      case 'microphone':
      case 'audio-capture':
        return this.media.allowMicrophone;
      case 'geolocation':
        return this.media.allowGeolocation;
      case 'notifications':
        return this.media.allowNotifications;
      case 'clipboard-read':
        return this.clipboard === 'PASTE_ONLY' || this.clipboard === 'FULL';
      case 'clipboard-sanitized-write':
        return this.clipboard === 'COPY_ONLY' || this.clipboard === 'FULL';
      case 'display-capture':
        return false; // Always deny screen capture within browser
      case 'fullscreen':
      case 'pointerLock':
        return true;
      case 'openExternal':
      default:
        return false; // Deny all other external protocol requests
    }
  }
}
