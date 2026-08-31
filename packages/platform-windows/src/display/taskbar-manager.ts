import { isWindows, koffiInstance, user32Lib } from '../win32/ffi.js';

export class WindowsTaskbarManager {
  private static isHidden = false;

  public static hideTaskbar(): void {
    if (!isWindows || !user32Lib || !koffiInstance) return;

    try {
      const FindWindowA = user32Lib.func('intptr_t __stdcall FindWindowA(str lpClassName, str lpWindowName)');
      const ShowWindow = user32Lib.func('bool __stdcall ShowWindow(intptr_t hWnd, int nCmdShow)');

      // Primary Taskbar (Shell_TrayWnd)
      const hPrimary = FindWindowA('Shell_TrayWnd', null);
      if (hPrimary) {
        ShowWindow(hPrimary, 0); // SW_HIDE = 0
      }

      // Secondary Taskbar on Multi-monitors (Shell_SecondaryTrayWnd)
      const hSecondary = FindWindowA('Shell_SecondaryTrayWnd', null);
      if (hSecondary) {
        ShowWindow(hSecondary, 0);
      }

      // Windows Start Button (Button)
      const hStart = FindWindowA('Button', null);
      if (hStart) {
        ShowWindow(hStart, 0);
      }

      this.isHidden = true;
    } catch (err) {
      console.warn('[TaskbarManager] Could not hide taskbar:', err);
    }
  }

  public static showTaskbar(): void {
    if (!isWindows || !user32Lib || !koffiInstance) return;

    try {
      const FindWindowA = user32Lib.func('intptr_t __stdcall FindWindowA(str lpClassName, str lpWindowName)');
      const ShowWindow = user32Lib.func('bool __stdcall ShowWindow(intptr_t hWnd, int nCmdShow)');

      const hPrimary = FindWindowA('Shell_TrayWnd', null);
      if (hPrimary) {
        ShowWindow(hPrimary, 5); // SW_SHOW = 5
      }

      const hSecondary = FindWindowA('Shell_SecondaryTrayWnd', null);
      if (hSecondary) {
        ShowWindow(hSecondary, 5);
      }

      const hStart = FindWindowA('Button', null);
      if (hStart) {
        ShowWindow(hStart, 5);
      }

      this.isHidden = false;
    } catch (err) {
      console.warn('[TaskbarManager] Could not restore taskbar:', err);
    }
  }
}
