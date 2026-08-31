export class PermissionPolicyEngine {
    media;
    clipboard;
    allowFullscreen;
    constructor(config) {
        this.media = config.mediaPermissions;
        this.clipboard = config.clipboardPolicy;
        this.allowFullscreen = true; // Kiosk operates in fullscreen
    }
    /**
     * Determine whether a specific browser permission request is allowed
     */
    checkPermission(permission) {
        switch (permission) {
            case 'media':
            case 'camera':
                return this.media.allowCamera;
            case 'microphone':
            case 'audio-capture':
                return this.media.allowMicrophone;
            case 'geolocation':
                return this.media.allowGeolocation;
            case 'notifications':
                return this.media.allowNotifications;
            case 'clipboard-read':
                return this.clipboard === 'PASTE_ONLY' || this.clipboard === 'FULL';
            case 'clipboard-sanitized-write':
                return this.clipboard === 'COPY_ONLY' || this.clipboard === 'FULL';
            case 'display-capture':
                return false; // Always deny screen capture within browser
            case 'fullscreen':
            case 'pointerLock':
                return true;
            case 'openExternal':
            default:
                return false; // Deny all other external protocol requests
        }
    }
}
//# sourceMappingURL=permission-policy.js.map