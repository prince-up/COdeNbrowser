import {
  WindowsKeyboardHook,
  DisplayTopologyMonitor,
  ProcessMonitorService,
  ClipboardGuard,
  ManagedKioskManager,
} from '@seb/platform-windows';
import {
  ProcessPolicyEngine,
  type ExamConfiguration,
  type SecurityEventBuffer,
  type SessionStateMachine,
  type ProcessEvaluationResult,
} from '@seb/core';

export class SecurityOrchestrator {
  private config: ExamConfiguration;
  private eventBuffer: SecurityEventBuffer;
  private stateMachine: SessionStateMachine;
  private sessionId: string;

  private keyboardHook?: WindowsKeyboardHook;
  private displayMonitor?: DisplayTopologyMonitor;
  private processScanner?: ProcessMonitorService;
  private isSecured = false;

  constructor(
    config: ExamConfiguration,
    sessionId: string,
    eventBuffer: SecurityEventBuffer,
    stateMachine: SessionStateMachine
  ) {
    this.config = config;
    this.sessionId = sessionId;
    this.eventBuffer = eventBuffer;
    this.stateMachine = stateMachine;
  }

  /**
   * Activate all OS-level lockdown mechanisms, hooks, and background monitors
   */
  public activateLockdown(): boolean {
    if (this.isSecured) return true;

    // 1. Sanitize Clipboard
    if (this.config.clipboardPolicy === 'DISABLED') {
      ClipboardGuard.clearSystemClipboard();
    }

    // 2. Install Low-Level Keyboard Hook (WH_KEYBOARD_LL)
    this.keyboardHook = new WindowsKeyboardHook((keyName: string, vkCode: number) => {
      this.eventBuffer.record(
        this.sessionId,
        this.config.examId,
        'KEYBOARD_HOOK_BLOCKED',
        'WARNING',
        `Blocked restricted keyboard hotkey: ${keyName} (VK: ${vkCode})`,
        { keyName, vkCode }
      );
    });
    this.keyboardHook.install();

    // 3. Start Dynamic Multi-Monitor Hotplug Watcher
    this.displayMonitor = new DisplayTopologyMonitor((count: number, prev: number) => {
      this.eventBuffer.record(
        this.sessionId,
        this.config.examId,
        'MULTI_MONITOR_DETECTED',
        'CRITICAL',
        `Display count changed from ${prev} to ${count}`,
        { count, prev }
      );

      if (!this.config.displayPolicy.allowMultipleDisplays && count > 1) {
        const action = this.config.displayPolicy.actionOnDisplayChange;
        if (action === 'LOCK' || action === 'END_SESSION') {
          this.stateMachine.transitionTo('SESSION_PAUSED', 'Unauthorized secondary monitor attached during exam');
        }
      }
    });
    this.displayMonitor.start(1500);

    // 4. Start Background Prohibited Process Watchdog
    const procPolicy = new ProcessPolicyEngine(this.config);
    this.processScanner = new ProcessMonitorService(procPolicy, (result: ProcessEvaluationResult) => {
      this.eventBuffer.record(
        this.sessionId,
        this.config.examId,
        'PROCESS_DETECTED',
        result.action === 'TERMINATE_EXAM' ? 'FATAL' : 'CRITICAL',
        `Prohibited process detected: ${result.process.name} (${result.reason})`,
        { process: result.process, action: result.action }
      );

      if (result.action === 'TERMINATE_EXAM') {
        this.stateMachine.transitionTo('EXAM_TERMINATED', `Prohibited application executed: ${result.process.name}`);
      }
    });
    this.processScanner.startWatchdog(1500);

    // 5. Managed Profile GPO Registry Lockdown (if Admin)
    if (this.config.securityProfile === 'MANAGED_DEVICE' && ManagedKioskManager.isAdministrator()) {
      ManagedKioskManager.applyManagedLockdown();
    }

    this.isSecured = true;
    return true;
  }

  /**
   * Graceful cleanup: release keyboard hooks, stop watchers, and restore GPO registry policies
   */
  public deactivateLockdown(): void {
    if (!this.isSecured) return;

    if (this.keyboardHook) {
      this.keyboardHook.uninstall();
    }

    if (this.displayMonitor) {
      this.displayMonitor.stop();
    }

    if (this.processScanner) {
      this.processScanner.stopWatchdog();
    }

    if (this.config.securityProfile === 'MANAGED_DEVICE') {
      ManagedKioskManager.removeManagedLockdown();
    }

    // Final clipboard wipe
    ClipboardGuard.clearSystemClipboard();

    this.isSecured = false;
  }
}
