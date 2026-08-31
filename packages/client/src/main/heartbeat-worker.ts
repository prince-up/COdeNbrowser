import type {
  ExamConfiguration,
  ClientHeartbeatPayload,
  ServerHeartbeatResponse,
  SecurityEvent,
  SecurityEventBuffer,
  SessionState,
} from '@seb/core';

export type ServerCommandHandler = (command: string, reason?: string) => void;

export class HeartbeatWorker {
  private timer: NodeJS.Timeout | null = null;
  private config: ExamConfiguration;
  private sessionId: string;
  private eventBuffer: SecurityEventBuffer;
  private onCommandHandler?: ServerCommandHandler;
  private startTime = Date.now();
  private isRunning = false;
  private consecutiveFailures = 0;

  constructor(
    config: ExamConfiguration,
    sessionId: string,
    eventBuffer: SecurityEventBuffer,
    onCommand?: ServerCommandHandler
  ) {
    this.config = config;
    this.sessionId = sessionId;
    this.eventBuffer = eventBuffer;
    this.onCommandHandler = onCommand;
  }

  public start(getState: () => SessionState): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const intervalMs = (this.config.heartbeatIntervalSeconds || 10) * 1000;
    this.timer = setInterval(async () => {
      await this.sendHeartbeat(getState());
      await this.flushEvents();
    }, intervalMs);

    // Initial heartbeat
    this.sendHeartbeat(getState()).catch(() => {});
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async sendHeartbeat(state: SessionState): Promise<void> {
    if (!this.config.serverEndpoint) return;

    const payload: ClientHeartbeatPayload = {
      sessionId: this.sessionId,
      examId: this.config.examId,
      clientVersion: '1.0.0',
      configVersion: this.config.configurationVersion,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      sessionState: state,
      riskScore: 0,
      activeViolationsCount: 0,
      systemMetrics: {
        displayCount: 1,
        hasVirtualMachine: false,
        hasRemoteSession: false,
      },
    };

    try {
      const response = await fetch(`${this.config.serverEndpoint}/api/v1/session/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        this.consecutiveFailures = 0;
        const resJson = (await response.json()) as ServerHeartbeatResponse;
        if (resJson.command && resJson.command !== 'NOOP') {
          if (this.onCommandHandler) {
            this.onCommandHandler(resJson.command, resJson.commandReason);
          }
        }
      } else {
        this.handleFailure();
      }
    } catch (err) {
      this.handleFailure();
    }
  }

  private async flushEvents(): Promise<void> {
    if (!this.config.serverEndpoint) return;

    const events = this.eventBuffer.getUnsentEvents();
    if (events.length === 0) return;

    try {
      const response = await fetch(`${this.config.serverEndpoint}/api/v1/session/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });

      if (response.ok) {
        this.eventBuffer.clearSent(events.map((e: SecurityEvent) => e.id));
      }
    } catch {
      // Retained in buffer for next cycle
    }
  }

  private handleFailure(): void {
    this.consecutiveFailures++;
    const gracePeriodCount = Math.floor((this.config.networkFailurePolicy.gracePeriodSeconds || 60) / 10);

    if (this.consecutiveFailures > gracePeriodCount) {
      const action = this.config.networkFailurePolicy.action;
      if (action === 'PAUSE' || action === 'LOCK' || action === 'TERMINATE') {
        if (this.onCommandHandler) {
          this.onCommandHandler(action, 'Network connectivity lost beyond grace period');
        }
      }
    }
  }
}
