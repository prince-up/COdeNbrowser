import * as crypto from 'node:crypto';
import type { SecurityEvent, SecurityEventType } from '../types/index.js';

export class SecurityEventBuffer {
  private events: SecurityEvent[] = [];
  private maxBufferSize: number;

  constructor(maxBufferSize = 500) {
    this.maxBufferSize = maxBufferSize;
  }

  public record(
    sessionId: string,
    examId: string,
    eventType: SecurityEventType,
    severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'FATAL',
    message: string,
    metadata?: Record<string, unknown>
  ): SecurityEvent {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      sessionId,
      examId,
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      message,
      metadata,
    };

    this.events.push(event);
    if (this.events.length > this.maxBufferSize) {
      this.events.shift(); // keep sliding buffer of newest events
    }

    return event;
  }

  public getUnsentEvents(): SecurityEvent[] {
    return [...this.events];
  }

  public clearSent(ids: string[]): void {
    const idSet = new Set(ids);
    this.events = this.events.filter((e) => !idSet.has(e.id));
  }

  public getAll(): readonly SecurityEvent[] {
    return this.events;
  }
}
