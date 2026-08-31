# Student User Guide

## 1. System Requirements

- **Operating System**: Windows 10 (version 1903 or higher) or Windows 11
- **Hardware**: Single physical display (laptop screen or single desktop monitor)
- **Internet**: Stable broadband internet connection
- **Permissions**: Standard user account (Administrator privileges not required for BYOD mode)

---

## 2. Preparing Your Computer Before the Exam

Before launching the Secure Exam Browser:
1. **Disconnect External Displays**: Unplug secondary monitors, HDMI cables, and wireless display adapters.
2. **Close Prohibited Applications**:
   - Web browsers (Chrome, Firefox, Edge)
   - Messaging apps (Discord, Telegram, WhatsApp, Slack)
   - Screen recorders (OBS Studio, Camtasia, Snipping Tool)
   - Remote desktop & sharing software (AnyDesk, TeamViewer)
3. **Ensure Stable Power**: Connect your laptop to a power adapter.

---

## 3. Starting Your Examination

1. Double-click the `.examconfig` file provided by your instructor (or launch the **Secure Exam Browser** application).
2. The application will open the **Pre-Flight System Diagnostics** screen.
3. Review the diagnostics table:
   - *Display Topology*: Checks for single monitor
   - *Remote Session*: Verifies no screen sharing is active
   - *Virtual Machine*: Verifies running on physical hardware
   - *Prohibited Process Scanner*: Checks background apps
4. If any check displays `FAIL`, read the red **Action Required** box at the top and resolve the warning (e.g. "Close Discord.exe").
5. Once all checks display `PASS`, the **START SECURE EXAM** button will activate.
6. Click **START SECURE EXAM** to enter the locked-down exam environment.

---

## 4. During the Examination

- The application enters fullscreen kiosk mode.
- System hotkeys (`Alt+Tab`, `Windows Key`, `Alt+F4`, `PrintScreen`) and browser developer tools (`F12`, `Ctrl+Shift+I`) are blocked.
- You can only navigate to authorized examination web pages. Clicking unauthorized links will show an "Unauthorized Examination URL" warning.
- Do not attempt to take screenshots or record the screen; screen capture utilities will produce a black screen.

---

## 5. Submitting and Exiting

1. Complete and submit your exam on the webpage.
2. Click **Exit Application** or follow the submit redirect URL.
3. If configured by your institution, ask the proctor to enter the exit authorization password.
4. The application will cleanly restore your normal Windows desktop environment.
