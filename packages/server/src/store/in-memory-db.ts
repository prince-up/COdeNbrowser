import type {
  ExamConfiguration,
  SignedExamConfigFile,
  SecurityEvent,
  ClientHeartbeatPayload,
  SessionState,
} from '@seb/core';

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean; // Hidden test cases only tested on final submission
}

export interface MCQQuestion {
  id: string;
  type: 'MCQ';
  title: string;
  question: string;
  options: string[];
  correctOptionIndex: number; // 0-based
  points: number;
}

export interface CodingQuestion {
  id: string;
  type: 'CODING';
  title: string;
  description: string;
  languages: ('javascript' | 'python' | 'cpp' | 'java')[];
  starterCode: Record<string, string>; // lang -> code template
  testCases: TestCase[];
  points: number;
}

export type ExamQuestionItem = MCQQuestion | CodingQuestion;

export interface AuthorExamRecord {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  createdAt: string;
  questions: ExamQuestionItem[];
  totalPoints: number;
  configurationId: string;
  signedConfig?: SignedExamConfigFile;
}

export interface StudentAnswer {
  questionId: string;
  selectedOptionIndex?: number; // for MCQ
  code?: string; // for Coding
  language?: string;
}

export interface QuestionGradingResult {
  questionId: string;
  type: 'MCQ' | 'CODING';
  earnedPoints: number;
  maxPoints: number;
  isCorrect: boolean;
  details?: string;
}

export interface StudentSubmission {
  id: string;
  examId: string;
  sessionId: string;
  studentName: string;
  studentId: string;
  submittedAt: string;
  answers: StudentAnswer[];
  totalScore: number;
  maxScore: number;
  percentage: number;
  questionResults: QuestionGradingResult[];
}

export interface ActiveSessionRecord {
  sessionId: string;
  examId: string;
  configurationId: string;
  clientVersion: string;
  startedAt: string;
  lastHeartbeatAt: string;
  status: SessionState;
  riskScore: number;
  ipAddress: string;
  violationsCount: number;
  forcedCommand?: 'NOOP' | 'PAUSE' | 'TERMINATE' | 'FORCE_REFRESH';
  forcedCommandReason?: string;
}

export class ExamServerDatabase {
  public static instance = new ExamServerDatabase();

  public trustedPublicKeys = new Map<string, string>(); // keyId -> publicKeyPem
  public registeredConfigs = new Map<string, SignedExamConfigFile>(); // configId -> SignedExamConfigFile
  public revokedConfigIds = new Set<string>(); // Set of revoked config IDs
  public activeSessions = new Map<string, ActiveSessionRecord>(); // sessionId -> ActiveSessionRecord
  public heartbeatHistory = new Map<string, ClientHeartbeatPayload[]>(); // sessionId -> heartbeats
  public securityEvents: SecurityEvent[] = []; // In-memory audit log

  // Authored Exams & Submissions Store
  public authoredExams = new Map<string, AuthorExamRecord>(); // examId -> AuthorExamRecord
  public studentSubmissions = new Map<string, StudentSubmission[]>(); // examId -> StudentSubmission[]

  private constructor() {
    this.seedSampleExam();
  }

  public registerTrustedKey(keyId: string, publicKeyPem: string): void {
    this.trustedPublicKeys.set(keyId, publicKeyPem);
  }

  public registerConfig(signedConfig: SignedExamConfigFile): void {
    this.registeredConfigs.set(signedConfig.header.configurationId, signedConfig);
  }

  public revokeConfig(configId: string): boolean {
    this.revokedConfigIds.add(configId);
    return true;
  }

  public isConfigRevoked(configId: string): boolean {
    return this.revokedConfigIds.has(configId);
  }

  public recordEvent(event: SecurityEvent): void {
    this.securityEvents.push(event);
    if (this.securityEvents.length > 5000) {
      this.securityEvents.shift();
    }
  }

  public saveAuthoredExam(exam: AuthorExamRecord): void {
    this.authoredExams.set(exam.id, exam);
  }

  public getAuthoredExam(examId: string): AuthorExamRecord | undefined {
    return this.authoredExams.get(examId);
  }

  public saveSubmission(submission: StudentSubmission): void {
    const list = this.studentSubmissions.get(submission.examId) || [];
    list.push(submission);
    this.studentSubmissions.set(submission.examId, list);
  }

  public getSubmissions(examId: string): StudentSubmission[] {
    return this.studentSubmissions.get(examId) || [];
  }

  private seedSampleExam(): void {
    const sampleExam: AuthorExamRecord = {
      id: 'CS-101-DEMO',
      title: 'Computer Science & Programming Fundamentals',
      description: 'Online Examination featuring Multiple Choice Questions and Interactive Coding Problems.',
      durationMinutes: 60,
      createdAt: new Date().toISOString(),
      configurationId: 'demo-config-uuid-101',
      totalPoints: 30,
      questions: [
        {
          id: 'q1',
          type: 'MCQ',
          title: 'Algorithm Complexity',
          question: 'What is the worst-case time complexity of binary search on a sorted array of N elements?',
          options: ['O(1)', 'O(N)', 'O(log N)', 'O(N log N)'],
          correctOptionIndex: 2,
          points: 5,
        },
        {
          id: 'q2',
          type: 'MCQ',
          title: 'Data Structures',
          question: 'Which data structure operates on a Last-In, First-Out (LIFO) principle?',
          options: ['Queue', 'Stack', 'Array', 'Linked List'],
          correctOptionIndex: 1,
          points: 5,
        },
        {
          id: 'q3',
          type: 'CODING',
          title: 'Two Sum Problem',
          description: 'Given an array of integers `nums` and an integer `target`, return the sum of the first two numbers in the array.\n\nInput format: Two lines. Line 1: Space-separated integers. Line 2: target integer.\nOutput format: Single integer representing the sum of the first two elements.',
          languages: ['python', 'javascript'],
          starterCode: {
            python: 'import sys\n\ndef solve():\n    lines = sys.stdin.read().strip().split("\\n")\n    if not lines or not lines[0]:\n        return\n    nums = list(map(int, lines[0].split()))\n    # Calculate sum of first two elements\n    result = nums[0] + nums[1]\n    print(result)\n\nif __name__ == "__main__":\n    solve()\n',
            javascript: 'const fs = require("fs");\nconst input = fs.readFileSync(0, "utf-8").trim().split("\\n");\nconst nums = input[0].trim().split(" ").map(Number);\nconsole.log(nums[0] + nums[1]);\n',
          },
          testCases: [
            { id: 'tc1', input: '2 7 11 15\n9', expectedOutput: '9', isHidden: false },
            { id: 'tc2', input: '3 2 4\n6', expectedOutput: '5', isHidden: false },
            { id: 'tc3', input: '100 200 500\n300', expectedOutput: '300', isHidden: true },
          ],
          points: 20,
        },
      ],
    };
    this.authoredExams.set(sampleExam.id, sampleExam);
  }
}
