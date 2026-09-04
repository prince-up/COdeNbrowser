import * as fs from 'node:fs';
import * as path from 'node:path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
  isHidden: boolean;
}

export interface MCQQuestion {
  id: string;
  type: 'MCQ';
  title: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  points: number;
}

export interface CodingQuestion {
  id: string;
  type: 'CODING';
  title: string;
  description: string;
  languages: ('javascript' | 'python' | 'cpp' | 'c' | 'java')[];
  starterCode: Record<string, string>;
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
  selectedOptionIndex?: number;
  code?: string;
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
  studentEmail?: string;
  studentCollege?: string;
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

  private supabase: SupabaseClient | null = null;
  public trustedPublicKeys = new Map<string, string>(); 
  public registeredConfigs = new Map<string, SignedExamConfigFile>(); 
  public revokedConfigIds = new Set<string>(); 
  public securityEvents: SecurityEvent[] = []; // Simple in-memory fallback for quick testing
  public activeSessions = new Map<string, ActiveSessionRecord>();
  public heartbeatHistory = new Map<string, ClientHeartbeatPayload[]>();

  private constructor() {
    // Load config from process.env (passed via docker-compose)
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Connected to Supabase PostgreSQL');
    } else {
      console.warn('⚠️ No Supabase credentials provided. Database operations will fail.');
    }
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

  public async recordEvent(event: SecurityEvent): Promise<void> {
    if (this.supabase) {
      await this.supabase.from('security_events').insert({
        session_id: event.sessionId,
        event_type: event.eventType,
        details: event.message,
        timestamp: event.timestamp
      });
    }
  }

  public async getSecurityEvents(): Promise<any[]> {
    if (!this.supabase) return [];
    const { data } = await this.supabase.from('security_events').select('*').order('timestamp', { ascending: false }).limit(100);
    return (data || []).map((d: any) => ({
      sessionId: d.session_id,
      type: d.event.eventType,
      details: d.details,
      timestamp: d.timestamp
    }));
  }

  public async saveAuthoredExam(exam: AuthorExamRecord): Promise<void> {
    if (this.supabase) {
      await this.supabase.from('exams').upsert({
        id: exam.id,
        title: exam.title,
        description: exam.description,
        duration_minutes: exam.durationMinutes,
        total_points: exam.totalPoints,
        configuration_id: exam.configurationId,
        questions: exam.questions,
        signed_config: exam.signedConfig,
        created_at: exam.createdAt
      });
    }
  }

  public async getAuthoredExam(examId: string): Promise<AuthorExamRecord | undefined> {
    if (!this.supabase) return undefined;
    const { data } = await this.supabase.from('exams').select('*').eq('id', examId).single();
    if (!data) return undefined;
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      durationMinutes: data.duration_minutes,
      totalPoints: data.total_points,
      configurationId: data.configuration_id,
      questions: data.questions,
      signedConfig: data.signed_config,
      createdAt: data.created_at
    };
  }

  public async getAuthoredExams(): Promise<AuthorExamRecord[]> {
    if (!this.supabase) return [];
    const { data } = await this.supabase.from('exams').select('*').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      durationMinutes: d.duration_minutes,
      totalPoints: d.total_points,
      configurationId: d.configuration_id,
      questions: d.questions,
      signedConfig: d.signed_config,
      createdAt: d.created_at
    }));
  }

  public async saveSubmission(submission: StudentSubmission): Promise<void> {
    if (this.supabase) {
      await this.supabase.from('submissions').upsert({
        id: submission.id,
        exam_id: submission.examId,
        session_id: submission.sessionId,
        student_name: submission.studentName,
        student_email: submission.studentEmail,
        student_id: submission.studentId,
        student_college: submission.studentCollege,
        total_score: submission.totalScore,
        max_score: submission.maxScore,
        percentage: submission.percentage,
        answers: submission.answers,
        question_results: submission.questionResults,
        submitted_at: submission.submittedAt
      });
    }
  }

  public async getSubmissions(examId: string): Promise<StudentSubmission[]> {
    if (!this.supabase) return [];
    const { data } = await this.supabase.from('submissions').select('*').eq('exam_id', examId).order('submitted_at', { ascending: false });
    return (data || []).map((d: any) => ({
      id: d.id,
      examId: d.exam_id,
      sessionId: d.session_id,
      studentName: d.student_name,
      studentEmail: d.student_email,
      studentId: d.student_id,
      studentCollege: d.student_college,
      totalScore: d.total_score,
      maxScore: d.max_score,
      percentage: d.percentage,
      answers: d.answers,
      questionResults: d.question_results,
      submittedAt: d.submitted_at
    }));
  }

  public async getActiveSessions(): Promise<any[]> {
    if (!this.supabase) return [];
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data } = await this.supabase.from('sessions').select('*').gte('last_heartbeat', fiveMinutesAgo);
    return data || [];
  }

  public async updateSessionHeartbeat(sessionId: string, payload: ClientHeartbeatPayload): Promise<void> {
    if (!this.supabase) return;
    
    // We try to update. If it fails (doesn't exist), we insert.
    const { data, error } = await this.supabase.from('sessions').select('id').eq('id', sessionId).single();
    if (!data) {
      await this.supabase.from('sessions').insert({
        id: sessionId,
        exam_id: payload.examId,
        os_user: "unknown",
        hostname: "unknown",
        status: payload.sessionState,
        last_heartbeat: new Date().toISOString()
      });
    } else {
      await this.supabase.from('sessions').update({
        status: payload.sessionState,
        last_heartbeat: new Date().toISOString()
      }).eq('id', sessionId);
    }
  }
}
