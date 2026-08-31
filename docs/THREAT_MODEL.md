# Formal Threat Model & Security Analysis

## 1. Threat Classification Matrix

| # | Threat Scenario | Attack Mechanism | Countermeasure / Mitigation | Residual Risk | Detection & Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T01** | **Unauthorized Navigation** | Student enters search engine URL or follows external hyperlink | `onBeforeRequest` URL filtering engine with exact host/path regex whitelisting and protocol denial | None within browser session | Navigation blocked; "Unauthorized Examination URL" displayed; `NAVIGATION_BLOCKED` event logged |
| **T02** | **App Switching & Shortcuts** | Student presses `Alt+Tab`, `Win+Tab`, `Win+D`, `Alt+F4`, `Ctrl+Esc` | Win32 `WH_KEYBOARD_LL` low-level keyboard hook swallows keys; Topmost fullscreen window re-asserts focus | SAS `Ctrl+Alt+Del` on unmanaged BYOD | Window blur triggers `WINDOW_FOCUS_LOST` event; window automatically reclaims focus |
| **T03** | **Unauthorized Background Apps** | Student runs Discord, Telegram, ChatGPT Desktop, CheatEngine | Continuous `CreateToolhelp32Snapshot` scanner checks process names, window titles, and SHA-256 binary hashes | Zero-day script without window or known signature | Process scan interval 1500ms; Triggers `BLOCK`, `WARN`, or `TERMINATE_EXAM` |
| **T04** | **Screen Recording / Sharing** | Student uses OBS, Teams, Discord, Snipping Tool, or Windows Game Bar | `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` renders window pitch-black to capture APIs | External physical phone camera pointing at monitor | Capture outputs blank black canvas; RDP session detected on launch aborts start |
| **T05** | **Virtual Machine Evasion** | Student runs exam inside VirtualBox, VMware, QEMU, Hyper-V sandbox | Multi-signal VM detection: Hypervisor CPUID bit, BIOS/Motherboard strings (WMI/Registry), Virtual display adapters, MAC prefixes | Custom kernel patched to spoof ACPI tables | System flagged as `LIKELY_VM`; policy blocks launch on startup |
| **T06** | **Secondary Display Cheating** | Student connects second screen to display unauthorized materials | `EnumDisplayMonitors` pre-check + dynamic `WM_DISPLAYCHANGE` hotplug listener | Hardware HDMI splitter cloning exact screen | Exam locked immediately upon secondary display detection (`MULTI_MONITOR_DETECTED`) |
| **T07** | **Clipboard Data Exfiltration** | Student copies exam questions or pastes external answers | Native Win32 `EmptyClipboard` on start/exit; Browser `navigator.clipboard` denied; `Ctrl+C`/`Ctrl+V` disabled | Manual transcription | Clipboard operations blocked; `CLIPBOARD_BLOCKED` logged |
| **T08** | **Configuration Tampering** | Student modifies `.examconfig` to whitelist unauthorized sites | Ed25519 digital signature over canonical RFC 8785 JSON; Server-side CRL revocation check | Compromised Admin Private Key (mitigated by rotation) | Cryptographic signature verification fails; startup aborted (`CONFIGURATION_FAILURE`) |
| **T09** | **Configuration Replay** | Student reuses an expired configuration from a previous exam | Nonce, exam ID binding, and strict `validUntil` expiration checks | Minor clock drift (<2s) | Client & server reject expired config (`isExpired: true`) |
| **T10** | **System Clock Manipulation** | Student rolls back system time to extend exam duration | Monotonic timers (`performance.now`) + Server-authoritative time sync during handshake and heartbeats | None | Server detects timestamp divergence > 30s and flags session |
| **T11** | **Local File & Protocol Infiltration** | Webpage tries `file:///C:/`, `mailto:`, `cmd:`, `powershell:` schemes | Protocol whitelist (`https:` only by default; reject all custom URI schemes and local paths) | None | Request dropped, `PROTOCOL_BLOCKED` recorded |
| **T12** | **Developer Tools Infiltration** | Student attempts `F12`, `Ctrl+Shift+I`, Inspect Element | DevTools completely disabled in Chromium webPreferences and auto-closed if triggered | None | DevTools closed immediately; `DEVTOOLS_BLOCKED` logged |
| **T13** | **Network Disconnect Evasion** | Student disconnects Wi-Fi to bypass server monitoring | Configurable network policy (`PAUSE`, `LOCK`, `TERMINATE`) with strict grace period (60s) | Short offline period | Heartbeat failure timer triggers exam pause/lock |
| **T14** | **Browser Crash Exploitation** | Web page intentionally crashes browser process to exit kiosk | Process crash listener auto-restores state or prompts for proctor authorization | Hardware power cutoff | Session marked as crashed; proctor password required to recover |
| **T15** | **Unauthorized Application Exit** | Student attempts to close window or taskbar menu | Frame and titlebar removed; window close event requires SHA-256 hashed exit password verification | Hard power reset | Session cannot be closed without proctor authorization |

---

## 2. Trust Boundaries

1. **Browser Security Boundary**: Hardened WebContents with ContextIsolation, Sandbox, and sub-request URL filtering. Webpages have zero access to Node.js APIs or local filesystem.
2. **Application Security Boundary**: Electron main process holds signing keys, communicates with Win32 APIs, and runs process watchdogs.
3. **Operating System Boundary**: On Managed Devices, GPO policies restrict SAS keys. On BYOD, low-level keyboard hooks and window affinity protect the environment without installing kernel rootkits.
4. **Server Security Boundary**: Server maintains authoritative exam time, configuration revocation lists, and validates client versions.
5. **Physical / Hardware Boundary**: Physical room proctoring is required to prevent secondary physical devices (smartphones, cameras) from capturing the screen.
