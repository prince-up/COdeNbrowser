/**
 * Canonical JSON serialization conforming to RFC 8785 (JSON Canonicalization Scheme - JCS)
 * Ensures deterministic cryptographic hashing and digital signing regardless of key order.
 */
export function canonicalizeJson(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        const serializedElements = value.map((elem) => canonicalizeJson(elem));
        return `[${serializedElements.join(',')}]`;
    }
    const obj = value;
    const sortedKeys = Object.keys(obj).sort();
    const serializedPairs = sortedKeys.map((key) => {
        const val = obj[key];
        return `${JSON.stringify(key)}:${canonicalizeJson(val)}`;
    });
    return `{${serializedPairs.join(',')}}`;
}
//# sourceMappingURL=canonical.js.map