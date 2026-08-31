import { isWindows, user32Lib } from '../win32/ffi.js';

export const WDA_NONE = 0x00000000;
export const WDA_MONITOR = 0x00000001;
export const WDA_EXCLUDEFROMCAPTURE = 0x00000011; // Windows 10 (2004+) and Windows 11

export class DisplayAffinityShield {
  /**
   * Protect a window handle from OS-level screen capture, Snipping Tool, OBS, Teams, etc.
   */
  public static setProtection(hwnd: number | bigint | Buffer, enable = true): boolean {
    if (!isWindows || !user32Lib) {
      return true; // Graceful non-Windows fallback
    }

    try {
      const SetWindowDisplayAffinity = user32Lib.func('bool __stdcall SetWindowDisplayAffinity(intptr_t hWnd, uint32 dwAffinity)');

      // Convert hwnd buffer / pointer if passed from Electron (e.g. mainWindow.getNativeWindowHandle())
      let nativeHwnd: number | bigint = 0;
      if (Buffer.isBuffer(hwnd)) {
        nativeHwnd = hwnd.readBigUInt64LE ? hwnd.readBigUInt64LE(0) : hwnd.readUInt32LE(0);
      } else {
        nativeHwnd = hwnd;
      }

      // Try WDA_EXCLUDEFROMCAPTURE first (strongest on modern Win10/11); fall back to WDA_MONITOR
      const affinityMode = enable ? WDA_EXCLUDEFROMCAPTURE : WDA_NONE;
      let result = SetWindowDisplayAffinity(nativeHwnd, affinityMode);

      if (!result && enable) {
        // Fallback for older Windows 10 builds
        result = SetWindowDisplayAffinity(nativeHwnd, WDA_MONITOR);
      }

      return Boolean(result);
    } catch (err) {
      console.warn('[DisplayAffinityShield] Failed to set window display affinity:', err);
      return false;
    }
  }
}
