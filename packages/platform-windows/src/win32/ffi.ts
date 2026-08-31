import * as os from 'node:os';

export const isWindows = os.platform() === 'win32';

let koffiInstance: any = null;
let user32Lib: any = null;
let kernel32Lib: any = null;
let wtsapi32Lib: any = null;

if (isWindows) {
  try {
    const koffiModule = await import('koffi');
    koffiInstance = koffiModule.default || koffiModule;
    user32Lib = koffiInstance.load('user32.dll');
    kernel32Lib = koffiInstance.load('kernel32.dll');
    try {
      wtsapi32Lib = koffiInstance.load('wtsapi32.dll');
    } catch {
      // Optional wtsapi32
    }
  } catch (err) {
    console.warn('[Platform-Windows] Native Koffi FFI could not be loaded; falling back to mock mode:', err);
  }
}

export { koffiInstance, user32Lib, kernel32Lib, wtsapi32Lib };
