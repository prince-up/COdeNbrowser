import { isWindows, user32Lib } from '../win32/ffi.js';

export interface RDPSessionResult {
  isRemoteSession: boolean;
  isRemoteControlled: boolean;
  indicators: string[];
  sessionName?: string;
}

export class RemoteSessionDetector {
  private static readonly SM_REMOTESESSION = 0x1000; // 4096
  private static readonly SM_REMOTECONTROL = 0x2001; // 8193

  public static detect(): RDPSessionResult {
    const indicators: string[] = [];
    let isRemoteSession = false;
    let isRemoteControlled = false;

    // 1. Check Windows System Metrics
    if (isWindows && user32Lib) {
      try {
        const GetSystemMetrics = user32Lib.func('int __stdcall GetSystemMetrics(int nIndex)');
        const remSession = GetSystemMetrics(this.SM_REMOTESESSION);
        if (remSession !== 0) {
          isRemoteSession = true;
          indicators.push('GetSystemMetrics(SM_REMOTESESSION) returned non-zero (Active RDP/Terminal Services session)');
        }

        const remControl = GetSystemMetrics(this.SM_REMOTECONTROL);
        if (remControl !== 0) {
          isRemoteControlled = true;
          indicators.push('GetSystemMetrics(SM_REMOTECONTROL) returned non-zero (Session is remotely controlled)');
        }
      } catch (err) {
        // Ignored
      }
    }

    // 2. Check Session Name environment variables
    const sessionName = process.env.SESSIONNAME || '';
    if (sessionName.toUpperCase().startsWith('RDP-') || sessionName.toUpperCase().startsWith('ICA-')) {
      isRemoteSession = true;
      indicators.push(`Environment variable SESSIONNAME indicates remote protocol: '${sessionName}'`);
    }

    if (process.env.SSH_CLIENT || process.env.SSH_TTY) {
      indicators.push('SSH remote session environment variable detected');
    }

    return {
      isRemoteSession: isRemoteSession || isRemoteControlled || indicators.length > 0,
      isRemoteControlled,
      indicators,
      sessionName,
    };
  }
}
