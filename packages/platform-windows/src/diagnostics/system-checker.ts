import type { SystemDiagnosticsReport, DiagnosticItem, ExamConfiguration } from '@seb/core';
import { ProcessPolicyEngine } from '@seb/core';
import { DisplayTopologyMonitor } from '../display/display-monitor.js';
import { RemoteSessionDetector } from '../security/rdp-detector.js';
import { VirtualMachineDetector } from '../security/vm-detector.js';
import { ProcessMonitorService } from '../process/process-scanner.js';
import { ManagedKioskManager } from '../kiosk/managed-kiosk.js';

export class SystemPreflightChecker {
  public static async runDiagnostics(config: ExamConfiguration): Promise<SystemDiagnosticsReport> {
    const items: DiagnosticItem[] = [];
    const profile = config.securityProfile;

    // 1. Display Topology Check
    const displayMonitor = new DisplayTopologyMonitor();
    const displayCount = displayMonitor.getDisplayCount();
    if (!config.displayPolicy.allowMultipleDisplays && displayCount > 1) {
      items.push({
        id: 'display-topology',
        name: 'Display Topology & Multi-Monitor Check',
        category: 'HARDWARE',
        status: 'FAIL',
        details: `${displayCount} connected monitors detected. Single display required.`,
        remediation: 'Disconnect secondary displays, HDMI cables, and wireless display adapters before starting.',
        requiresAdmin: false,
      });
    } else {
      items.push({
        id: 'display-topology',
        name: 'Display Topology Check',
        category: 'HARDWARE',
        status: 'PASS',
        details: `${displayCount} active monitor(s) connected. Complies with exam policy.`,
        requiresAdmin: false,
      });
    }

    // 2. Remote Session / RDP Check
    const rdpResult = RemoteSessionDetector.detect();
    if (rdpResult.isRemoteSession && config.remoteSessionPolicy.action === 'BLOCK') {
      items.push({
        id: 'remote-session',
        name: 'Remote Session & RDP Detection',
        category: 'SECURITY',
        status: 'FAIL',
        details: `Active remote desktop or remote assistance session detected: ${rdpResult.indicators.join('; ')}`,
        remediation: 'Close all Remote Desktop (RDP), AnyDesk, TeamViewer, and remote-control sessions.',
        requiresAdmin: false,
      });
    } else {
      items.push({
        id: 'remote-session',
        name: 'Remote Session Detection',
        category: 'SECURITY',
        status: 'PASS',
        details: 'No active remote desktop or screen sharing control detected.',
        requiresAdmin: false,
      });
    }

    // 3. Virtual Machine / Hypervisor Check
    const vmResult = VirtualMachineDetector.detect();
    if (vmResult.isVM && config.virtualMachinePolicy.action === 'BLOCK') {
      items.push({
        id: 'vm-hypervisor',
        name: 'Virtual Machine / Hypervisor Detection',
        category: 'ENVIRONMENT',
        status: 'FAIL',
        details: `Virtualization environment detected: ${vmResult.indicators.join('; ')}`,
        remediation: 'This examination must be executed directly on physical hardware, not inside a virtual machine.',
        requiresAdmin: false,
      });
    } else if (vmResult.isVM && config.virtualMachinePolicy.action === 'WARN') {
      items.push({
        id: 'vm-hypervisor',
        name: 'Virtual Machine / Hypervisor Detection',
        category: 'ENVIRONMENT',
        status: 'WARN',
        details: `Virtualization indicators detected (${vmResult.indicators.join('; ')}), but allowed with warning.`,
        requiresAdmin: false,
      });
    } else {
      items.push({
        id: 'vm-hypervisor',
        name: 'Virtual Machine Check',
        category: 'ENVIRONMENT',
        status: 'PASS',
        details: 'Physical hardware detected. No known virtualization platform identified.',
        requiresAdmin: false,
      });
    }

    // 4. Prohibited Process Scan
    const procPolicy = new ProcessPolicyEngine(config);
    const procScanner = new ProcessMonitorService(procPolicy);
    const runningProcs = procScanner.getRunningProcesses();

    const blockedProcs = runningProcs.filter((p) => {
      const res = procPolicy.evaluate(p);
      return res.action === 'BLOCK' || res.action === 'TERMINATE_EXAM';
    });

    if (blockedProcs.length > 0) {
      const names = blockedProcs.map((p) => p.name).join(', ');
      items.push({
        id: 'prohibited-processes',
        name: 'Prohibited Process & Application Scanner',
        category: 'SECURITY',
        status: 'FAIL',
        details: `Prohibited applications running in background: ${names}`,
        remediation: `Please close the following unauthorized programs: ${names}`,
        requiresAdmin: false,
      });
    } else {
      items.push({
        id: 'prohibited-processes',
        name: 'Prohibited Process Scanner',
        category: 'SECURITY',
        status: 'PASS',
        details: `Scanned ${runningProcs.length} running processes. No unauthorized applications detected.`,
        requiresAdmin: false,
      });
    }

    // 5. Managed Profile / Privilege Check
    const isAdmin = ManagedKioskManager.isAdministrator();
    if (profile === 'MANAGED_DEVICE' && !isAdmin) {
      items.push({
        id: 'security-profile',
        name: 'University-Managed Kiosk Profile Check',
        category: 'INTEGRITY',
        status: 'WARN',
        details: 'Running Managed Device profile without Administrator privileges. Falling back to application-level kiosk mode.',
        remediation: 'For full OS-level lockdown, launch the application as Administrator or via MDM Assigned Access.',
        requiresAdmin: true,
      });
    } else {
      items.push({
        id: 'security-profile',
        name: 'Security Profile Verification',
        category: 'INTEGRITY',
        status: 'PASS',
        details: `Operating in ${profile} mode.`,
        requiresAdmin: false,
      });
    }

    const overallPassed = items.every((item) => item.status !== 'FAIL');

    return {
      timestamp: new Date().toISOString(),
      profile,
      overallPassed,
      items,
    };
  }
}
