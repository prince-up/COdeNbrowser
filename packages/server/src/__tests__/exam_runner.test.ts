import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../server.js';
import { CodeRunnerService } from '../services/code-runner-service.js';

describe('Exam Authoring, Code Execution & Grading Tests', () => {
  const app = buildServer();
  const codeRunner = new CodeRunnerService();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('executes JavaScript code in sandbox and returns stdout', async () => {
    const jsCode = 'const fs = require("fs"); const nums = fs.readFileSync(0, "utf-8").trim().split(" ").map(Number); console.log(nums[0] + nums[1]);';
    const result = await codeRunner.runCode(jsCode, 'javascript', '15 25\n');
    expect(result.stdout).toBe('40');
    expect(result.timedOut).toBe(false);
  });

  it('executes Python code in sandbox and returns stdout', async () => {
    const pyCode = 'import sys\nline = sys.stdin.read().strip()\na, b = map(int, line.split())\nprint(a * b)\n';
    const result = await codeRunner.runCode(pyCode, 'python', '6 7\n');
    expect(result.stdout).toBe('42');
    expect(result.timedOut).toBe(false);
  });

  it('detects and terminates infinite loops safely (Timeout Protection)', async () => {
    const infiniteCode = 'while(true) {}';
    const result = await codeRunner.runCode(infiniteCode, 'javascript', '', 1000);
    expect(result.timedOut).toBe(true);
    expect(result.error).toContain('timed out');
  });

  it('creates and publishes new exam with MCQs and Coding problems', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/exams',
      payload: {
        examId: 'TEST-AUTOGRADED-101',
        title: 'Full Stack & Algorithms Test',
        description: 'Comprehensive assessment',
        durationMinutes: 45,
        exitPassword: 'AdminExit2026!',
        questions: [
          {
            id: 'mcq1',
            type: 'MCQ',
            title: 'HTTP Status Codes',
            question: 'Which status code indicates Success in HTTP?',
            options: ['200 OK', '404 Not Found', '500 Internal Error', '301 Redirect'],
            correctOptionIndex: 0,
            points: 10,
          },
          {
            id: 'code1',
            type: 'CODING',
            title: 'Multiply Two Numbers',
            description: 'Read two numbers and print their product.',
            languages: ['javascript'],
            starterCode: { javascript: 'console.log(0);' },
            testCases: [
              { id: 'tc1', input: '3 4\n', expectedOutput: '12', isHidden: false },
              { id: 'tc2', input: '10 5\n', expectedOutput: '50', isHidden: true },
            ],
            points: 20,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(json.examId).toBe('TEST-AUTOGRADED-101');
    expect(json.configDownloadUrl).toBeDefined();
    expect(json.totalPoints).toBe(30);
  });

  it('grades complete student submission with MCQs and hidden coding test cases', async () => {
    const studentCode = 'const fs = require("fs"); const [a, b] = fs.readFileSync(0, "utf-8").trim().split(" ").map(Number); console.log(a * b);';

    const submitRes = await app.inject({
      method: 'POST',
      url: '/api/v1/exams/TEST-AUTOGRADED-101/submit',
      payload: {
        studentName: 'Alice Student',
        studentId: 'STU-9901',
        answers: [
          { questionId: 'mcq1', selectedOptionIndex: 0 }, // Correct (+10)
          { questionId: 'code1', code: studentCode, language: 'javascript' }, // Correct (+20)
        ],
      },
    });

    expect(submitRes.statusCode).toBe(200);
    const subJson = JSON.parse(submitRes.body);
    expect(subJson.totalScore).toBe(30);
    expect(subJson.maxScore).toBe(30);
    expect(subJson.percentage).toBe(100);
    expect(subJson.questionResults.length).toBe(2);
    expect(subJson.questionResults[0].isCorrect).toBe(true);
    expect(subJson.questionResults[1].isCorrect).toBe(true);
  });
});
