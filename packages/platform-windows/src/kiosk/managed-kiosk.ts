import { execSync } from 'node:child_process';
import { isWindows } from '../win32/ffi.js';

export interface ManagedPolicyState {
  taskManagerDisabled: boolean;
  lockWorkstationDisabled: boolean;
  changePasswordDisabled: boolean;
}

export class ManagedKioskManager {
  private static readonly REG_SYSTEM_POLICIES = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System';

  /**
   * Check if current process has elevated Administrator privileges
   */
  public static isAdministrator(): boolean {
    if (!isWindows) return false;
    try {
      execSync('net session', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Apply Windows Group Policy registry lockdown (Managed Devices only)
   */
  public static applyManagedLockdown(): boolean {
    if (!isWindows) return true;

    try {
      // Disable Task Manager
      execSync(`reg.exe add "${this.REG_SYSTEM_POLICIES}" /v DisableTaskMgr /t REG_DWORD /d 1 /f`, { stdio: 'ignore' });
      // Disable Lock Workstation
      execSync(`reg.exe add "${this.REG_SYSTEM_POLICIES}" /v DisableLockWorkstation /t REG_DWORD /d 1 /f`, { stdio: 'ignore' });
      // Disable Change Password
      execSync(`reg.exe add "${this.REG_SYSTEM_POLICIES}" /v DisableChangePassword /t REG_DWORD /d 1 /f`, { stdio: 'ignore' });
      return true;
    } catch (err) {
      console.warn('[ManagedKioskManager] Could not apply registry policies (requires appropriate permissions):', err);
      return false;
    }
  }

  /**
   * Fail-safe restoration: restore all registry policies to normal
   */
  public static removeManagedLockdown(): boolean {
    if (!isWindows) return true;

    try {
      execSync(`reg.exe delete "${this.REG_SYSTEM_POLICIES}" /v DisableTaskMgr /f`, { stdio: 'ignore' });
      execSync(`reg.exe delete "${this.REG_SYSTEM_POLICIES}" /v DisableLockWorkstation /f`, { stdio: 'ignore' });
      execSync(`reg.exe delete "${this.REG_SYSTEM_POLICIES}" /v DisableChangePassword /f`, { stdio: 'ignore' });
      return true;
    } catch (err) {
      // Ignore if keys were already deleted
      return true;
    }
  }
}
