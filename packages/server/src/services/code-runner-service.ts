import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import type { TestCase } from '../store/database.js';

export type SupportedLanguage = 'c' | 'cpp' | 'java' | 'python' | 'javascript';

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  error?: string;
  timedOut: boolean;
  executionTimeMs: number;
}

export interface TestCaseEvaluation {
  testCaseId: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string;
  timedOut: boolean;
  executionTimeMs: number;
  isHidden: boolean;
}

export class CodeRunnerService {
  private static tempBaseDir = path.join(os.tmpdir(), 'seb-code-runner');

  constructor() {
    if (!fs.existsSync(CodeRunnerService.tempBaseDir)) {
      fs.mkdirSync(CodeRunnerService.tempBaseDir, { recursive: true });
    }
  }

  private executeProcess(
    cmd: string,
    args: string[],
    cwd: string,
    input = '',
    timeoutMs = 5000
  ): Promise<{ stdout: string; stderr: string; timedOut: boolean; code: number | null; error?: string }> {
    return new Promise((resolve) => {
      const child = spawn(cmd, args, {
        cwd,
        timeout: timeoutMs,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill('SIGKILL');
        } catch {}
      }, timeoutMs);

      child.stdin.on('error', () => { /* ignore EPIPE */ });

      if (input) {
        try {
          child.stdin.write(input);
        } catch {}
      }
      try {
        child.stdin.end();
      } catch {}

      child.stdout.on('data', (chunk) => {
        if (stdout.length < 100000) stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        if (stderr.length < 100000) stderr += chunk.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          timedOut,
          code,
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          stdout: '',
          stderr: err.message,
          timedOut: false,
          code: -1,
          error: err.message,
        });
      });
    });
  }

  public async runCode(
    code: string,
    language: SupportedLanguage,
    input = '',
    timeoutMs = 5000
  ): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    
    // Base64 encode the code to pass safely via env variable
    const b64Code = Buffer.from(code).toString('base64');
    
    // We use the same 'seb-server' image that is built on the host
    const dockerImage = 'seb-server';
    const memoryLimit = '128m';
    const cpuLimit = '0.5';
    
    // Base docker command: run interactively, remove after done, limit resources, disable network
    const baseArgs = ['run', '-i', '--rm', `--memory=${memoryLimit}`, `--cpus=${cpuLimit}`, '--network=none', '-e', `CODE_B64=${b64Code}`, dockerImage, 'sh', '-c'];

    try {
      if (language === 'javascript') {
        const cmdArgs = [...baseArgs, 'echo $CODE_B64 | base64 -d > solution.js && node solution.js'];
        const res = await this.executeProcess('docker', cmdArgs, process.cwd(), input, timeoutMs);
        return {
          stdout: res.stdout,
          stderr: res.stderr,
          timedOut: res.timedOut,
          error: res.timedOut ? `Execution timed out (> ${timeoutMs}ms)` : res.error,
          executionTimeMs: Date.now() - startTime,
        };
      }

      if (language === 'python') {
        const cmdArgs = [...baseArgs, 'echo $CODE_B64 | base64 -d > solution.py && python3 solution.py'];
        const res = await this.executeProcess('docker', cmdArgs, process.cwd(), input, timeoutMs);
        return {
          stdout: res.stdout,
          stderr: res.stderr,
          timedOut: res.timedOut,
          error: res.timedOut ? `Execution timed out (> ${timeoutMs}ms)` : res.error,
          executionTimeMs: Date.now() - startTime,
        };
      }

      if (language === 'c') {
        const cmdArgs = [...baseArgs, 'echo $CODE_B64 | base64 -d > solution.c && gcc -O2 solution.c -lm && ./a.out'];
        const res = await this.executeProcess('docker', cmdArgs, process.cwd(), input, timeoutMs);
        return {
          stdout: res.stdout,
          stderr: res.stderr,
          timedOut: res.timedOut,
          error: res.timedOut ? `Execution timed out (> ${timeoutMs}ms)` : res.error,
          executionTimeMs: Date.now() - startTime,
        };
      }

      if (language === 'cpp') {
        const cmdArgs = [...baseArgs, 'echo $CODE_B64 | base64 -d > solution.cpp && g++ -O2 -std=c++17 solution.cpp && ./a.out'];
        const res = await this.executeProcess('docker', cmdArgs, process.cwd(), input, timeoutMs);
        return {
          stdout: res.stdout,
          stderr: res.stderr,
          timedOut: res.timedOut,
          error: res.timedOut ? `Execution timed out (> ${timeoutMs}ms)` : res.error,
          executionTimeMs: Date.now() - startTime,
        };
      }

      if (language === 'java') {
        const cmdArgs = [...baseArgs, 'echo $CODE_B64 | base64 -d > Solution.java && javac Solution.java && java Solution'];
        const res = await this.executeProcess('docker', cmdArgs, process.cwd(), input, timeoutMs);
        return {
          stdout: res.stdout,
          stderr: res.stderr,
          timedOut: res.timedOut,
          error: res.timedOut ? `Execution timed out (> ${timeoutMs}ms)` : res.error,
          executionTimeMs: Date.now() - startTime,
        };
      }

      return {
        stdout: '',
        stderr: '',
        timedOut: false,
        error: 'Unsupported language',
        executionTimeMs: 0,
      };
    } catch (e: any) {
      return {
        stdout: '',
        stderr: '',
        timedOut: false,
        error: e.message || 'Execution error',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  public async evaluateTestCases(
    code: string,
    language: SupportedLanguage,
    testCases: TestCase[],
    includeHidden = false
  ): Promise<TestCaseEvaluation[]> {
    const results: TestCaseEvaluation[] = [];

    for (const tc of testCases) {
      if (tc.isHidden && !includeHidden) continue;

      const runRes = await this.runCode(code, language, tc.input);
      const cleanExpected = tc.expectedOutput.trim().replace(/\r\n/g, '\n');
      const cleanActual = runRes.stdout.trim().replace(/\r\n/g, '\n');
      const passed = !runRes.timedOut && !runRes.error && cleanActual === cleanExpected;

      results.push({
        testCaseId: tc.id,
        input: tc.isHidden ? '[HIDDEN TEST CASE]' : tc.input,
        expectedOutput: tc.isHidden ? '[HIDDEN]' : tc.expectedOutput,
        actualOutput: tc.isHidden ? (passed ? '[PASSED]' : '[FAILED]') : runRes.stdout,
        passed,
        error: runRes.error || (runRes.stderr ? runRes.stderr : undefined),
        timedOut: runRes.timedOut,
        executionTimeMs: runRes.executionTimeMs,
        isHidden: tc.isHidden,
      });
    }

    return results;
  }
}
