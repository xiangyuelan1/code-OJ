export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'STUDENT';
  createdAt: string;
  isActive: boolean;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  type: 'PROGRAMMING' | 'CHOICE' | 'FILL_BLANK';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string[];
  testCases: TestCase[];
  choices?: Choice[];
  fillBlanks?: string[];
  correctAnswer?: string;
  timeLimit: number;
  memoryLimit: number;
  submissionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestCase {
  input: string;
  output: string;
  isSample?: boolean;
}

export interface Choice {
  key: string;
  text: string;
}

export interface Solution {
  id: string;
  problemId: string;
  problem?: {
    id: string;
    title: string;
    type: string;
  };
  title: string;
  content: string;
  code?: string;
  complexity?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  id: string;
  userId: string;
  problemId: string;
  problem?: {
    title: string;
    type: string;
  };
  user?: {
    username: string;
  };
  type: string;
  code?: string;
  answer?: string;
  result?: SubmissionResult;
  status: SubmissionStatus;
  score?: number;
  createdAt: string;
}

export interface SubmissionResult {
  status?: string;
  message?: string;
  score?: number;
  isCorrect?: boolean;
  correctAnswer?: string;
  selectedAnswer?: string;
  testResults?: TestResult[];
}

export interface TestResult {
  testCase: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  time?: number;
}

export type SubmissionStatus =
  | 'PENDING'
  | 'JUDGING'
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'RUNTIME_ERROR'
  | 'COMPILE_ERROR';

export interface AIConfig {
  enabled: boolean;
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

export interface ProblemStats {
  total: number;
  byType: Array<{
    type: string;
    _count: {
      type: number;
    };
  }>;
  byDifficulty: Array<{
    difficulty: string;
    _count: {
      difficulty: number;
    };
  }>;
}
