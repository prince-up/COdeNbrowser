import { z } from 'zod';
export declare const ProcessRuleSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    action: z.ZodEnum<["ALLOW", "WARN", "BLOCK", "TERMINATE_EXAM"]>;
    pathPatterns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    sha256Hashes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    windowTitles: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    action: "ALLOW" | "WARN" | "BLOCK" | "TERMINATE_EXAM";
    pathPatterns: string[];
    sha256Hashes: string[];
    windowTitles: string[];
    description?: string | undefined;
}, {
    name: string;
    action: "ALLOW" | "WARN" | "BLOCK" | "TERMINATE_EXAM";
    description?: string | undefined;
    pathPatterns?: string[] | undefined;
    sha256Hashes?: string[] | undefined;
    windowTitles?: string[] | undefined;
}>;
export type ProcessRule = z.infer<typeof ProcessRuleSchema>;
export declare const URLRuleSchema: z.ZodObject<{
    pattern: z.ZodString;
    action: z.ZodEnum<["ALLOW", "BLOCK"]>;
    description: z.ZodOptional<z.ZodString>;
    allowSubdomains: z.ZodDefault<z.ZodBoolean>;
    allowedMethods: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    action: "ALLOW" | "BLOCK";
    pattern: string;
    allowSubdomains: boolean;
    allowedMethods: string[];
    description?: string | undefined;
}, {
    action: "ALLOW" | "BLOCK";
    pattern: string;
    description?: string | undefined;
    allowSubdomains?: boolean | undefined;
    allowedMethods?: string[] | undefined;
}>;
export type URLRule = z.infer<typeof URLRuleSchema>;
export declare const ExamConfigurationSchema: z.ZodObject<{
    configurationId: z.ZodString;
    configurationVersion: z.ZodDefault<z.ZodString>;
    examId: z.ZodString;
    examName: z.ZodString;
    organization: z.ZodString;
    createdAt: z.ZodString;
    validUntil: z.ZodString;
    minClientVersion: z.ZodDefault<z.ZodString>;
    maxClientVersion: z.ZodOptional<z.ZodString>;
    startURL: z.ZodString;
    allowedURLs: z.ZodDefault<z.ZodArray<z.ZodObject<{
        pattern: z.ZodString;
        action: z.ZodEnum<["ALLOW", "BLOCK"]>;
        description: z.ZodOptional<z.ZodString>;
        allowSubdomains: z.ZodDefault<z.ZodBoolean>;
        allowedMethods: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        action: "ALLOW" | "BLOCK";
        pattern: string;
        allowSubdomains: boolean;
        allowedMethods: string[];
        description?: string | undefined;
    }, {
        action: "ALLOW" | "BLOCK";
        pattern: string;
        description?: string | undefined;
        allowSubdomains?: boolean | undefined;
        allowedMethods?: string[] | undefined;
    }>, "many">>;
    blockedURLs: z.ZodDefault<z.ZodArray<z.ZodObject<{
        pattern: z.ZodString;
        action: z.ZodEnum<["ALLOW", "BLOCK"]>;
        description: z.ZodOptional<z.ZodString>;
        allowSubdomains: z.ZodDefault<z.ZodBoolean>;
        allowedMethods: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        action: "ALLOW" | "BLOCK";
        pattern: string;
        allowSubdomains: boolean;
        allowedMethods: string[];
        description?: string | undefined;
    }, {
        action: "ALLOW" | "BLOCK";
        pattern: string;
        description?: string | undefined;
        allowSubdomains?: boolean | undefined;
        allowedMethods?: string[] | undefined;
    }>, "many">>;
    allowedProtocols: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    blockedProtocols: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    navigationPolicy: z.ZodObject<{
        allowBackForward: z.ZodDefault<z.ZodBoolean>;
        allowReload: z.ZodDefault<z.ZodBoolean>;
        allowAddressBar: z.ZodDefault<z.ZodBoolean>;
        allowNewTabs: z.ZodDefault<z.ZodBoolean>;
        allowNewWindows: z.ZodDefault<z.ZodBoolean>;
        allowDevTools: z.ZodDefault<z.ZodBoolean>;
        allowInspectElement: z.ZodDefault<z.ZodBoolean>;
        allowViewSource: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        allowBackForward: boolean;
        allowReload: boolean;
        allowAddressBar: boolean;
        allowNewTabs: boolean;
        allowNewWindows: boolean;
        allowDevTools: boolean;
        allowInspectElement: boolean;
        allowViewSource: boolean;
    }, {
        allowBackForward?: boolean | undefined;
        allowReload?: boolean | undefined;
        allowAddressBar?: boolean | undefined;
        allowNewTabs?: boolean | undefined;
        allowNewWindows?: boolean | undefined;
        allowDevTools?: boolean | undefined;
        allowInspectElement?: boolean | undefined;
        allowViewSource?: boolean | undefined;
    }>;
    popupPolicy: z.ZodDefault<z.ZodEnum<["BLOCK_ALL", "ALLOW_SAME_DOMAIN", "ALLOW_WHITELIST"]>>;
    clipboardPolicy: z.ZodDefault<z.ZodEnum<["DISABLED", "COPY_ONLY", "PASTE_ONLY", "FULL"]>>;
    downloadPolicy: z.ZodDefault<z.ZodEnum<["BLOCK_ALL", "ALLOW_WHITELIST", "ALLOW_ALL"]>>;
    uploadPolicy: z.ZodDefault<z.ZodEnum<["BLOCK_ALL", "ALLOW_WHITELIST", "ALLOW_ALL"]>>;
    printingPolicy: z.ZodObject<{
        allowPrinting: z.ZodDefault<z.ZodBoolean>;
        allowedPrinters: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        allowPrinting: boolean;
        allowedPrinters: string[];
    }, {
        allowPrinting?: boolean | undefined;
        allowedPrinters?: string[] | undefined;
    }>;
    displayPolicy: z.ZodObject<{
        allowMultipleDisplays: z.ZodDefault<z.ZodBoolean>;
        actionOnMultipleDisplays: z.ZodDefault<z.ZodEnum<["ALLOW", "WARN", "LOCK", "END_SESSION"]>>;
        actionOnDisplayChange: z.ZodDefault<z.ZodEnum<["ALLOW", "WARN", "LOCK", "END_SESSION"]>>;
    }, "strip", z.ZodTypeAny, {
        allowMultipleDisplays: boolean;
        actionOnMultipleDisplays: "ALLOW" | "WARN" | "LOCK" | "END_SESSION";
        actionOnDisplayChange: "ALLOW" | "WARN" | "LOCK" | "END_SESSION";
    }, {
        allowMultipleDisplays?: boolean | undefined;
        actionOnMultipleDisplays?: "ALLOW" | "WARN" | "LOCK" | "END_SESSION" | undefined;
        actionOnDisplayChange?: "ALLOW" | "WARN" | "LOCK" | "END_SESSION" | undefined;
    }>;
    screenCapturePolicy: z.ZodObject<{
        enableWindowDisplayAffinity: z.ZodDefault<z.ZodBoolean>;
        allowScreenshots: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enableWindowDisplayAffinity: boolean;
        allowScreenshots: boolean;
    }, {
        enableWindowDisplayAffinity?: boolean | undefined;
        allowScreenshots?: boolean | undefined;
    }>;
    virtualMachinePolicy: z.ZodObject<{
        action: z.ZodDefault<z.ZodEnum<["ALLOW", "WARN", "BLOCK"]>>;
    }, "strip", z.ZodTypeAny, {
        action: "ALLOW" | "WARN" | "BLOCK";
    }, {
        action?: "ALLOW" | "WARN" | "BLOCK" | undefined;
    }>;
    remoteSessionPolicy: z.ZodObject<{
        action: z.ZodDefault<z.ZodEnum<["ALLOW", "WARN", "BLOCK"]>>;
    }, "strip", z.ZodTypeAny, {
        action: "ALLOW" | "WARN" | "BLOCK";
    }, {
        action?: "ALLOW" | "WARN" | "BLOCK" | undefined;
    }>;
    mediaPermissions: z.ZodObject<{
        allowCamera: z.ZodDefault<z.ZodBoolean>;
        allowMicrophone: z.ZodDefault<z.ZodBoolean>;
        allowGeolocation: z.ZodDefault<z.ZodBoolean>;
        allowNotifications: z.ZodDefault<z.ZodBoolean>;
        allowWebRTC: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        allowCamera: boolean;
        allowMicrophone: boolean;
        allowGeolocation: boolean;
        allowNotifications: boolean;
        allowWebRTC: boolean;
    }, {
        allowCamera?: boolean | undefined;
        allowMicrophone?: boolean | undefined;
        allowGeolocation?: boolean | undefined;
        allowNotifications?: boolean | undefined;
        allowWebRTC?: boolean | undefined;
    }>;
    processPolicy: z.ZodObject<{
        defaultAction: z.ZodDefault<z.ZodEnum<["ALLOW", "WARN", "BLOCK"]>>;
        rules: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            action: z.ZodEnum<["ALLOW", "WARN", "BLOCK", "TERMINATE_EXAM"]>;
            pathPatterns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            sha256Hashes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            windowTitles: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            action: "ALLOW" | "WARN" | "BLOCK" | "TERMINATE_EXAM";
            pathPatterns: string[];
            sha256Hashes: string[];
            windowTitles: string[];
            description?: string | undefined;
        }, {
            name: string;
            action: "ALLOW" | "WARN" | "BLOCK" | "TERMINATE_EXAM";
            description?: string | undefined;
            pathPatterns?: string[] | undefined;
            sha256Hashes?: string[] | undefined;
            windowTitles?: string[] | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        defaultAction: "ALLOW" | "WARN" | "BLOCK";
        rules: {
            name: string;
            action: "ALLOW" | "WARN" | "BLOCK" | "TERMINATE_EXAM";
            pathPatterns: string[];
            sha256Hashes: string[];
            windowTitles: string[];
            description?: string | undefined;
        }[];
    }, {
        defaultAction?: "ALLOW" | "WARN" | "BLOCK" | undefined;
        rules?: {
            name: string;
            action: "ALLOW" | "WARN" | "BLOCK" | "TERMINATE_EXAM";
            description?: string | undefined;
            pathPatterns?: string[] | undefined;
            sha256Hashes?: string[] | undefined;
            windowTitles?: string[] | undefined;
        }[] | undefined;
    }>;
    securityProfile: z.ZodDefault<z.ZodEnum<["MANAGED_DEVICE", "BYOD"]>>;
    heartbeatIntervalSeconds: z.ZodDefault<z.ZodNumber>;
    networkFailurePolicy: z.ZodObject<{
        action: z.ZodDefault<z.ZodEnum<["CONTINUE", "PAUSE", "LOCK", "TERMINATE"]>>;
        gracePeriodSeconds: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        action: "LOCK" | "CONTINUE" | "PAUSE" | "TERMINATE";
        gracePeriodSeconds: number;
    }, {
        action?: "LOCK" | "CONTINUE" | "PAUSE" | "TERMINATE" | undefined;
        gracePeriodSeconds?: number | undefined;
    }>;
    quitPolicy: z.ZodObject<{
        requireExitPassword: z.ZodDefault<z.ZodBoolean>;
        exitPasswordHash: z.ZodOptional<z.ZodString>;
        allowQuitBeforeExamStart: z.ZodDefault<z.ZodBoolean>;
        allowQuitAfterSubmit: z.ZodDefault<z.ZodBoolean>;
        exitUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        requireExitPassword: boolean;
        allowQuitBeforeExamStart: boolean;
        allowQuitAfterSubmit: boolean;
        exitPasswordHash?: string | undefined;
        exitUrl?: string | undefined;
    }, {
        requireExitPassword?: boolean | undefined;
        exitPasswordHash?: string | undefined;
        allowQuitBeforeExamStart?: boolean | undefined;
        allowQuitAfterSubmit?: boolean | undefined;
        exitUrl?: string | undefined;
    }>;
    serverEndpoint: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    configurationId: string;
    configurationVersion: string;
    examId: string;
    examName: string;
    organization: string;
    createdAt: string;
    validUntil: string;
    minClientVersion: string;
    startURL: string;
    allowedURLs: {
        action: "ALLOW" | "BLOCK";
        pattern: string;
        allowSubdomains: boolean;
        allowedMethods: string[];
        description?: string | undefined;
    }[];
    blockedURLs: {
        action: "ALLOW" | "BLOCK";
        pattern: string;
        allowSubdomains: boolean;
        allowedMethods: string[];
        description?: string | undefined;
    }[];
    allowedProtocols: string[];
    blockedProtocols: string[];
    navigationPolicy: {
        allowBackForward: boolean;
        allowReload: boolean;
        allowAddressBar: boolean;
        allowNewTabs: boolean;
        allowNewWindows: boolean;
        allowDevTools: boolean;
        allowInspectElement: boolean;
        allowViewSource: boolean;
    };
    popupPolicy: "BLOCK_ALL" | "ALLOW_WHITELIST" | "ALLOW_SAME_DOMAIN";
    clipboardPolicy: "DISABLED" | "COPY_ONLY" | "PASTE_ONLY" | "FULL";
    downloadPolicy: "BLOCK_ALL" | "ALLOW_WHITELIST" | "ALLOW_ALL";
    uploadPolicy: "BLOCK_ALL" | "ALLOW_WHITELIST" | "ALLOW_ALL";
    printingPolicy: {
        allowPrinting: boolean;
        allowedPrinters: string[];
    };
    displayPolicy: {
        allowMultipleDisplays: boolean;
        actionOnMultipleDisplays: "ALLOW" | "WARN" | "LOCK" | "END_SESSION";
        actionOnDisplayChange: "ALLOW" | "WARN" | "LOCK" | "END_SESSION";
    };
    screenCapturePolicy: {
        enableWindowDisplayAffinity: boolean;
        allowScreenshots: boolean;
    };
    virtualMachinePolicy: {
        action: "ALLOW" | "WARN" | "BLOCK";
    };
    remoteSessionPolicy: {
        action: "ALLOW" | "WARN" | "BLOCK";
    };
    mediaPermissions: {
        allowCamera: boolean;
        allowMicrophone: boolean;
        allowGeolocation: boolean;
        allowNotifications: boolean;
        allowWebRTC: boolean;
    };
    processPolicy: {
        defaultAction: "ALLOW" | "WARN" | "BLOCK";
        rules: {
            name: string;
            action: "ALLOW" | "WARN" | "BLOCK" | "TERMINATE_EXAM";
            pathPatterns: string[];
            sha256Hashes: string[];
            windowTitles: string[];
            description?: string | undefined;
        }[];
    };
    securityProfile: "MANAGED_DEVICE" | "BYOD";
    heartbeatIntervalSeconds: number;
    networkFailurePolicy: {
        action: "LOCK" | "CONTINUE" | "PAUSE" | "TERMINATE";
        gracePeriodSeconds: number;
    };
    quitPolicy: {
        requireExitPassword: boolean;
        allowQuitBeforeExamStart: boolean;
        allowQuitAfterSubmit: boolean;
        exitPasswordHash?: string | undefined;
        exitUrl?: string | undefined;
    };
    maxClientVersion?: string | undefined;
    serverEndpoint?: string | undefined;
}, {
    configurationId: string;
    examId: string;
    examName: string;
    organization: string;
    createdAt: string;
    validUntil: string;
    startURL: string;
    navigationPolicy: {
        allowBackForward?: boolean | undefined;
        allowReload?: boolean | undefined;
        allowAddressBar?: boolean | undefined;
        allowNewTabs?: boolean | undefined;
        allowNewWindows?: boolean | undefined;
        allowDevTools?: boolean | undefined;
        allowInspectElement?: boolean | undefined;
        allowViewSource?: boolean | undefined;
    };
    printingPolicy: {
        allowPrinting?: boolean | undefined;
        allowedPrinters?: string[] | undefined;
    };
    displayPolicy: {
        allowMultipleDisplays?: boolean | undefined;
        actionOnMultipleDisplays?: "ALLOW" | "WARN" | "LOCK" | "END_SESSION" | undefined;
        actionOnDisplayChange?: "ALLOW" | "WARN" | "LOCK" | "END_SESSION" | undefined;
    };
    screenCapturePolicy: {
        enableWindowDisplayAffinity?: boolean | undefined;
        allowScreenshots?: boolean | undefined;
    };
    virtualMachinePolicy: {
        action?: "ALLOW" | "WARN" | "BLOCK" | undefined;
    };
    remoteSessionPolicy: {
        action?: "ALLOW" | "WARN" | "BLOCK" | undefined;
    };
    mediaPermissions: {
        allowCamera?: boolean | undefined;
        allowMicrophone?: boolean | undefined;
        allowGeolocation?: boolean | undefined;
        allowNotifications?: boolean | undefined;
        allowWebRTC?: boolean | undefined;
    };
    processPolicy: {
        defaultAction?: "ALLOW" | "WARN" | "BLOCK" | undefined;
        rules?: {
            name: string;
            action: "ALLOW" | "WARN" | "BLOCK" | "TERMINATE_EXAM";
            description?: string | undefined;
            pathPatterns?: string[] | undefined;
            sha256Hashes?: string[] | undefined;
            windowTitles?: string[] | undefined;
        }[] | undefined;
    };
    networkFailurePolicy: {
        action?: "LOCK" | "CONTINUE" | "PAUSE" | "TERMINATE" | undefined;
        gracePeriodSeconds?: number | undefined;
    };
    quitPolicy: {
        requireExitPassword?: boolean | undefined;
        exitPasswordHash?: string | undefined;
        allowQuitBeforeExamStart?: boolean | undefined;
        allowQuitAfterSubmit?: boolean | undefined;
        exitUrl?: string | undefined;
    };
    configurationVersion?: string | undefined;
    minClientVersion?: string | undefined;
    maxClientVersion?: string | undefined;
    allowedURLs?: {
        action: "ALLOW" | "BLOCK";
        pattern: string;
        description?: string | undefined;
        allowSubdomains?: boolean | undefined;
        allowedMethods?: string[] | undefined;
    }[] | undefined;
    blockedURLs?: {
        action: "ALLOW" | "BLOCK";
        pattern: string;
        description?: string | undefined;
        allowSubdomains?: boolean | undefined;
        allowedMethods?: string[] | undefined;
    }[] | undefined;
    allowedProtocols?: string[] | undefined;
    blockedProtocols?: string[] | undefined;
    popupPolicy?: "BLOCK_ALL" | "ALLOW_WHITELIST" | "ALLOW_SAME_DOMAIN" | undefined;
    clipboardPolicy?: "DISABLED" | "COPY_ONLY" | "PASTE_ONLY" | "FULL" | undefined;
    downloadPolicy?: "BLOCK_ALL" | "ALLOW_WHITELIST" | "ALLOW_ALL" | undefined;
    uploadPolicy?: "BLOCK_ALL" | "ALLOW_WHITELIST" | "ALLOW_ALL" | undefined;
    securityProfile?: "MANAGED_DEVICE" | "BYOD" | undefined;
    heartbeatIntervalSeconds?: number | undefined;
    serverEndpoint?: string | undefined;
}>;
export type ExamConfiguration = z.infer<typeof ExamConfigurationSchema>;
export interface SignedExamConfigFile {
    format: 'SEB_CONFIG_ENCRYPTED_V1' | 'SEB_CONFIG_SIGNED_V1';
    header: {
        configurationId: string;
        examId: string;
        algorithm: 'Ed25519';
        createdAt: string;
        validUntil: string;
        keyId: string;
    };
    signature: string;
    publicKey: string;
    payload: ExamConfiguration | string;
    encryption?: {
        algorithm: 'AES-256-GCM';
        iv: string;
        authTag: string;
        keyDerivation?: 'PBKDF2-SHA256' | 'SCRYPT';
        salt?: string;
    };
}
//# sourceMappingURL=schema.d.ts.map