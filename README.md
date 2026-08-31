# COdeNbrowser — Production-Grade Secure Examination System

An independent, production-ready **Secure Examination Environment & Assessment Platform** with native OS kiosk lockdown (Windows 10/11), built-in **MCQ & Coding Question Authoring**, sandboxed **multi-language code execution**, asymmetric cryptographic verification (**Ed25519 / AES-256-GCM**), and a real-time **Proctor Operations Console**.

---

## 🌟 Key Features

### 1. Hardened Desktop Client (`@seb/client`)
- **Native Kiosk Mode**: Fullscreen, topmost window cloaking taskbar, start menu, and desktop.
- **Win32 Low-Level Keyboard Hook (`WH_KEYBOARD_LL`)**: Blocks `Alt+Tab`, `Windows Key`, `Alt+F4`, `Ctrl+Esc`, `PrintScreen`, `F11`, `F12`.
- **Screen Capture Shield**: Uses Windows `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` — prevents screenshots and screen recordings (OBS, Discord, Teams, Snipping Tool produce a blank black screen).
- **Display Topology & Hotplug Watcher**: Detects and enforces single-monitor exams; locks session if a secondary display or HDMI is plugged in.
- **Pre-Flight Diagnostics**: Evaluates hypervisor presence (VM detection), Remote Desktop (RDP / Terminal Services), and scans for prohibited background apps (Discord, Telegram, Chrome, Cheat Engine).
- **Native Clipboard Sanitizer**: Prevents external copy/paste leakage via `EmptyClipboard`.

### 2. Built-In Exam Authoring & Examination Room (`@seb/server`)
- **Admin Authoring Console**: Create exams with MCQs and interactive Coding problems (with input/output test cases and starter code).
- **Sandboxed Code Execution Engine**: Runs student code in **Python (3.x)** and **JavaScript (Node.js)** against test cases in real time with execution timeout protection.
- **Integrated Student Exam Room**: Fullscreen interactive testing environment with question navigator, live countdown timer, and automatic score calculation.

### 3. Asymmetric Cryptography & Security
- **Ed25519 Digital Signatures**: Every `.examconfig` is digitally signed over **RFC 8785 Canonical JSON**.
- **AES-256-GCM Encryption**: Configuration payloads can be symmetrically encrypted with password-derived keys (PBKDF2).
- **Heartbeats & Live Telemetry**: Client sends 10-second heartbeats with risk scores (0–100) and security violation event streams.
- **Emergency Configuration Revocation (CRL)**: Revoke compromised configurations in real-time.

---

## 📂 Project Structure

```
COdeNbrowser/
├── packages/
│   ├── core/                  # Pure TypeScript domain, crypto (Ed25519, AES-GCM), policy engines
│   ├── platform-windows/      # Win32 FFI bindings (Koffi), keyboard hooks, display affinity, VM/RDP
│   ├── client/                # Electron desktop app (Pre-flight UI, Kiosk window, Browser guard)
│   ├── config-tool/           # Administrator CLI (npx seb-config keygen / create / verify)
│   ├── server/                # Fastify backend, sandbox code runner, auto-grading, and REST API
│   └── admin-dashboard/       # Web-based Proctor Console & Exam Authoring Portal
│
├── tests/
│   └── penetration/           # 8 automated penetration-style security bypass tests
│
└── docs/                      # Comprehensive technical architecture and user guides
    ├── ARCHITECTURE.md
    ├── THREAT_MODEL.md
    ├── LIMITATIONS.md
    ├── RECOVERY.md
    ├── ADMIN_GUIDE.md
    ├── STUDENT_GUIDE.md
    ├── LICENSES.md
    └── SECURITY_REPORT.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+ or v20+)
- Windows 10 or Windows 11

### 2. Install Dependencies & Build
```powershell
npm install
npm run build
```

### 3. Run Automated Tests
```powershell
npm test
```
*(All 31 unit, integration, and penetration bypass tests pass with 100% success rate)*

---

## 🖥️ Running the System

### Step 1: Start the Backend Server & Sandbox Runner
```powershell
npm run start:server
```
*(Runs on `http://localhost:8080`)*

### Step 2: Start the Administrator Console
```powershell
npm run start:admin
```
*(Open `http://localhost:5173` in your browser to author exams or monitor live sessions)*

### Step 3: Launch the Student Desktop Application
```powershell
npm run start:client
```

---

## 📜 Documentation

- [System Architecture](docs/ARCHITECTURE.md)
- [Formal Threat Model & Attack Matrix](docs/THREAT_MODEL.md)
- [Technical Boundaries & Limitations](docs/LIMITATIONS.md)
- [Emergency Recovery Runbook](docs/RECOVERY.md)
- [Administrator & Proctor Manual](docs/ADMIN_GUIDE.md)
- [Student User Guide](docs/STUDENT_GUIDE.md)
- [Open Source Licensing Audit](docs/LICENSES.md)
- [Security & Penetration Test Report](docs/SECURITY_REPORT.md)

---

## 📄 License
This project is licensed under the permissive **MIT License**.
