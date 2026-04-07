// src/types/index.ts

export type Difficulty = 'easy' | 'medium' | 'hard' | 'unrated';

export interface Question {
  id: number;
  topic: string;
  difficulty: Difficulty;
  question: string;
  options: string[];
  correctAnswer: number | number[]; 
  explanation: string;
}

export interface ExamResult {
  examineeName: string;
  examMode: 'preset' | 'random';
  scorePercentage: number;
  questionsAnsweredCorrectly: number;
  totalQuestions: number;
  passed: boolean;
  strongestDomain: string;
  weakestDomain: string;
  timeTakenSeconds: number;
  examDate: string; 
}

export interface Preset {
  id: string;
  name: string;
  targetCount: number;
  questions: number[];
  updatedAt: string;
}