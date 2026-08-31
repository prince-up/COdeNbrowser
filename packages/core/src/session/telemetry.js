import * as crypto from 'node:crypto';
export class SecurityEventBuffer {
    events = [];
    maxBufferSize;
    constructor(maxBufferSize = 500) {
        this.maxBufferSize = maxBufferSize;
    }
    record(sessionId, examId, eventType, severity, message, metadata) {
        const event = {
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
    getUnsentEvents() {
        return [...this.events];
    }
    clearSent(ids) {
        const idSet = new Set(ids);
        this.events = this.events.filter((e) => !idSet.has(e.id));
    }
    getAll() {
        return this.events;
    }
}
//# sourceMappingURL=telemetry.js.map