# Technical Limitations & Security Boundaries

## 1. Introduction & Security Philosophy

The Secure Examination System is engineered to provide the strongest possible security controls on Windows 10/11 using legitimate, operating-system-supported APIs. We explicitly **do not** employ malware-like techniques, rootkits, or kernel drivers that destabilize the operating system, corrupt user files, or bypass Windows Defender.

As a university examination system, it is vital to understand what the software **can** guarantee, and what is outside the technical boundaries of userland software.

---

## 2. Managed University Computers vs. Student BYOD Computers

| Security Capability | Managed University PC (Profile A) | Student BYOD PC (Profile B) |
| :--- | :--- | :--- |
| **URL & Navigation Lockdown** | 100% Guaranteed | 100% Guaranteed |
| **Browser DevTools & Extensions Denial** | 100% Guaranteed | 100% Guaranteed |
| **Screen Capture Blocker (`SetWindowDisplayAffinity`)** | 100% Guaranteed | 100% Guaranteed (Windows 10/11) |
| **Keyboard Hotkey Interception (`WH_KEYBOARD_LL`)** | 100% (`Alt+Tab`, `WinKey`, `Alt+F4`, `F11/F12`) | 100% (`Alt+Tab`, `WinKey`, `Alt+F4`, `F11/F12`) |
| **Ctrl+Alt+Delete (SAS) Interception** | **Guaranteed via GPO Policies** (`DisableTaskMgr`, `DisableLockWorkstation`) | **Cannot be trapped by user-space apps** (Windows Security Architecture constraint) |
| **OS Kernel & Ring-0 Integrity** | **Guaranteed via WDAC / AppLocker** | **Owned by Student / Admin User** |
| **Single-App Kiosk Mode** | **Guaranteed via Assigned Access / Shell Launcher** | **Application-Level Fullscreen Kiosk** |

---

## 3. Inherent Limitations & Residual Risks

### A. The Secure Attention Sequence (`Ctrl+Alt+Delete`)
In the Windows NT architecture, `Ctrl+Alt+Delete` is reserved by the OS kernel as the Secure Attention Sequence (SAS). An unprivileged user-mode application on a personal computer (BYOD) cannot intercept `Ctrl+Alt+Delete`.
- **On Managed PCs**: Group Policy Objects configured by the university system administrator suppress Task Manager, Switch User, and Lock Workstation.
- **On BYOD PCs**: If a student presses `Ctrl+Alt+Delete` to open Task Manager, the Secure Exam Browser detects the loss of window focus (`WINDOW_FOCUS_LOST`), logs an immediate critical security alert to the proctor's dashboard, and attempts to refocus the window.

### B. Hardware & Physical Vector Threats
No desktop software can prevent physical cheating methods:
1. **External Physical Devices**: A student pointing a smartphone camera at their monitor to take photos of questions.
2. **Hardware Video Splitters**: An external HDMI splitter splitting the video signal to an external hardware display recorder before it reaches the monitor.
3. **Second Computer**: A second computer, tablet, or textbook sitting on the desk next to the examination computer.
*Mitigation*: In-person proctoring or webcam-based remote proctoring is necessary to detect physical room violations.

### C. Bare-Metal Virtual Machine Spoofing
While the Secure Exam Browser checks CPUID hypervisor bits, WMI BIOS metadata, network adapter MAC prefixes, and virtual display drivers, a sophisticated attacker running a custom-compiled Linux KVM kernel with custom patched ACPI tables may evade standard userland VM detection.
*Mitigation*: For high-stakes examinations, run on university-managed lab computers with hardware attestation (TPM 2.0 / Secure Boot).

### D. Memory Injection & Rootkits
If a student installs a Ring-0 kernel driver on their personal computer prior to launching the exam, that driver has higher privileges than any user-mode desktop application.
*Mitigation*: The system uses SHA-256 process hashing, window title matching, and process watchdog monitoring to catch known cheating utilities (Cheat Engine, Process Hacker).
