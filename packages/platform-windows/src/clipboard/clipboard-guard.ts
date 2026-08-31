import { isWindows, user32Lib } from '../win32/ffi.js';

export class ClipboardGuard {
  /**
   * Empty and flush the Windows system clipboard
   */
  public static clearSystemClipboard(): boolean {
    if (!isWindows || !user32Lib) {
      return true;
    }

    try {
      const OpenClipboard = user32Lib.func('bool __stdcall OpenClipboard(intptr_t hWndNewOwner)');
      const EmptyClipboard = user32Lib.func('bool __stdcall EmptyClipboard()');
      const CloseClipboard = user32Lib.func('bool __stdcall CloseClipboard()');

      if (OpenClipboard(0)) {
        EmptyClipboard();
        CloseClipboard();
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[ClipboardGuard] Failed to clear system clipboard:', err);
      return false;
    }
  }
}
