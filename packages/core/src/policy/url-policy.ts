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

export class URLPolicyEngine {
  private allowedProtocols: Set<string>;
  private blockedProtocols: Set<string>;
  private startUrl: URL;
  private allowedRules: URLRule[];
  private blockedRules: URLRule[];

  constructor(config: ExamConfiguration) {
    this.allowedProtocols = new Set(config.allowedProtocols.map((p) => p.toLowerCase().replace(/:$/, '')));
    this.blockedProtocols = new Set(config.blockedProtocols.map((p) => p.toLowerCase().replace(/:$/, '')));
    this.startUrl = new URL(config.startURL);
    this.allowedRules = config.allowedURLs;
    this.blockedRules = config.blockedURLs;
  }

  /**
   * Convert a glob pattern (e.g. "*.university.edu", "/api/*", "https://exam.edu/**") to a RegExp
   */
  private patternToRegExp(pattern: string): RegExp {
    // Escape regex characters except * and ?
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '.*')
      .replace(/(?<!\.)\*/g, '[^/]*')
      .replace(/\?/g, '.');

    return new RegExp(`^${escaped}$`, 'i');
  }

  /**
   * Check if a candidate host matches a pattern host (with optional subdomain matching)
   */
  private matchHost(candidateHost: string, patternHost: string, allowSubdomains: boolean): boolean {
    const candidate = candidateHost.toLowerCase();
    const pattern = patternHost.toLowerCase();

    if (candidate === pattern) return true;

    if (allowSubdomains) {
      if (candidate.endsWith(`.${pattern}`)) return true;
    }

    if (pattern.startsWith('*.')) {
      const baseDomain = pattern.substring(2);
      return candidate === baseDomain || candidate.endsWith(`.${baseDomain}`);
    }

    return false;
  }

  /**
   * Evaluate a navigation / network request against the active exam URL policy
   */
  public evaluate(rawUrl: string, method = 'GET'): URLPolicyResult {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return {
        allowed: false,
        reason: 'Malformed or unparseable URL syntax',
      };
    }

    const protocol = parsed.protocol.replace(/:$/, '').toLowerCase();
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;
    const port = parsed.port || (protocol === 'https' ? '443' : protocol === 'http' ? '80' : '');

    const parsedInfo = { protocol, hostname, pathname, port };

    // 1. Protocol Validation
    if (this.blockedProtocols.has(protocol)) {
      return {
        allowed: false,
        reason: `Protocol '${protocol}:' is explicitly prohibited by examination policy`,
        parsedUrl: parsedInfo,
      };
    }

    if (!this.allowedProtocols.has(protocol)) {
      return {
        allowed: false,
        reason: `Protocol '${protocol}:' is not in the allowed protocols list`,
        parsedUrl: parsedInfo,
      };
    }

    // 2. Start URL root check: if it matches the start URL base domain & path, allow by default unless blocked
    const startHost = this.startUrl.hostname.toLowerCase();
    const isStartDomain = hostname === startHost || hostname.endsWith(`.${startHost}`);

    // 3. Blacklist Rules check (Blacklist takes precedence)
    for (const rule of this.blockedRules) {
      if (this.matchesRule(rawUrl, parsed, rule)) {
        return {
          allowed: false,
          reason: `Blocked by rule: ${rule.pattern} (${rule.description || 'No description'})`,
          matchedRule: rule,
          parsedUrl: parsedInfo,
        };
      }
    }

    // 4. Whitelist Rules check
    for (const rule of this.allowedRules) {
      if (this.matchesRule(rawUrl, parsed, rule, method)) {
        return {
          allowed: true,
          reason: `Permitted by whitelist rule: ${rule.pattern}`,
          matchedRule: rule,
          parsedUrl: parsedInfo,
        };
      }
    }

    // 5. Default Start Domain rule: if no explicit whitelist rule matched but domain matches startUrl
    if (isStartDomain) {
      return {
        allowed: true,
        reason: `Allowed as descendant of examination start domain (${startHost})`,
        parsedUrl: parsedInfo,
      };
    }

    // Default DENY
    return {
      allowed: false,
      reason: `Navigation to domain '${hostname}' is not authorized in this examination`,
      parsedUrl: parsedInfo,
    };
  }

  private matchesRule(rawUrl: string, parsed: URL, rule: URLRule, method?: string): boolean {
    if (method && rule.allowedMethods && rule.allowedMethods.length > 0) {
      if (!rule.allowedMethods.includes(method.toUpperCase())) {
        return false;
      }
    }

    const pattern = rule.pattern.trim();

    // Check if pattern is a full URL or glob
    if (pattern.startsWith('http://') || pattern.startsWith('https://')) {
      const reg = this.patternToRegExp(pattern);
      return reg.test(rawUrl) || reg.test(parsed.origin + parsed.pathname);
    }

    // Pattern is domain or domain/path
    const [patternDomain, ...pathParts] = pattern.split('/');
    const patternPath = pathParts.length > 0 ? `/${pathParts.join('/')}` : '';

    if (!this.matchHost(parsed.hostname, patternDomain, rule.allowSubdomains)) {
      return false;
    }

    if (patternPath) {
      const pathReg = this.patternToRegExp(patternPath);
      return pathReg.test(parsed.pathname);
    }

    return true;
  }
}
