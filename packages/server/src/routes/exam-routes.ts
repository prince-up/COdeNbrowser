import type { FastifyPluginAsync } from 'fastify';
import {
  generateEd25519KeyPair,
  signExamConfiguration,
  sha256Hex,
  type ExamConfiguration,
} from '@seb/core';
import {
  ExamServerDatabase,
  type AuthorExamRecord,
  type StudentSubmission,
  type StudentAnswer,
  type QuestionGradingResult,
} from '../store/in-memory-db.js';
import { CodeRunnerService } from '../services/code-runner-service.js';

export const examRoutes: FastifyPluginAsync = async (fastify) => {
  const db = ExamServerDatabase.instance;
  const codeRunner = new CodeRunnerService();
  const serverKeypair = generateEd25519KeyPair();
  db.registerTrustedKey(serverKeypair.keyId, serverKeypair.publicKeyPem);

  // 1. Create and Publish New Exam (with MCQs and Coding questions)
  fastify.post<{
    Body: {
      examId: string;
      title: string;
      description: string;
      durationMinutes: number;
      exitPassword?: string;
      questions: AuthorExamRecord['questions'];
      serverBaseUrl?: string;
    };
  }>('/api/v1/exams', async (request, reply) => {
    const { examId, title, description, durationMinutes, exitPassword, questions, serverBaseUrl } = request.body;

    if (!examId || !title || !questions || questions.length === 0) {
      return reply.code(400).send({ error: 'examId, title, and at least one question are required' });
    }

    const host = serverBaseUrl || 'http://localhost:8080';
    const examUrl = `${host}/exam-room/index.html?examId=${encodeURIComponent(examId)}`;
    const configId = crypto.randomUUID();
    const totalPoints = questions.reduce((acc, q) => acc + (q.points || 10), 0);

    // Build matching .examconfig
    const now = new Date();
    const validUntil = new Date(now.getTime() + (durationMinutes + 120) * 60 * 1000).toISOString();

    const config: ExamConfiguration = {
      configurationId: configId,
      configurationVersion: '1.0.0',
      examId,
      examName: title,
      organization: 'Online Examination Board',
      createdAt: now.toISOString(),
      validUntil,
      minClientVersion: '1.0.0',
      startURL: examUrl,
      allowedURLs: [
        { pattern: `${host}/**`, action: 'ALLOW', allowSubdomains: true, allowedMethods: [] },
      ],
      blockedURLs: [],
      allowedProtocols: ['http', 'https'],
      blockedProtocols: ['file', 'javascript', 'vbscript', 'data', 'about'],
      navigationPolicy: {
        allowBackForward: false,
        allowReload: true,
        allowAddressBar: false,
        allowNewTabs: false,
        allowNewWindows: false,
        allowDevTools: false,
        allowInspectElement: false,
        allowViewSource: false,
      },
      popupPolicy: 'BLOCK_ALL',
      clipboardPolicy: 'DISABLED',
      downloadPolicy: 'BLOCK_ALL',
      uploadPolicy: 'BLOCK_ALL',
      printingPolicy: { allowPrinting: false, allowedPrinters: [] },
      displayPolicy: { allowMultipleDisplays: false, actionOnMultipleDisplays: 'LOCK', actionOnDisplayChange: 'LOCK' },
      screenCapturePolicy: { enableWindowDisplayAffinity: true, allowScreenshots: false },
      virtualMachinePolicy: { action: 'BLOCK' },
      remoteSessionPolicy: { action: 'BLOCK' },
      mediaPermissions: { allowCamera: false, allowMicrophone: false, allowGeolocation: false, allowNotifications: false, allowWebRTC: true },
      processPolicy: {
        defaultAction: 'ALLOW',
        rules: [
          { name: 'discord.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: ['*Discord*'] },
          { name: 'telegram.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: ['*Telegram*'] },
          { name: 'obs64.exe', action: 'TERMINATE_EXAM', pathPatterns: [], sha256Hashes: [], windowTitles: ['*OBS*'] },
        ],
      },
      securityProfile: 'BYOD',
      heartbeatIntervalSeconds: 10,
      networkFailurePolicy: { action: 'PAUSE', gracePeriodSeconds: 60 },
      quitPolicy: {
        requireExitPassword: true,
        exitPasswordHash: sha256Hex(exitPassword || 'AdminExit2026!'),
        allowQuitBeforeExamStart: true,
        allowQuitAfterSubmit: true,
        exitUrl: `${host}/exam-room/submitted.html`,
      },
      serverEndpoint: host,
    };

    const signedConfig = signExamConfiguration(
      config,
      serverKeypair.privateKeyPem,
      serverKeypair.publicKeyPem,
      serverKeypair.keyId
    );

    db.registerConfig(signedConfig);

    const record: AuthorExamRecord = {
      id: examId,
      title,
      description: description || '',
      durationMinutes: durationMinutes || 60,
      createdAt: now.toISOString(),
      questions,
      totalPoints,
      configurationId: configId,
      signedConfig,
    };

    db.saveAuthoredExam(record);

    return reply.send({
      success: true,
      examId,
      title,
      totalPoints,
      examUrl,
      sebLaunchLink: `seb://${host.replace(/^https?:\/\//, '')}/api/v1/exams/${encodeURIComponent(examId)}/config`,
      configDownloadUrl: `/api/v1/exams/${encodeURIComponent(examId)}/config`,
      startPageUrl: `/exam/start/${encodeURIComponent(examId)}`,
    });
  });

  // 2. List All Exams
  fastify.get('/api/v1/exams', async (_request, reply) => {
    const list = Array.from(db.authoredExams.values()).map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      durationMinutes: e.durationMinutes,
      questionCount: e.questions.length,
      totalPoints: e.totalPoints,
      createdAt: e.createdAt,
    }));
    return reply.send(list);
  });

  // 3. Public Exam Details for Student Room (Hides correct answers & hidden test cases)
  fastify.get<{ Params: { id: string } }>('/api/v1/exams/:id', async (request, reply) => {
    const exam = db.getAuthoredExam(request.params.id);
    if (!exam) {
      return reply.code(404).send({ error: 'Exam not found' });
    }

    const sanitizedQuestions = exam.questions.map((q) => {
      if (q.type === 'MCQ') {
        return {
          id: q.id,
          type: 'MCQ',
          title: q.title,
          question: q.question,
          options: q.options,
          points: q.points,
        };
      } else {
        return {
          id: q.id,
          type: 'CODING',
          title: q.title,
          description: q.description,
          languages: q.languages,
          starterCode: q.starterCode,
          testCases: q.testCases.filter((tc) => !tc.isHidden).map((tc) => ({
            id: tc.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
          })),
          points: q.points,
        };
      }
    });

    return reply.send({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      durationMinutes: exam.durationMinutes,
      totalPoints: exam.totalPoints,
      questions: sanitizedQuestions,
    });
  });

  // 4. Run Code on Sample Test Cases during exam
  fastify.post<{
    Body: {
      code: string;
      language: 'c' | 'cpp' | 'java' | 'python' | 'javascript';
      examId: string;
      questionId: string;
    };
  }>('/api/v1/code/run', async (request, reply) => {
    const { code, language, examId, questionId } = request.body;
    const exam = db.getAuthoredExam(examId);
    if (!exam) return reply.code(404).send({ error: 'Exam not found' });

    const q = exam.questions.find((x) => x.id === questionId);
    if (!q || q.type !== 'CODING') return reply.code(404).send({ error: 'Coding question not found' });

    const sampleTestCases = q.testCases.filter((tc) => !tc.isHidden);
    const results = await codeRunner.evaluateTestCases(code, language, sampleTestCases, false);

    return reply.send({ results });
  });

  // 4b. Execute Code with Custom Input
  fastify.post<{
    Body: {
      code: string;
      language: 'c' | 'cpp' | 'java' | 'python' | 'javascript';
      input?: string;
    };
  }>('/api/v1/code/execute', async (request, reply) => {
    const { code, language, input } = request.body;
    const result = await codeRunner.runCode(code, language, input || '');
    return reply.send(result);
  });

  // 5. Submit Exam & Auto-Grade
  fastify.post<{
    Params: { id: string };
    Body: {
      studentName: string;
      studentId: string;
        studentEmail?: string;
        studentCollege?: string;
      sessionId?: string;
      answers: StudentAnswer[];
    };
  }>('/api/v1/exams/:id/submit', async (request, reply) => {
    const { id } = request.params;
    const { studentName, studentId, studentEmail, studentCollege, sessionId, answers } = request.body;
    const exam = db.getAuthoredExam(id);
    if (!exam) return reply.code(404).send({ error: 'Exam not found' });

    let totalScore = 0;
    const questionResults: QuestionGradingResult[] = [];

    for (const q of exam.questions) {
      const studentAns = answers.find((a) => a.questionId === q.id);

      if (q.type === 'MCQ') {
        const isCorrect = studentAns?.selectedOptionIndex === q.correctOptionIndex;
        const earned = isCorrect ? q.points : 0;
        totalScore += earned;
        questionResults.push({
          questionId: q.id,
          type: 'MCQ',
          earnedPoints: earned,
          maxPoints: q.points,
          isCorrect,
        });
      } else if (q.type === 'CODING') {
        if (!studentAns?.code) {
          questionResults.push({
            questionId: q.id,
            type: 'CODING',
            earnedPoints: 0,
            maxPoints: q.points,
            isCorrect: false,
            details: 'No code submitted',
          });
        } else {
          const lang = (studentAns.language as any) || 'python';
          const evalResults = await codeRunner.evaluateTestCases(studentAns.code, lang, q.testCases, true);
          const passedCount = evalResults.filter((r) => r.passed).length;
          const totalCount = q.testCases.length;
          const score = totalCount > 0 ? Math.round((passedCount / totalCount) * q.points) : 0;
          totalScore += score;
          questionResults.push({
            questionId: q.id,
            type: 'CODING',
            earnedPoints: score,
            maxPoints: q.points,
            isCorrect: passedCount === totalCount,
            details: `Passed ${passedCount}/${totalCount} test cases (including hidden)`,
          });
        }
      }
    }

    const percentage = exam.totalPoints > 0 ? Math.round((totalScore / exam.totalPoints) * 100) : 0;

    const submission: StudentSubmission = {
      id: crypto.randomUUID(),
      examId: id,
      sessionId: sessionId || 'standalone-session',
      studentName: studentName || 'Student',
      studentId: studentId || 'ID-001',
      studentEmail,
      studentCollege,
      submittedAt: new Date().toISOString(),
      answers,
      totalScore,
      maxScore: exam.totalPoints,
      percentage,
      questionResults,
    };

    db.saveSubmission(submission);

    return reply.send({
      success: true,
      submissionId: submission.id,
      totalScore,
      maxScore: exam.totalPoints,
      percentage,
      questionResults,
    });
  });

  // 6. Proctor: View Submissions for an Exam
  fastify.get<{ Params: { id: string } }>('/api/v1/exams/:id/submissions', async (request, reply) => {
    const submissions = db.getSubmissions(request.params.id);
    return reply.send(submissions);
  });

  // 7. Download Signed .examconfig
  fastify.get<{ Params: { id: string } }>('/api/v1/exams/:id/config', async (request, reply) => {
    const examId = request.params.id;
    let exam = db.getAuthoredExam(examId);

    const host = 'http://localhost:8080';
    const examUrl = `${host}/exam-room/index.html?examId=${encodeURIComponent(examId)}`;

    if (!exam || !exam.signedConfig) {
      // Generate and sign on the fly
      const now = new Date();
      const config: ExamConfiguration = {
        configurationId: crypto.randomUUID(),
        configurationVersion: '1.0.0',
        examId,
        examName: exam?.title || `${examId} Examination`,
        organization: 'Online Examination Board',
        createdAt: now.toISOString(),
        validUntil: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
        minClientVersion: '1.0.0',
        startURL: examUrl,
        allowedURLs: [
          { pattern: `${host}/**`, action: 'ALLOW', allowSubdomains: true, allowedMethods: [] },
          { pattern: 'http://**', action: 'ALLOW', allowSubdomains: true, allowedMethods: [] },
          { pattern: 'https://**', action: 'ALLOW', allowSubdomains: true, allowedMethods: [] },
        ],
        blockedURLs: [],
        allowedProtocols: ['http', 'https'],
        blockedProtocols: ['javascript', 'vbscript', 'data', 'about'],
        navigationPolicy: {
          allowBackForward: false,
          allowReload: true,
          allowAddressBar: false,
          allowNewTabs: false,
          allowNewWindows: false,
          allowDevTools: false,
          allowInspectElement: false,
          allowViewSource: false,
        },
        popupPolicy: 'BLOCK_ALL',
        clipboardPolicy: 'DISABLED',
        downloadPolicy: 'BLOCK_ALL',
        uploadPolicy: 'BLOCK_ALL',
        printingPolicy: { allowPrinting: false, allowedPrinters: [] },
        displayPolicy: { allowMultipleDisplays: false, actionOnMultipleDisplays: 'LOCK', actionOnDisplayChange: 'LOCK' },
        screenCapturePolicy: { enableWindowDisplayAffinity: true, allowScreenshots: false },
        virtualMachinePolicy: { action: 'WARN' },
        remoteSessionPolicy: { action: 'BLOCK' },
        mediaPermissions: { allowCamera: false, allowMicrophone: false, allowGeolocation: false, allowNotifications: false, allowWebRTC: true },
        processPolicy: {
          defaultAction: 'ALLOW',
          rules: [
            { name: 'discord.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: ['*Discord*'] },
            { name: 'telegram.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: ['*Telegram*'] },
            { name: 'obs64.exe', action: 'TERMINATE_EXAM', pathPatterns: [], sha256Hashes: [], windowTitles: ['*OBS*'] },
          ],
        },
        securityProfile: 'BYOD',
        heartbeatIntervalSeconds: 10,
        networkFailurePolicy: { action: 'PAUSE', gracePeriodSeconds: 60 },
        quitPolicy: {
          requireExitPassword: false,
          exitPasswordHash: sha256Hex('AdminExit2026!'),
          allowQuitBeforeExamStart: true,
          allowQuitAfterSubmit: true,
        },
        serverEndpoint: host,
      };

      const signedConfig = signExamConfiguration(
        config,
        serverKeypair.privateKeyPem,
        serverKeypair.publicKeyPem,
        serverKeypair.keyId
      );

      db.registerConfig(signedConfig);

      if (exam) {
        exam.signedConfig = signedConfig;
      }

      reply.header('Content-Disposition', `attachment; filename="${examId}.examconfig"`);
      reply.header('Content-Type', 'application/json');
      return reply.send(signedConfig);
    }

    reply.header('Content-Disposition', `attachment; filename="${exam.id}.examconfig"`);
    reply.header('Content-Type', 'application/json');
    return reply.send(exam.signedConfig);
  });
};
