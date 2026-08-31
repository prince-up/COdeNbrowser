import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { isWindows } from '../win32/ffi.js';
import type { ProcessInfo, ProcessEvaluationResult, ProcessPolicyEngine } from '@seb/core';

export type ProcessViolationCallback = (result: ProcessEvaluationResult) => void;

export class ProcessMonitorService {
  private timer: NodeJS.Timeout | null = null;
  private hashCache = new Map<string, string>(); // path -> sha256
  private knownPids = new Set<number>();
  private onViolationCallback?: ProcessViolationCallback;
  private policyEngine: ProcessPolicyEngine;

  constructor(policyEngine: ProcessPolicyEngine, onViolation?: ProcessViolationCallback) {
    this.policyEngine = policyEngine;
    this.onViolationCallback = onViolation;
  }

  /**
   * Enumerate currently running processes on the system
   */
  public getRunningProcesses(): ProcessInfo[] {
    const list: ProcessInfo[] = [];

    if (!isWindows) {
      // Mock / non-windows fallback
      return [
        { pid: process.pid, name: 'seb-client.exe' },
        { pid: 1, name: 'init' },
      ];
    }

    try {
      // Fast process snapshot via PowerShell CIM / tasklist
      const cmd = 'powershell.exe -NoProfile -Command "Get-Process | Select-Object -Property Id, ProcessName, Path, MainWindowTitle | ConvertTo-Json -Compress"';
      const output = execSync(cmd, { encoding: 'utf8', timeout: 5000, maxBuffer: 10 * 1024 * 1024 });

      const parsed = JSON.parse(output);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        if (!item || !item.ProcessName) continue;
        const pid = Number(item.Id);
        const name = `${item.ProcessName}.exe`;
        const exePath = item.Path || undefined;
        const windowTitle = item.MainWindowTitle || undefined;

        let sha256Hash: string | undefined;
        if (exePath) {
          sha256Hash = this.getOrComputeHash(exePath);
        }

        list.push({ pid, name, exePath, windowTitle, sha256Hash });
      }
    } catch (err) {
      // Fallback
    }

    return list;
  }

  private getOrComputeHash(filePath: string): string | undefined {
    if (this.hashCache.has(filePath)) {
      return this.hashCache.get(filePath);
    }

    try {
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        this.hashCache.set(filePath, hash);
        return hash;
      }
    } catch {
      // Access denied on protected system binary
    }

    return undefined;
  }

  /**
   * Start periodic background process watchdog
   */
  public startWatchdog(intervalMs = 1500): void {
    if (this.timer) return;

    this.scanAndEvaluate();
    this.timer = setInterval(() => {
      this.scanAndEvaluate();
    }, intervalMs);
  }

  public stopWatchdog(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private scanAndEvaluate(): void {
    const processes = this.getRunningProcesses();
    for (const proc of processes) {
      const evaluation = this.policyEngine.evaluate(proc);
      if (evaluation.action === 'BLOCK' || evaluation.action === 'TERMINATE_EXAM' || evaluation.action === 'WARN') {
        if (this.onViolationCallback) {
          try {
            this.onViolationCallback(evaluation);
          } catch (err) {
            console.error('[ProcessMonitor] Violation callback error:', err);
          }
        }
      }
    }
  }
}
