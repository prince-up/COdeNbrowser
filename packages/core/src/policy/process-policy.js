export class ProcessPolicyEngine {
    defaultAction;
    rules;
    constructor(config) {
        this.defaultAction = config.processPolicy.defaultAction;
        this.rules = config.processPolicy.rules;
    }
    /**
     * Evaluate a running or newly spawned process against the active exam process policy
     */
    evaluate(proc) {
        const procNameLower = proc.name.toLowerCase();
        for (const rule of this.rules) {
            // 1. Check exact name match
            if (rule.name.toLowerCase() === procNameLower) {
                return {
                    action: rule.action,
                    reason: `Matched process name rule '${rule.name}' (${rule.description || 'Prohibited process'})`,
                    matchedRule: rule,
                    process: proc,
                };
            }
            // 2. Check binary SHA-256 hash match
            if (proc.sha256Hash && rule.sha256Hashes.length > 0) {
                const hashMatch = rule.sha256Hashes.some((h) => h.toLowerCase() === proc.sha256Hash?.toLowerCase());
                if (hashMatch) {
                    return {
                        action: rule.action,
                        reason: `Matched prohibited binary SHA-256 signature for rule '${rule.name}'`,
                        matchedRule: rule,
                        process: proc,
                    };
                }
            }
            // 3. Check executable path patterns
            if (proc.exePath && rule.pathPatterns.length > 0) {
                for (const pattern of rule.pathPatterns) {
                    if (this.matchGlob(proc.exePath, pattern)) {
                        return {
                            action: rule.action,
                            reason: `Matched path pattern '${pattern}' for rule '${rule.name}'`,
                            matchedRule: rule,
                            process: proc,
                        };
                    }
                }
            }
            // 4. Check window title patterns
            if (proc.windowTitle && rule.windowTitles.length > 0) {
                for (const pattern of rule.windowTitles) {
                    if (this.matchGlob(proc.windowTitle, pattern)) {
                        return {
                            action: rule.action,
                            reason: `Matched window title '${pattern}' for rule '${rule.name}'`,
                            matchedRule: rule,
                            process: proc,
                        };
                    }
                }
            }
        }
        // Default policy action if no specific rule matched
        return {
            action: this.defaultAction === 'BLOCK' ? 'BLOCK' : this.defaultAction === 'WARN' ? 'WARN' : 'ALLOW',
            reason: 'No explicit rule matched; applying default action',
            process: proc,
        };
    }
    matchGlob(target, pattern) {
        const escaped = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        const regex = new RegExp(escaped, 'i');
        return regex.test(target);
    }
}
//# sourceMappingURL=process-policy.js.map