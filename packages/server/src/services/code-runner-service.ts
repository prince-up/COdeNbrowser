import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import type { TestCase } from '../store/in-memory-db.js';

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
    const runId = crypto.randomUUID();
    const runDir = path.join(CodeRunnerService.tempBaseDir, runId);
    fs.mkdirSync(runDir, { recursive: true });

    const startTime = Date.now();

    try {
      if (language === 'javascript') {
        const scriptPath = path.join(runDir, 'solution.js');
        fs.writeFileSync(scriptPath, code, 'utf8');
        const res = await this.executeProcess('node', ['solution.js'], runDir, input, timeoutMs);
        return {
          stdout: res.stdout,
          stderr: res.stderr,
          timedOut: res.timedOut,
          error: res.timedOut ? `Execution timed out (> ${timeoutMs}ms)` : res.error,
          executionTimeMs: Date.now() - startTime,
        };
      }

      if (language === 'python') {
        const scriptPath = path.join(runDir, 'solution.py');
        fs.writeFileSync(scriptPath, code, 'utf8');
        const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
        const res = await this.executeProcess(pyCmd, ['solution.py'], runDir, input, timeoutMs);
        return {
          stdout: res.stdout,
          stderr: res.stderr,
          timedOut: res.timedOut,
          error: res.timedOut ? `Execution timed out (> ${timeoutMs}ms)` : res.error,
          executionTimeMs: Date.now() - startTime,
        };
      }

      if (language === 'c') {
        const srcPath = path.join(runDir, 'solution.c');
        const binName = process.platform === 'win32' ? 'solution.exe' : './solution';
        fs.writeFileSync(srcPath, code, 'utf8');

        // Compile C
        const comp = await this.executeProcess('gcc', ['-O2', 'solution.c', '-o', process.platform === 'win32' ? 'solution.exe' : 'solution', '-lm'], runDir, '', 10000);
        if (comp.code !== 0 || comp.error) {
          return {
            stdout: '',
            stderr: comp.stderr || comp.error || 'C Compilation Failed',
            error: 'Compilation Error',
            timedOut: false,
            executionTimeMs: Date.now() - startTime,
          };
        }

        // Run C Binary
        const runRes = await this.executeProcess(binName, [], runDir, input, timeoutMs);
        return {
          stdout: runRes.stdout,
          stderr: runRes.stderr,
          timedOut: runRes.timedOut,
          error: runRes.timedOut ? `Execution timed out (> ${timeoutMs}ms)` : runRes.error,
          executionTimeMs: Date.now() - startTime,
        };
      }

      if (language === 'cpp') {
        const srcPath = path.join(runDir, 'solution.cpp');
        const binName = process.platform === 'win32' ? 'solution.exe' : './solution';
        fs.writeFileSync(srcPath, code, 'utf8');

        // Compile C++
        const comp = await this.executeProcess('g++', ['-O2', '-std=c++17', 'solution.cpp', '-o', process.platform === 'win32' ? 'solution.exe' : 'solution'], runDir, '', 10000);
        if (comp.code !== 0 || comp.error) {
          return {
            stdout: '',
            stderr: comp.stderr || comp.error || 'C++ Compilation Failed',
            error: 'Compilation Error',
            timedOut: false,
            executionTimeMs: Date.now() - startTime,
          };
        }

        // Run C++ Binary
        const runRes = await this.executeProcess(binName, [], runDir, input, timeoutMs);
        return {
          stdout: runRes.stdout,
          stderr: runRes.stderr,
          timedOut: runRes.timedOut,
          error: runRes.timedOut ? `Execution timed out (> ${timeoutMs}ms)` : runRes.error,
          executionTimeMs: Date.now() - startTime,
        };
      }

      if (language === 'java') {
        // Extract class name or default to Solution
        let className = 'Solution';
        const match = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
        if (match && match[1]) {
          className = match[1];
        }
        const srcPath = path.join(runDir, `${className}.java`);
        fs.writeFileSync(srcPath, code, 'utf8');

        // Compile Java
        const comp = await this.executeProcess('javac', [`${className}.java`], runDir, '', 10000);
        if (comp.code !== 0 || comp.error) {
          return {
            stdout: '',
            stderr: comp.stderr || comp.error || 'Java Compilation Failed',
            error: 'Compilation Error',
            timedOut: false,
            executionTimeMs: Date.now() - startTime,
          };
        }

        // Run Java
        const runRes = await this.executeProcess('java', ['-cp', '.', className], runDir, input, timeoutMs);
        return {
          stdout: runRes.stdout,
          stderr: runRes.stderr,
          timedOut: runRes.timedOut,
          error: runRes.timedOut ? `Execution timed out (> ${timeoutMs}ms)` : runRes.error,
          executionTimeMs: Date.now() - startTime,
        };
      }

      return {
        stdout: '',
        stderr: `Unsupported language: ${language}`,
        error: 'Unsupported Language',
        timedOut: false,
        executionTimeMs: 0,
      };
    } finally {
      try {
        fs.rmSync(runDir, { recursive: true, force: true });
      } catch {}
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
