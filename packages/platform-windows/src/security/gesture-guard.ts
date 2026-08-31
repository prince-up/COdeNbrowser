import { execSync } from 'node:child_process';
import { isWindows, koffiInstance, user32Lib } from '../win32/ffi.js';

export class WindowsGestureGuard {
  private static watchdogTimer: NodeJS.Timeout | null = null;
  private static targetHwnd: any = null;

  /**
   * Apply OS-level registry lockdown for touchpad gestures, Task View, and Edge Swipes
   */
  public static enableTouchpadLockdown(): void {
    if (!isWindows) return;

    try {
      // 1. Disable Precision Touchpad 3-finger & 4-finger gestures (Slide Up/Down/Left/Right/Tap)
      const regCommands = [
        'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "ThreeFingerSlideDown" /t REG_DWORD /d 0 /f',
        'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "ThreeFingerSlideUp" /t REG_DWORD /d 0 /f',
        'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "ThreeFingerSlideLeft" /t REG_DWORD /d 0 /f',
        'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "ThreeFingerSlideRight" /t REG_DWORD /d 0 /f',
        'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "ThreeFingerTap" /t REG_DWORD /d 0 /f',
        'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "FourFingerSlideDown" /t REG_DWORD /d 0 /f',
        'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "FourFingerSlideUp" /t REG_DWORD /d 0 /f',
        'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "FourFingerSlideLeft" /t REG_DWORD /d 0 /f',
        'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "FourFingerSlideRight" /t REG_DWORD /d 0 /f',
        'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "FourFingerTap" /t REG_DWORD /d 0 /f',
        'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "NoWinKeys" /t REG_DWORD /d 1 /f',
        'reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\EdgeUI" /v "AllowEdgeSwipe" /t REG_DWORD /d 0 /f',
        'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "DisallowShaking" /t REG_DWORD /d 1 /f',
      ];

      for (const cmd of regCommands) {
        try {
          execSync(cmd, { stdio: 'ignore', windowsHide: true });
        } catch {}
      }

      // Broadcast WM_SETTINGCHANGE (0x001A) so Windows Explorer applies settings immediately in memory
      if (user32Lib) {
        try {
          const SendMessageTimeoutA = user32Lib.func(
            'intptr_t __stdcall SendMessageTimeoutA(intptr_t hWnd, uint32 Msg, uintptr_t wParam, str lParam, uint32 fuFlags, uint32 uTimeout, intptr_t *lpdwResult)'
          );
          const HWND_BROADCAST = 0xffff;
          const WM_SETTINGCHANGE = 0x001a;
          const SMTO_ABORTIFHUNG = 0x0002;
          let res = 0;
          SendMessageTimeoutA(HWND_BROADCAST, WM_SETTINGCHANGE, 0, 'Windows.PrecisionTouchpad', SMTO_ABORTIFHUNG, 100, [res]);
        } catch {}
      }
    } catch (err) {
      console.warn('[GestureGuard] Could not apply gesture registry lockdown:', err);
    }
  }

  /**
   * Restore original Windows touchpad settings on clean exit
   */
  public static restoreTouchpadSettings(): void {
    if (!isWindows) return;

    try {
      const restoreCommands = [
        'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "ThreeFingerSlideDown" /f',
        'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "ThreeFingerSlideUp" /f',
        'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "ThreeFingerSlideLeft" /f',
        'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "ThreeFingerSlideRight" /f',
        'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "ThreeFingerTap" /f',
        'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "FourFingerSlideDown" /f',
        'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "FourFingerSlideUp" /f',
        'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "FourFingerSlideLeft" /f',
        'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "FourFingerSlideRight" /f',
        'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v "FourFingerTap" /f',
        'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "NoWinKeys" /f',
        'reg delete "HKCU\\Software\\Policies\\Microsoft\\Windows\\EdgeUI" /v "AllowEdgeSwipe" /f',
        'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "DisallowShaking" /f',
      ];

      for (const cmd of restoreCommands) {
        try {
          execSync(cmd, { stdio: 'ignore', windowsHide: true });
        } catch {}
      }
    } catch (err) {
      console.warn('[GestureGuard] Could not restore gesture registry:', err);
    }
  }

  /**
   * Start 25ms aggressive Foreground Watchdog to instantly suppress foreign windows (Photos, Store, Task View)
   */
  public static startForegroundWatchdog(windowHandle: Buffer): void {
    if (!isWindows || !user32Lib || !koffiInstance) return;

    try {
      const GetForegroundWindow = user32Lib.func('intptr_t __stdcall GetForegroundWindow()');
      const SetForegroundWindow = user32Lib.func('bool __stdcall SetForegroundWindow(intptr_t hWnd)');
      const BringWindowToTop = user32Lib.func('bool __stdcall BringWindowToTop(intptr_t hWnd)');
      const ShowWindow = user32Lib.func('bool __stdcall ShowWindow(intptr_t hWnd, int nCmdShow)');
      const SetWindowPos = user32Lib.func('bool __stdcall SetWindowPos(intptr_t hWnd, intptr_t hWndInsertAfter, int X, int Y, int cx, int cy, uint32 uFlags)');

      // Extract HWND integer
      const hwndInt = windowHandle.readInt32LE ? windowHandle.readInt32LE(0) : (windowHandle as any);
      this.targetHwnd = hwndInt;

      const HWND_TOPMOST = -1;
      const SWP_NOSIZE = 0x0001;
      const SWP_NOMOVE = 0x0002;
      const SWP_SHOWWINDOW = 0x0040;
      const SW_MINIMIZE = 6;

      if (this.watchdogTimer) clearInterval(this.watchdogTimer);

      this.watchdogTimer = setInterval(() => {
        try {
          const currentFg = GetForegroundWindow();
          if (currentFg && currentFg !== this.targetHwnd) {
            // Foreign window popped up (e.g. Task View, Microsoft Store, Photos, Start Menu) -> Minimize foreign window
            ShowWindow(currentFg, SW_MINIMIZE);

            // Re-assert topmost fullscreen on SEB
            SetWindowPos(this.targetHwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);
            BringWindowToTop(this.targetHwnd);
            SetForegroundWindow(this.targetHwnd);
          }
        } catch {}
      }, 25);
    } catch (err) {
      console.warn('[GestureGuard] Watchdog initialization warning:', err);
    }
  }

  public static stopForegroundWatchdog(): void {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }
}
