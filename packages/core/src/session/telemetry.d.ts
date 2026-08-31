import type { SecurityEvent, SecurityEventType } from '../types/index.js';
export declare class SecurityEventBuffer {
    private events;
    private maxBufferSize;
    constructor(maxBufferSize?: number);
    record(sessionId: string, examId: string, eventType: SecurityEventType, severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'FATAL', message: string, metadata?: Record<string, unknown>): SecurityEvent;
    getUnsentEvents(): SecurityEvent[];
    clearSent(ids: string[]): void;
    getAll(): readonly SecurityEvent[];
}
//# sourceMappingURL=telemetry.d.ts.map