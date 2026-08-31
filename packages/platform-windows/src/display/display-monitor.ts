import { isWindows, user32Lib } from '../win32/ffi.js';

export interface DisplayInfo {
  id: number;
  isPrimary: boolean;
  width: number;
  height: number;
}

export type DisplayChangeCallback = (currentCount: number, previousCount: number) => void;

export class DisplayTopologyMonitor {
  private timer: NodeJS.Timeout | null = null;
  private lastCount = 1;
  private callback?: DisplayChangeCallback;

  constructor(callback?: DisplayChangeCallback) {
    this.callback = callback;
    this.lastCount = this.getDisplayCount();
  }

  /**
   * Get the current count of connected physical & virtual monitors
   */
  public getDisplayCount(): number {
    if (!isWindows || !user32Lib) {
      return 1; // Default single display in non-Windows/mock
    }

    try {
      // SM_CMONITORS = 80
      const GetSystemMetrics = user32Lib.func('int __stdcall GetSystemMetrics(int nIndex)');
      const count = GetSystemMetrics(80);
      return count > 0 ? count : 1;
    } catch {
      return 1;
    }
  }

  /**
   * Start dynamic polling / monitoring for display hotplug events (e.g. student connecting external monitor)
   */
  public start(intervalMs = 1500): void {
    if (this.timer) return;

    this.lastCount = this.getDisplayCount();
    this.timer = setInterval(() => {
      const current = this.getDisplayCount();
      if (current !== this.lastCount) {
        const prev = this.lastCount;
        this.lastCount = current;
        if (this.callback) {
          try {
            this.callback(current, prev);
          } catch (err) {
            console.error('[DisplayTopologyMonitor] Callback error:', err);
          }
        }
      }
    }, intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
