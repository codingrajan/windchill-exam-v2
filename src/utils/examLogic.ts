// src/utils/examLogic.ts
import type { Question, Difficulty } from '../types/index';

export const normalizeDifficulty = (raw: string): Difficulty => {
  const d = (raw || '').toLowerCase().trim();
  if (d === 'easy' || d === 'medium' || d === 'hard') return d as Difficulty;
  return 'unrated';
};

export const buildRandomExam = (pool: Question[], targetCount: number): Question[] => {
  let pEasy = 0.30, pMed = 0.35; // Default for 100

  if (targetCount === 25) { pEasy = 0.10; pMed = 0.20;  }
  else if (targetCount === 50) { pEasy = 0.20; pMed = 0.40;  }
  else if (targetCount === 75) { pEasy = 0.25; pMed = 0.45;  }

  let easyNeeded = Math.round(targetCount * pEasy);
  let medNeeded = Math.round(targetCount * pMed);
  let hardNeeded = targetCount - (easyNeeded + Math.round(targetCount * pMed));

  const multiNeeded = Math.round(targetCount * 0.10);

  // Separate the pools
  const multiPool = pool.filter(q => Array.isArray(q.correctAnswer));
  const singlePool = pool.filter(q => !Array.isArray(q.correctAnswer));

  const shuffle = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

  const pulledMulti = shuffle(multiPool).slice(0, multiNeeded);
  
  // Adjust quotas based on what multi-choice questions were pulled
  pulledMulti.forEach(q => {
    const d = normalizeDifficulty(q.difficulty);
    if (d === 'easy') easyNeeded--;
    else if (d === 'medium') medNeeded--;
    else if (d === 'hard') hardNeeded--;
  });

  const sEasy = shuffle(singlePool.filter(q => normalizeDifficulty(q.difficulty) === 'easy'));
  const sMed = shuffle(singlePool.filter(q => normalizeDifficulty(q.difficulty) === 'medium'));
  const sHard = shuffle(singlePool.filter(q => normalizeDifficulty(q.difficulty) === 'hard'));
  const sUnrated = shuffle(singlePool.filter(q => normalizeDifficulty(q.difficulty) === 'unrated'));

  const finalQs = [...pulledMulti];
  
  const draw = (source: Question[], count: number) => {
    const actual = Math.max(0, count);
    finalQs.push(...source.splice(0, actual));
  };

  draw(sEasy, easyNeeded);
  draw(sMed, medNeeded);
  draw(sHard, hardNeeded);

  // Fallback if pools are empty
  if (finalQs.length < targetCount) {
    const remaining = targetCount - finalQs.length;
    draw([...sEasy, ...sMed, ...sHard, ...sUnrated], remaining);
  }

  return shuffle(finalQs).slice(0, targetCount);
};