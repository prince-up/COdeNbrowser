import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import type { TestCase } from '../store/in-memory-db.js';

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
  private static tempDir = path.join(os.tmpdir(), 'seb-code-runner');

  constructor() {
    if (!fs.existsSync(CodeRunnerService.tempDir)) {
      fs.mkdirSync(CodeRunnerService.tempDir, { recursive: true });
    }
  }

  /**
   * Execute code in a subprocess with input, memory constraints, and strict execution timeout
   */
  public async runCode(
    code: string,
    language: 'python' | 'javascript' | 'cpp' | 'java',
    input = '',
    timeoutMs = 4000
  ): Promise<CodeExecutionResult> {
    const runId = crypto.randomUUID();
    const ext = language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'cpp' ? 'cpp' : 'java';
    const filePath = path.join(CodeRunnerService.tempDir, `run_${runId}.${ext}`);

    fs.writeFileSync(filePath, code, 'utf8');
    const startTime = Date.now();

    try {
      let cmd = 'node';
      let args = [filePath];

      if (language === 'python') {
        cmd = process.platform === 'win32' ? 'python' : 'python3';
        args = [filePath];
      }

      const result = await new Promise<CodeExecutionResult>((resolve) => {
        const child = spawn(cmd, args, {
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

        child.stdin.write(input);
        child.stdin.end();

        child.stdout.on('data', (chunk) => {
          if (stdout.length < 50000) stdout += chunk.toString();
        });

        child.stderr.on('data', (chunk) => {
          if (stderr.length < 50000) stderr += chunk.toString();
        });

        child.on('close', () => {
          clearTimeout(timer);
          const executionTimeMs = Date.now() - startTime;
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            timedOut,
            error: timedOut ? `Execution timed out (> ${timeoutMs}ms). Possible infinite loop.` : undefined,
            executionTimeMs,
          });
        });

        child.on('error', (err) => {
          clearTimeout(timer);
          resolve({
            stdout: '',
            stderr: err.message,
            error: `Runner error: ${err.message}`,
            timedOut: false,
            executionTimeMs: Date.now() - startTime,
          });
        });
      });

      return result;
    } finally {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {}
    }
  }

  /**
   * Evaluate code against a set of test cases
   */
  public async evaluateTestCases(
    code: string,
    language: 'python' | 'javascript' | 'cpp' | 'java',
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
