import { BrowserWindow, app } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DisplayAffinityShield, WindowsTaskbarManager, WindowsGestureGuard } from '@seb/platform-windows';

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
  private canClose = false;

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
      minimizable: false,
      closable: true,
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

    // Intercept Window Close (Prevents Alt+F4 or right-click close during exam)
    this.window.on('close', (e: any) => {
      if (this.isExamActive && !this.canClose) {
        e.preventDefault();
      }
    });

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
    this.canClose = false;
    if (this.window && !this.window.isDestroyed()) {
      // 1. Hide OS Taskbar & Start Button completely
      WindowsTaskbarManager.hideTaskbar();

      // 2. Apply Touchpad 3-finger / 4-finger gesture registry lockdown
      WindowsGestureGuard.enableTouchpadLockdown();

      // 3. Start 50ms aggressive Foreground Watchdog (suppresses Photos, Store, Task View)
      const handle = this.window.getNativeWindowHandle();
      WindowsGestureGuard.startForegroundWatchdog(handle);

      this.window.setMinimizable(false);
      this.window.setClosable(false);
      this.window.setSkipTaskbar(true); // Remove SEB from taskbar
      this.window.setKiosk(true);
      this.window.setFullScreen(true);
      this.window.setAlwaysOnTop(true, 'screen-saver');
      this.window.focus();

      const finalUrl = examUrl.includes('?') ? `${examUrl}&sebSession=1` : `${examUrl}?sebSession=1`;
      this.window.loadURL(finalUrl, {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 COdeNbrowser/1.0.0 SecureExamBrowser/1.0.0',
      });
    }
  }

  public exitExamMode(): void {
    this.isExamActive = false;
    this.canClose = true;

    // 1. Stop Foreground Watchdog & Restore Touchpad settings
    WindowsGestureGuard.stopForegroundWatchdog();
    WindowsGestureGuard.restoreTouchpadSettings();

    // 2. Restore OS Taskbar
    WindowsTaskbarManager.showTaskbar();

    if (this.window && !this.window.isDestroyed()) {
      this.window.setMinimizable(true);
      this.window.setClosable(true);
      this.window.setSkipTaskbar(false);
      this.window.setKiosk(false);
      this.window.setFullScreen(false);
      this.window.setAlwaysOnTop(false);
    }
  }

  public getWindow(): BrowserWindow | null {
    return this.window;
  }
}
