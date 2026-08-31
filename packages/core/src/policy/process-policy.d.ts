import type { ExamConfiguration, ProcessRule } from '../config/schema.js';
import type { ProcessPolicyAction } from '../types/index.js';
export interface ProcessInfo {
    pid: number;
    name: string;
    exePath?: string;
    windowTitle?: string;
    sha256Hash?: string;
}
export interface ProcessEvaluationResult {
    action: ProcessPolicyAction;
    reason: string;
    matchedRule?: ProcessRule;
    process: ProcessInfo;
}
export declare class ProcessPolicyEngine {
    private defaultAction;
    private rules;
    constructor(config: ExamConfiguration);
    /**
     * Evaluate a running or newly spawned process against the active exam process policy
     */
    evaluate(proc: ProcessInfo): ProcessEvaluationResult;
    private matchGlob;
}
//# sourceMappingURL=process-policy.d.ts.map