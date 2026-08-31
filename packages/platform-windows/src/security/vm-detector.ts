import { execSync } from 'node:child_process';
import * as os from 'node:os';

export interface VMDetectionResult {
  isVM: boolean;
  confidence: 'PHYSICAL' | 'LIKELY_VM' | 'UNKNOWN';
  indicators: string[];
  systemManufacturer?: string;
  systemModel?: string;
  biosVersion?: string;
}

export class VirtualMachineDetector {
  private static readonly KNOWN_VM_STRINGS = [
    'vmware',
    'virtualbox',
    'vbox',
    'qemu',
    'bochs',
    'kvm',
    'hyper-v',
    'xen',
    'parallels',
    'red hat',
    'virtio',
    'innotek gmbh',
    'microsoft corporation virtual machine',
  ];

  private static readonly KNOWN_VM_MACS = [
    '00:05:69', // VMware
    '00:0c:29', // VMware
    '00:50:56', // VMware
    '08:00:27', // VirtualBox
    '52:54:00', // QEMU / KVM
    '00:15:5d', // Hyper-V
  ];

  /**
   * Perform multi-signal virtualization diagnostics
   */
  public static detect(): VMDetectionResult {
    const indicators: string[] = [];
    let manufacturer = '';
    let model = '';
    let bios = '';

    // Check Network Interfaces MAC Address prefixes
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const addrs = interfaces[name];
      if (addrs) {
        for (const addr of addrs) {
          if (addr.mac) {
            const prefix = addr.mac.toLowerCase().substring(0, 8);
            if (this.KNOWN_VM_MACS.includes(prefix)) {
              indicators.push(`Virtual network adapter MAC prefix: ${prefix} (${name})`);
            }
          }
        }
      }
    }

    if (os.platform() === 'win32') {
      try {
        // Query system hardware metadata via PowerShell WMI
        const cmd = 'powershell.exe -NoProfile -Command "Get-CimInstance Win32_ComputerSystem | Select-Object -Property Manufacturer, Model | ConvertTo-Json; Get-CimInstance Win32_BIOS | Select-Object -Property SerialNumber, Version | ConvertTo-Json"';
        const output = execSync(cmd, { encoding: 'utf8', timeout: 4000 });

        const outputLower = output.toLowerCase();
        for (const marker of this.KNOWN_VM_STRINGS) {
          if (outputLower.includes(marker)) {
            indicators.push(`Hardware identifier string matched virtualization vendor: '${marker}'`);
          }
        }

        // Parse JSON parts if possible
        const lines = output.trim().split('\n');
        for (const line of lines) {
          if (line.includes('"Manufacturer"')) {
            manufacturer = line.split(':')[1]?.replace(/[",]/g, '').trim() || '';
          }
          if (line.includes('"Model"')) {
            model = line.split(':')[1]?.replace(/[",]/g, '').trim() || '';
          }
        }
      } catch (err) {
        // Fallback or permission check
      }
    }

    const isVM = indicators.length > 0;
    const confidence = isVM ? 'LIKELY_VM' : 'PHYSICAL';

    return {
      isVM,
      confidence,
      indicators,
      systemManufacturer: manufacturer,
      systemModel: model,
      biosVersion: bios,
    };
  }
}
