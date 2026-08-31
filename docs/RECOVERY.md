# Emergency Recovery & Crash Safety Procedures

## 1. Fail-Safe Philosophy

Because the Secure Exam Browser activates OS-level keyboard hooks and window controls, **under no circumstances should a crash, power outage, or network disconnect leave the student's computer permanently locked or unusable**.

The system implements multiple layers of automatic and manual recovery.

---

## 2. Automatic Fail-Safe Mechanisms

### A. OS Signal & Unhandled Exception Handlers
The application registers listeners for:
- `process.on('SIGINT')`
- `process.on('SIGTERM')`
- `process.on('uncaughtException')`
- `app.on('before-quit')`

Whenever triggered, the `SecurityOrchestrator.deactivateLockdown()` sequence executes synchronously:
1. Calls `UnhookWindowsHookEx` to release the Low-Level Keyboard Hook (`WH_KEYBOARD_LL`).
2. Stops display monitor polling timers.
3. Stops background process scanners.
4. If running in Managed Device mode, deletes any registry policy overrides (`DisableTaskMgr`, `DisableLockWorkstation`).
5. Clears and restores the Windows system clipboard.

### B. Session State Recovery & Restart
If the computer restarts or the browser crashes during an ongoing exam:
1. When the student relaunches the application, the local session state verifies the ongoing session token.
2. The client re-attaches to the examination URL and synchronizes state with the backend server.

---

## 3. Proctor Emergency Exit Procedure

If a student encounters a technical emergency (e.g. computer freeze, hardware fault):

### Method 1: Exit Password Dialog
1. Click the **Exit Application** button on the bottom bar (or press `Alt+F4` if allowed by policy).
2. The **Proctor / Exit Authorization Modal** appears.
3. Enter the configured examination exit password (e.g. `AdminExit2026!`).
4. Click **Authorize Exit**. The application cleanly shuts down all hooks and restores normal Windows desktop state.

### Method 2: Remote Proctor Termination
1. From the **Operations Console (`@seb/admin-dashboard`)**, locate the student's session.
2. Click **Terminate Session**.
3. On the next 10-second heartbeat, the client receives the `TERMINATE` command, displays the termination dialog, cleanly unhooks all OS hooks, and exits.

### Method 3: Emergency Windows Safe Mode (Managed Devices)
If an unexpected operating system failure occurs on a managed PC with registry overrides:
1. Restart the PC into **Safe Mode** (Hold `Shift` while restarting).
2. Group Policy overrides are bypassed in Safe Mode, allowing normal administrator logon and diagnostics.
