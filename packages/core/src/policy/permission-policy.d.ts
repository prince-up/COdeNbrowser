import type { ExamConfiguration } from '../config/schema.js';
export type BrowserPermissionType = 'camera' | 'microphone' | 'geolocation' | 'notifications' | 'midi' | 'midiSysex' | 'pointerLock' | 'fullscreen' | 'openExternal' | 'clipboard-read' | 'clipboard-sanitized-write' | 'display-capture';
export declare class PermissionPolicyEngine {
    private media;
    private clipboard;
    private allowFullscreen;
    constructor(config: ExamConfiguration);
    /**
     * Determine whether a specific browser permission request is allowed
     */
    checkPermission(permission: string): boolean;
}
//# sourceMappingURL=permission-policy.d.ts.map