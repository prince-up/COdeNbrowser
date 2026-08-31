import type { ExamConfiguration, URLRule } from '../config/schema.js';
export interface URLPolicyResult {
    allowed: boolean;
    reason: string;
    matchedRule?: URLRule;
    parsedUrl?: {
        protocol: string;
        hostname: string;
        pathname: string;
        port: string;
    };
}
export declare class URLPolicyEngine {
    private allowedProtocols;
    private blockedProtocols;
    private startUrl;
    private allowedRules;
    private blockedRules;
    constructor(config: ExamConfiguration);
    /**
     * Convert a glob pattern (e.g. "*.university.edu", "/api/*", "https://exam.edu/**") to a RegExp
     */
    private patternToRegExp;
    /**
     * Check if a candidate host matches a pattern host (with optional subdomain matching)
     */
    private matchHost;
    /**
     * Evaluate a navigation / network request against the active exam URL policy
     */
    evaluate(rawUrl: string, method?: string): URLPolicyResult;
    private matchesRule;
}
//# sourceMappingURL=url-policy.d.ts.map