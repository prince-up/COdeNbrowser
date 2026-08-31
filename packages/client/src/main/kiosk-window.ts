import { BrowserWindow, app } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DisplayAffinityShield } from '@seb/platform-windows';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface KioskWindowOptions {
  enableKiosk: boolean;
  enableScreenShield: boolean;
  onFocusLost?: () => void;
}

export class KioskWindowManager {
  private window: BrowserWindow | null = null;
  private options: KioskWindowOptions;
  private isExamActive = false;

  constructor(options: KioskWindowOptions) {
    this.options = options;
  }

  public createWindow(): BrowserWindow {
    let preloadPath = path.join(__dirname, '../preload/index.cjs');
    if (!fs.existsSync(preloadPath)) {
      preloadPath = path.join(__dirname, '../../src/preload/index.cjs');
    }
    if (!fs.existsSync(preloadPath)) {
      preloadPath = path.join(__dirname, '../preload/index.js');
    }

    this.window = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1024,
      minHeight: 720,
      fullscreen: this.options.enableKiosk,
      kiosk: this.options.enableKiosk,
      alwaysOnTop: this.options.enableKiosk,
      skipTaskbar: this.options.enableKiosk,
      minimizable: false, // Disables 3-finger swipe down minimize
      closable: false,
      frame: !this.options.enableKiosk,
      autoHideMenuBar: true,
      backgroundColor: '#0f172a',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: preloadPath,
        devTools: false,
      },
    });

    // Screen Capture Protection (Win32 SetWindowDisplayAffinity)
    if (this.options.enableScreenShield) {
      try {
        const handle = this.window.getNativeWindowHandle();
        DisplayAffinityShield.setProtection(handle, true);
      } catch (err) {
        console.warn('[KioskWindow] Could not apply display affinity protection:', err);
      }
    }

    // Intercept Minimize (Prevents 3-finger slide down from minimizing exam)
    this.window.on('minimize', (e: any) => {
      if (this.isExamActive && this.window && !this.window.isDestroyed()) {
        e.preventDefault();
        this.window.restore();
        this.window.setFullScreen(true);
        this.window.setAlwaysOnTop(true, 'screen-saver');
        this.window.focus();
      }
    });

    // Intercept Window Blur (Forces instant refocus on touchpad gesture or app switch)
    this.window.on('blur', () => {
      if (this.isExamActive && this.window && !this.window.isDestroyed()) {
        if (this.options.onFocusLost) {
          this.options.onFocusLost();
        }
        // Force instant restore and refocus
        setImmediate(() => {
          if (this.window && !this.window.isDestroyed()) {
            this.window.restore();
            this.window.setFullScreen(true);
            this.window.setAlwaysOnTop(true, 'screen-saver');
            this.window.focus();
          }
        });
      }
    });

    return this.window;
  }

  public enterExamMode(examUrl: string): void {
    this.isExamActive = true;
    if (this.window && !this.window.isDestroyed()) {
      this.window.setMinimizable(false);
      this.window.setKiosk(true);
      this.window.setFullScreen(true);
      this.window.setAlwaysOnTop(true, 'screen-saver');
      this.window.focus();
      this.window.loadURL(examUrl);
    }
  }

  public exitExamMode(): void {
    this.isExamActive = false;
    if (this.window && !this.window.isDestroyed()) {
      this.window.setMinimizable(true);
      this.window.setKiosk(false);
      this.window.setFullScreen(false);
      this.window.setAlwaysOnTop(false);
    }
  }

  public getWindow(): BrowserWindow | null {
    return this.window;
  }
}
