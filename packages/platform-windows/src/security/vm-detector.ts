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
    'xen',
    'parallels',
    'innotek gmbh',
    'virtual machine',
  ];

  private static readonly KNOWN_VM_MACS = [
    '00:05:69', // VMware
    '00:0c:29', // VMware
    '00:50:56', // VMware
    '08:00:27', // VirtualBox
    '52:54:00', // QEMU / KVM
  ];

  /**
   * Perform multi-signal virtualization diagnostics
   */
  public static detect(): VMDetectionResult {
    const indicators: string[] = [];
    let manufacturer = '';
    let model = '';
    let bios = '';
    let isPhysicalHost = false;

    if (os.platform() === 'win32') {
      try {
        // Query system hardware metadata via PowerShell WMI
        const cmd = 'powershell.exe -NoProfile -Command "Get-CimInstance Win32_ComputerSystem | Select-Object -Property Manufacturer, Model | ConvertTo-Json; Get-CimInstance Win32_BIOS | Select-Object -Property SerialNumber, Version, Manufacturer | ConvertTo-Json"';
        const output = execSync(cmd, { encoding: 'utf8', timeout: 3000 });
        const outputLower = output.toLowerCase();

        // Extract Manufacturer and Model
        const lines = output.trim().split('\n');
        for (const line of lines) {
          if (line.includes('"Manufacturer"')) {
            manufacturer = line.split(':')[1]?.replace(/[",]/g, '').trim() || '';
          }
          if (line.includes('"Model"')) {
            model = line.split(':')[1]?.replace(/[",]/g, '').trim() || '';
          }
          if (line.includes('"Version"')) {
            bios = line.split(':')[1]?.replace(/[",]/g, '').trim() || '';
          }
        }

        const mfgLower = manufacturer.toLowerCase();
        const modelLower = model.toLowerCase();

        // Check if explicitly a physical PC (Acer, Dell, HP, Lenovo, Asus, MSI, Apple, Gigabyte, etc.)
        const physicalVendors = ['acer', 'dell', 'hp', 'lenovo', 'asus', 'msi', 'apple', 'gigabyte', 'samsung', 'toshiba', 'framework', 'asustek', 'surface'];
        if (physicalVendors.some(v => mfgLower.includes(v) || modelLower.includes(v))) {
          isPhysicalHost = true;
        }

        // Check for VM strings in BIOS/System
        for (const marker of this.KNOWN_VM_STRINGS) {
          if (mfgLower.includes(marker) || modelLower.includes(marker) || (outputLower.includes(marker) && !isPhysicalHost)) {
            indicators.push(`Hardware identifier matched virtualization vendor: '${marker}'`);
          }
        }
      } catch (err) {
        // Fallback or permission check
      }
    }

    // Check Network Interfaces MAC Address (skip host virtual switch adapters like WSL/vEthernet)
    if (!isPhysicalHost) {
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        const nameLower = name.toLowerCase();
        // Ignore host-side virtual switches
        if (nameLower.includes('vethernet') || nameLower.includes('wsl') || nameLower.includes('docker') || nameLower.includes('virtualbox') || nameLower.includes('vmnet')) {
          continue;
        }

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
