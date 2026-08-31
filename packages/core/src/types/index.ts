/**
 * Secure Exam Browser (SEB) Core Domain Types & Enums
 */

export type SecurityProfile = 'MANAGED_DEVICE' | 'BYOD';

export type VMAction = 'ALLOW' | 'WARN' | 'BLOCK';
export type RemoteSessionAction = 'ALLOW' | 'WARN' | 'BLOCK';
export type MultiDisplayAction = 'ALLOW' | 'WARN' | 'LOCK' | 'END_SESSION';
export type ProcessPolicyAction = 'ALLOW' | 'WARN' | 'BLOCK' | 'TERMINATE_EXAM';
export type ClipboardPolicyMode = 'DISABLED' | 'COPY_ONLY' | 'PASTE_ONLY' | 'FULL';
export type DownloadPolicyMode = 'BLOCK_ALL' | 'ALLOW_WHITELIST' | 'ALLOW_ALL';
export type UploadPolicyMode = 'BLOCK_ALL' | 'ALLOW_WHITELIST' | 'ALLOW_ALL';
export type PopupPolicyMode = 'BLOCK_ALL' | 'ALLOW_SAME_DOMAIN' | 'ALLOW_WHITELIST';
export type NetworkFailurePolicy = 'CONTINUE' | 'PAUSE' | 'LOCK' | 'TERMINATE';

export type DiagnosticStatus = 'PASS' | 'WARN' | 'FAIL' | 'NOT_APPLICABLE';

export interface DiagnosticItem {
  id: string;
  name: string;
  category: 'SECURITY' | 'ENVIRONMENT' | 'HARDWARE' | 'NETWORK' | 'INTEGRITY';
  status: DiagnosticStatus;
  details: string;
  remediation?: string;
  requiresAdmin: boolean;
}

export interface SystemDiagnosticsReport {
  timestamp: string;
  profile: SecurityProfile;
  overallPassed: boolean;
  items: DiagnosticItem[];
}

export type SessionState =
  | 'UNINITIALIZED'
  | 'DIAGNOSTICS_IN_PROGRESS'
  | 'DIAGNOSTICS_FAILED'
  | 'READY_TO_START'
  | 'STARTING_KIOSK'
  | 'EXAM_ACTIVE'
  | 'SESSION_PAUSED'
  | 'EXAM_TERMINATED'
  | 'EXAM_COMPLETED'
  | 'CLEANUP_EXITED';

export type SecurityEventType =
  | 'EXAM_STARTED'
  | 'EXAM_FINISHED'
  | 'NAVIGATION_BLOCKED'
  | 'POPUP_BLOCKED'
  | 'DOWNLOAD_BLOCKED'
  | 'PRINT_BLOCKED'
  | 'CLIPBOARD_BLOCKED'
  | 'KEYBOARD_HOOK_BLOCKED'
  | 'DEVTOOLS_BLOCKED'
  | 'PROCESS_DETECTED'
  | 'PROCESS_BLOCKED'
  | 'REMOTE_SESSION_DETECTED'
  | 'VM_DETECTED'
  | 'MULTI_MONITOR_DETECTED'
  | 'INTEGRITY_FAILURE'
  | 'CONFIGURATION_FAILURE'
  | 'NETWORK_FAILURE'
  | 'NETWORK_RECONNECTED'
  | 'WINDOW_FOCUS_LOST'
  | 'EXIT_ATTEMPT'
  | 'UNAUTHORIZED_EXIT'
  | 'BROWSER_CRASH'
  | 'SECURITY_POLICY_VIOLATION';

export interface SecurityEvent {
  id: string;
  sessionId: string;
  examId: string;
  timestamp: string;
  eventType: SecurityEventType;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'FATAL';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ClientHeartbeatPayload {
  sessionId: string;
  examId: string;
  clientVersion: string;
  configVersion: string;
  timestamp: string;
  uptimeSeconds: number;
  sessionState: SessionState;
  riskScore: number; // 0 (clean) to 100 (high risk)
  activeViolationsCount: number;
  systemMetrics: {
    cpuUsagePercent?: number;
    memoryUsageMb?: number;
    displayCount: number;
    hasVirtualMachine: boolean;
    hasRemoteSession: boolean;
  };
}

export interface ServerHeartbeatResponse {
  receivedAt: string;
  serverTime: string;
  command?: 'NOOP' | 'PAUSE' | 'TERMINATE' | 'FORCE_REFRESH';
  commandReason?: string;
  isConfigRevoked: boolean;
}
