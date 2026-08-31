import type { SessionState } from '../types/index.js';

export interface StateTransitionEvent {
  from: SessionState;
  to: SessionState;
  reason?: string;
  timestamp: string;
}

export class SessionStateMachine {
  private currentState: SessionState = 'UNINITIALIZED';
  private history: StateTransitionEvent[] = [];
  private listeners: ((event: StateTransitionEvent) => void)[] = [];

  constructor(initialState: SessionState = 'UNINITIALIZED') {
    this.currentState = initialState;
  }

  public getState(): SessionState {
    return this.currentState;
  }

  public getHistory(): readonly StateTransitionEvent[] {
    return this.history;
  }

  public subscribe(listener: (event: StateTransitionEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Validate and perform state transition
   */
  public transitionTo(newState: SessionState, reason?: string): boolean {
    const validTransitions: Record<SessionState, SessionState[]> = {
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

    const event: StateTransitionEvent = {
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
      } catch (err) {
        console.error('[SessionStateMachine] Listener error:', err);
      }
    }

    return true;
  }
}
