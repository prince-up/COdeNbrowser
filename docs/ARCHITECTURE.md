# Secure Exam Browser (SEB) System Architecture

## 1. System Overview

The Secure Examination System is an independent, production-grade desktop and server ecosystem designed to deliver high-stakes online examinations within a locked-down, tamper-resistant environment on **Windows 10/11** (with cross-platform abstractions for macOS and iOS/iPadOS).

The system consists of five decoupled layers:
1. **Core Domain & Policy Engine (`@seb/core`)**: Pure TypeScript platform-independent policy engine, RFC 8785 canonical JSON serializer, Ed25519 digital signature verifier, and AES-256-GCM authenticated decryptor.
2. **Native Windows Platform Layer (`@seb/platform-windows`)**: C/Win32 low-level hooks (`WH_KEYBOARD_LL`), screen capture exclusion (`SetWindowDisplayAffinity`), display monitor topology watcher, multi-signal VM/hypervisor diagnostics, and RDP detection.
3. **Hardened Desktop Client (`@seb/client`)**: Electron native application with context isolation, process sandbox, dynamic URL policy filtering, DevTools blocking, permission denial, pre-flight diagnostic UI, and fail-safe recovery.
4. **Administrator Configuration Tool (`@seb/config-tool`)**: Standalone tool and CLI for exam administrators to create, validate, sign with Ed25519, encrypt, and export `.examconfig` files.
5. **Exam Server Backend (`@seb/server`) & Operations Dashboard (`@seb/admin-dashboard`)**: Fastify high-throughput backend with WebSockets for real-time heartbeat telemetry ingestion, client version gating, configuration revocation, and live proctor session control.

---

## 2. Layered Architecture Diagram

```
+-------------------------------------------------------------------------+
|                       ADMINISTRATOR CONSOLE                             |
|  - @seb/config-tool (GUI & CLI)         - @seb/admin-dashboard (Web)    |
|  - Ed25519 Private Key Storage           - Real-time Session Monitoring |
+------------------------------------+------------------------------------+
                                     | .examconfig Export / HTTP REST
                                     v
+-------------------------------------------------------------------------+
|                         EXAM SERVER BACKEND                             |
|  - Fastify / TypeScript REST API        - WebSocket Live Telemetry Hub  |
|  - Config Revocation List (CRL)          - Anomaly & Risk Score Engine   |
|  - Client Version Gatekeeper             - Audit Event Storage           |
+------------------------------------+------------------------------------+
                                     ^
                         Handshake & Heartbeats (10s)
                                     |
+------------------------------------+------------------------------------+
|                      STUDENT DESKTOP CLIENT                             |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | HARDENED EMBEDDED BROWSER (Chromium / WebContents)               |  |
|  | - onBeforeRequest URL Filter Engine                               |  |
|  | - Strict Permission Controller (WebRTC, Mic, Cam, Geo Deny)       |  |
|  | - DevTools & Context Menu Denial                                  |  |
|  | - Isolated Preload Bridge (ContextIsolation: true, Sandbox: true) |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | NATIVE KIOSK & WINDOWS INTEGRATION                                |  |
|  | - Low-Level Keyboard Hook (WH_KEYBOARD_LL: Alt+Tab, WinKey, F4)   |  |
|  | - SetWindowDisplayAffinity (Screen Capture Shield WDA_EXCLUDE)   |  |
|  | - Dynamic Multi-Monitor Hotplug Watcher (EnumDisplayMonitors)     |  |
|  | - Continuous Background Process Scanner (CreateToolhelp32)        |  |
|  | - Multi-Signal VM / Hypervisor & Remote Desktop (RDP) Detector  |  |
|  | - Native Clipboard Sanitizer (OpenClipboard / EmptyClipboard)    |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## 3. Cryptographic Trust Model & Configuration Format

### Digital Signatures (Ed25519)
- All `.examconfig` files are signed by the issuing university's Ed25519 private key.
- The configuration payload is serialized into canonical JSON conforming to **RFC 8785 (JSON Canonicalization Scheme - JCS)** before signing, ensuring deterministic byte-for-byte verification across platforms and language runtimes.
- The client verifies the signature against the university's trusted public key before launching the browser. Any tampering with URLs, policies, or timestamps immediately invalidates the signature and aborts startup.

### Encryption (AES-256-GCM)
- For sensitive exams requiring confidential start URLs or exit passwords, the configuration payload is encrypted using **AES-256-GCM** (authenticated encryption with associated data) derived with PBKDF2-HMAC-SHA256 (100,000 iterations).

---

## 4. Dual Security Profile Model

### Profile A: University-Managed Computers
- Joined to Active Directory, Intune, or MDM.
- Group Policy Objects (GPOs) applied to suppress Ctrl+Alt+Delete options (`DisableTaskMgr`, `DisableLockWorkstation`, `DisableChangePassword`).
- Enforced via Windows Assigned Access (Single-App Kiosk) or custom Shell Launcher.
- Complete hardware and OS integrity guarantees.

### Profile B: Student-Owned BYOD Computers
- Unmanaged Windows 10/11 laptops/desktops.
- Uses userland Win32 Low-Level Keyboard Hooks (`WH_KEYBOARD_LL`), topmost fullscreen window management, `SetWindowDisplayAffinity` screen recording protection, and continuous process watchdog.
- Transparently documented security boundaries: The OS kernel and physical hardware are student-owned, and SAS keys (`Ctrl+Alt+Delete`) are handled safely without rootkit/malware modifications.
