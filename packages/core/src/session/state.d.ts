import type { SessionState } from '../types/index.js';
export interface StateTransitionEvent {
    from: SessionState;
    to: SessionState;
    reason?: string;
    timestamp: string;
}
export declare class SessionStateMachine {
    private currentState;
    private history;
    private listeners;
    constructor(initialState?: SessionState);
    getState(): SessionState;
    getHistory(): readonly StateTransitionEvent[];
    subscribe(listener: (event: StateTransitionEvent) => void): () => void;
    /**
     * Validate and perform state transition
     */
    transitionTo(newState: SessionState, reason?: string): boolean;
}
//# sourceMappingURL=state.d.ts.map