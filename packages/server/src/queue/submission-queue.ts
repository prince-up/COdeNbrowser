import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import crypto from 'node:crypto';
import { CodeRunnerService } from '../services/code-runner-service.js';
import { ExamServerDatabase, type StudentSubmission, type QuestionGradingResult } from '../store/database.js';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

const connection = new Redis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null });

export const submissionQueue = new Queue('exam-submissions', { connection });

// We'll store results temporarily in Redis so the client can poll them.
// We set a TTL of 1 hour (3600s) on result keys to avoid memory leaks.
export async function getJobResult(jobId: string) {
  const data = await connection.get(`job_result:${jobId}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function setJobResult(jobId: string, result: any) {
  await connection.setex(`job_result:${jobId}`, 3600, JSON.stringify(result));
}

const codeRunner = new CodeRunnerService();
const db = ExamServerDatabase.instance;

export function initQueueWorker() {
  const worker = new Worker(
    'exam-submissions',
    async (job: Job) => {
      try {
        if (job.name === 'run-sample') {
          return await handleRunSample(job.data);
        } else if (job.name === 'run-custom') {
          return await handleRunCustom(job.data);
        } else if (job.name === 'submit-exam') {
          return await handleSubmitExam(job.data);
        } else {
          throw new Error('Unknown job type');
        }
      } catch (err: any) {
        throw new Error(err.message || 'Job execution failed');
      }
    },
    { 
      connection, 
      concurrency: 5 // Strict limit: max 5 concurrent executions to prevent CPU/OOM crash
    }
  );

  worker.on('completed', async (job, returnvalue) => {
    await setJobResult(job.id as string, { status: 'completed', data: returnvalue });
  });

  worker.on('failed', async (job, error) => {
    if (job?.id) {
      await setJobResult(job.id, { status: 'failed', error: error.message });
    }
  });

  console.log('[BullMQ] Worker initialized with concurrency 5');
  return worker;
}

// Handlers
async function handleRunSample(data: any) {
  const { code, language, examId, questionId } = data;
  const exam = await db.getAuthoredExam(examId);
  if (!exam) throw new Error('Exam not found');

  const q = exam.questions.find((x: any) => x.id === questionId);
  if (!q || q.type !== 'CODING') throw new Error('Coding question not found');

  const sampleTestCases = q.testCases.filter((tc: any) => !tc.isHidden);
  const results = await codeRunner.evaluateTestCases(code, language, sampleTestCases, false);
  return { results };
}

async function handleRunCustom(data: any) {
  const { code, language, input } = data;
  const result = await codeRunner.runCode(code, language, input || '');
  return { result };
}

async function handleSubmitExam(data: any) {
  const { id, sessionId, studentName, studentEmail, studentCollege, studentId, answers } = data;
  
  const exam = await db.getAuthoredExam(id);
  if (!exam) throw new Error('Exam not found');

  let totalScore = 0;
  const questionResults: QuestionGradingResult[] = [];

  for (const q of exam.questions) {
    const studentAns = answers.find((a: any) => a.questionId === q.id);

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
        details: isCorrect ? 'Correct' : 'Incorrect',
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
        continue;
      }
      const evalResults = await codeRunner.evaluateTestCases(
        studentAns.code,
        studentAns.language as any,
        q.testCases,
        true
      );
      const passedCount = evalResults.filter((r: any) => r.passed).length;
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

  const percentage = exam.totalPoints > 0 ? Math.round((totalScore / exam.totalPoints) * 100) : 0;

  const submission: StudentSubmission = {
    id: crypto.randomUUID(),
    examId: id,
    sessionId: sessionId || 'standalone-session',
    studentName,
    studentEmail,
    studentId,
    studentCollege,
    submittedAt: new Date().toISOString(),
    answers,
    totalScore,
    maxScore: exam.totalPoints,
    percentage,
    questionResults,
  };

  db.saveSubmission(submission);

  return {
    success: true,
    submissionId: submission.id,
    totalScore,
    maxScore: exam.totalPoints,
    percentage,
    questionResults,
  };
}
