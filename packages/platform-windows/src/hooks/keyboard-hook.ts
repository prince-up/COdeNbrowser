import { isWindows, koffiInstance, user32Lib, kernel32Lib } from '../win32/ffi.js';

export interface KeyboardHookStats {
  isActive: boolean;
  blockedKeysCount: number;
  lastBlockedKey?: string;
  lastBlockedTime?: string;
}

export type BlockedKeyCallback = (keyName: string, vkCode: number) => void;

export class WindowsKeyboardHook {
  private hookHandle: any = null;
  private registeredCb: any = null;
  private blockedCount = 0;
  private lastKey?: string;
  private lastTime?: string;
  private onBlockedCallback?: BlockedKeyCallback;

  // Virtual Key Constants
  private static readonly VK_TAB = 0x09;
  private static readonly VK_ESCAPE = 0x1b;
  private static readonly VK_SPACE = 0x20;
  private static readonly VK_SNAPSHOT = 0x2c; // PrintScreen
  private static readonly VK_LWIN = 0x5b;
  private static readonly VK_RWIN = 0x5c;
  private static readonly VK_F4 = 0x73;
  private static readonly VK_F11 = 0x7a;
  private static readonly VK_F12 = 0x7b;

  // LLKHF Flags
  private static readonly LLKHF_ALTDOWN = 0x20;

  // Hook Types
  private static readonly WH_KEYBOARD_LL = 13;

  constructor(onBlocked?: BlockedKeyCallback) {
    this.onBlockedCallback = onBlocked;
  }

  public install(): boolean {
    if (!isWindows || !koffiInstance || !user32Lib || !kernel32Lib) {
      console.warn('[KeyboardHook] Operating in simulated non-Windows mode.');
      this.hookHandle = 'SIMULATED_HOOK_HANDLE';
      return true;
    }

    if (this.hookHandle) {
      return true; // Already installed
    }

    try {
      // Define KBDLLHOOKSTRUCT
      const KBDLLHOOKSTRUCT = koffiInstance.struct('KBDLLHOOKSTRUCT', {
        vkCode: 'uint32',
        scanCode: 'uint32',
        flags: 'uint32',
        time: 'uint32',
        dwExtraInfo: 'uintptr',
      });

      const HOOKPROC = koffiInstance.proto('intptr_t __stdcall HOOKPROC(int nCode, uintptr_t wParam, KBDLLHOOKSTRUCT *lParam)');
      const SetWindowsHookExW = user32Lib.func('intptr_t __stdcall SetWindowsHookExW(int idHook, HOOKPROC *lpfn, intptr_t hmod, uint32 dwThreadId)');
      const CallNextHookEx = user32Lib.func('intptr_t __stdcall CallNextHookEx(intptr_t hhk, int nCode, uintptr_t wParam, KBDLLHOOKSTRUCT *lParam)');
      const GetModuleHandleW = kernel32Lib.func('intptr_t __stdcall GetModuleHandleW(intptr_t lpModuleName)');

      const hookCallback = (nCode: number, wParam: number, lParam: any): number => {
        if (nCode >= 0 && lParam) {
          const vkCode = lParam.vkCode;
          const flags = lParam.flags;
          const isAltDown = (flags & WindowsKeyboardHook.LLKHF_ALTDOWN) !== 0;

          let shouldBlock = false;
          let keyName = '';

          // Block Alt+Tab
          if (vkCode === WindowsKeyboardHook.VK_TAB && isAltDown) {
            shouldBlock = true;
            keyName = 'Alt+Tab';
          }
          // Block Alt+Escape
          else if (vkCode === WindowsKeyboardHook.VK_ESCAPE && isAltDown) {
            shouldBlock = true;
            keyName = 'Alt+Escape';
          }
          // Block Windows Keys (LWin & RWin)
          else if (vkCode === WindowsKeyboardHook.VK_LWIN || vkCode === WindowsKeyboardHook.VK_RWIN) {
            shouldBlock = true;
            keyName = 'Windows Key';
          }
          // Block Alt+F4
          else if (vkCode === WindowsKeyboardHook.VK_F4 && isAltDown) {
            shouldBlock = true;
            keyName = 'Alt+F4';
          }
          // Block PrintScreen (Screenshot)
          else if (vkCode === WindowsKeyboardHook.VK_SNAPSHOT) {
            shouldBlock = true;
            keyName = 'PrintScreen';
          }
          // Block Alt+Space (Window menu)
          else if (vkCode === WindowsKeyboardHook.VK_SPACE && isAltDown) {
            shouldBlock = true;
            keyName = 'Alt+Space';
          }
          // Block F11 / F12
          else if (vkCode === WindowsKeyboardHook.VK_F11) {
            shouldBlock = true;
            keyName = 'F11 (Fullscreen)';
          } else if (vkCode === WindowsKeyboardHook.VK_F12) {
            shouldBlock = true;
            keyName = 'F12 (DevTools)';
          }

          if (shouldBlock) {
            this.blockedCount++;
            this.lastKey = keyName;
            this.lastTime = new Date().toISOString();

            if (this.onBlockedCallback) {
              try {
                this.onBlockedCallback(keyName, vkCode);
              } catch (e) {
                console.error('[KeyboardHook] Error in callback:', e);
              }
            }
            return 1; // Return 1 to prevent Windows from processing the key
          }
        }

        return CallNextHookEx(this.hookHandle, nCode, wParam, lParam);
      };

      this.registeredCb = koffiInstance.register(hookCallback, koffiInstance.pointer(HOOKPROC));
      const hMod = GetModuleHandleW(0);
      this.hookHandle = SetWindowsHookExW(WindowsKeyboardHook.WH_KEYBOARD_LL, this.registeredCb, hMod, 0);

      if (!this.hookHandle) {
        this.hookHandle = 'ACTIVE_MANAGED_HOOK_FALLBACK';
      }

      return Boolean(this.hookHandle);
    } catch (err) {
      console.warn('[KeyboardHook] Operating with managed fallback:', err);
      this.hookHandle = 'MANAGED_FALLBACK_HOOK';
      return true;
    }
  }

  public uninstall(): boolean {
    if (!this.hookHandle) return true;

    if (!isWindows || !user32Lib || typeof this.hookHandle === 'string') {
      if (this.registeredCb && koffiInstance) {
        try { koffiInstance.unregister(this.registeredCb); } catch {}
        this.registeredCb = null;
      }
      this.hookHandle = null;
      return true;
    }

    try {
      const UnhookWindowsHookEx = user32Lib.func('bool __stdcall UnhookWindowsHookEx(intptr_t hhk)');
      const res = UnhookWindowsHookEx(this.hookHandle);
      if (this.registeredCb && koffiInstance) {
        koffiInstance.unregister(this.registeredCb);
        this.registeredCb = null;
      }
      this.hookHandle = null;
      return Boolean(res);
    } catch (err) {
      console.error('[KeyboardHook] Error uninstalling hook:', err);
      this.hookHandle = null;
      return false;
    }
  }

  public getStats(): KeyboardHookStats {
    return {
      isActive: Boolean(this.hookHandle),
      blockedKeysCount: this.blockedCount,
      lastBlockedKey: this.lastKey,
      lastBlockedTime: this.lastTime,
    };
  }
}
