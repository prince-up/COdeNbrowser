export class SessionStateMachine {
    currentState = 'UNINITIALIZED';
    history = [];
    listeners = [];
    constructor(initialState = 'UNINITIALIZED') {
        this.currentState = initialState;
    }
    getState() {
        return this.currentState;
    }
    getHistory() {
        return this.history;
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    /**
     * Validate and perform state transition
     */
    transitionTo(newState, reason) {
        const validTransitions = {
            UNINITIALIZED: ['DIAGNOSTICS_IN_PROGRESS'],
            DIAGNOSTICS_IN_PROGRESS: ['READY_TO_START', 'DIAGNOSTICS_FAILED'],
            DIAGNOSTICS_FAILED: ['DIAGNOSTICS_IN_PROGRESS', 'CLEANUP_EXITED'],
            READY_TO_START: ['STARTING_KIOSK', 'CLEANUP_EXITED'],
            STARTING_KIOSK: ['EXAM_ACTIVE', 'DIAGNOSTICS_FAILED', 'CLEANUP_EXITED'],
            EXAM_ACTIVE: ['SESSION_PAUSED', 'EXAM_COMPLETED', 'EXAM_TERMINATED', 'CLEANUP_EXITED'],
            SESSION_PAUSED: ['EXAM_ACTIVE', 'EXAM_TERMINATED', 'CLEANUP_EXITED'],
            EXAM_COMPLETED: ['CLEANUP_EXITED'],
            EXAM_TERMINATED: ['CLEANUP_EXITED'],
            CLEANUP_EXITED: [],
        };
        const allowed = validTransitions[this.currentState];
        if (!allowed || !allowed.includes(newState)) {
            console.warn(`[SessionStateMachine] Invalid state transition rejected: ${this.currentState} -> ${newState}`);
            return false;
        }
        const event = {
            from: this.currentState,
            to: newState,
            reason,
            timestamp: new Date().toISOString(),
        };
        this.currentState = newState;
        this.history.push(event);
        for (const listener of this.listeners) {
            try {
                listener(event);
            }
            catch (err) {
                console.error('[SessionStateMachine] Listener error:', err);
            }
        }
        return true;
    }
}
//# sourceMappingURL=state.js.map