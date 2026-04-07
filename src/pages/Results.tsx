// src/pages/Results.tsx
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../services/firebase';
import type { Question, ExamResult } from '../types/index';

// ── Difficulty badge ─────────────────────────────────────────────────────────
function DiffBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    easy:   'bg-emerald-50 text-emerald-600 border-emerald-100',
    medium: 'bg-amber-50  text-amber-600  border-amber-100',
    hard:   'bg-red-50    text-red-600    border-red-100',
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles[level?.toLowerCase()] ?? 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
      {level}
    </span>
  );
}

// ── Stat box ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-center">
      <div className={`text-2xl font-bold mb-1 ${color}`}>{value}</div>
      <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}

// ── Review accordion item ─────────────────────────────────────────────────────
function ReviewItem({ q, idx, userAns }: { q: Question; idx: number; userAns: unknown }) {
  const [open, setOpen] = useState(false);
  const isMulti = Array.isArray(q.correctAnswer);

  let isCorrect = false, isSkipped = false;
  if (isMulti) {
    const uArr = (userAns as number[]) ?? [];
    const cArr = q.correctAnswer as number[];
    isSkipped  = uArr.length === 0;
    isCorrect  = !isSkipped && uArr.length === cArr.length && cArr.every(v => uArr.includes(v));
  } else {
    isSkipped  = userAns === undefined;
    isCorrect  = userAns === q.correctAnswer;
  }

  const statusIcon  = isCorrect ? '✓' : isSkipped ? '—' : '✗';
  const borderColor = isCorrect
    ? 'border-emerald-200'
    : isSkipped
    ? 'border-zinc-200'
    : 'border-red-200';
  const iconColor = isCorrect ? 'text-emerald-600 bg-emerald-50' : isSkipped ? 'text-zinc-400 bg-zinc-50' : 'text-red-600 bg-red-50';

  return (
    <div className={`border rounded-2xl overflow-hidden transition-shadow ${borderColor} hover:shadow-sm`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-zinc-50 transition-colors"
      >
        <span className={`w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5 ${iconColor}`}>
          {statusIcon}
        </span>
        <div className="flex-grow min-w-0">
          <p className="text-sm font-semibold text-zinc-800 leading-snug line-clamp-2 mb-1.5">
            <span className="text-zinc-400 mr-1">Q{idx + 1}.</span>
            {q.question}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] font-medium bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
              {q.topic}
            </span>
            <DiffBadge level={q.difficulty ?? 'unrated'} />
            {isMulti && (
              <span className="text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full">
                Multiple Response
              </span>
            )}
          </div>
        </div>
        <span className="text-zinc-300 font-bold text-lg flex-shrink-0">{open ? '−' : '+'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-zinc-100 pt-4 bg-zinc-50/50">
              <div className="space-y-2 mb-4">
                {q.options.map((opt, i) => {
                  const isOptCorrect = isMulti
                    ? (q.correctAnswer as number[]).includes(i)
                    : q.correctAnswer === i;
                  const didSelect = isMulti
                    ? ((userAns as number[]) ?? []).includes(i)
                    : userAns === i;
                  let cls = 'border-zinc-200 bg-white text-zinc-600';
                  if (isOptCorrect) cls = 'border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold';
                  else if (didSelect && !isCorrect) cls = 'border-red-200 bg-red-50 text-red-700 line-through';
                  return (
                    <div key={i} className={`flex gap-3 p-3 rounded-xl border text-sm ${cls}`}>
                      <span className="font-bold flex-shrink-0">{String.fromCharCode(65 + i)}.</span>
                      <span>{opt}</span>
                    </div>
                  );
                })}
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider mb-1.5">
                  Explanation
                </p>
                <p className="text-sm text-zinc-700 leading-relaxed">{q.explanation}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Results page ─────────────────────────────────────────────────────────
export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions, answers, timeTaken, examineeName, examMode } = location.state ?? {};

  const hasSaved = useRef(false);

  if (!questions) {
    return (
      <div className="text-center py-20 text-zinc-400 font-medium">
        No exam data found.{' '}
        <button onClick={() => navigate('/')} className="text-indigo-500 underline">
          Return home
        </button>
      </div>
    );
  }

  // ── Score calculations ────────────────────────────────────────────────────
  const topicStats: Record<string, { correct: number; total: number }> = {};
  const diffStats: Record<string, { correct: number; total: number }>  = {
    easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 },
  };

  let correctCount = 0, skippedCount = 0, incorrectCount = 0;

  questions.forEach((q: Question, i: number) => {
    if (!topicStats[q.topic]) topicStats[q.topic] = { correct: 0, total: 0 };
    topicStats[q.topic].total++;
    const diff = (q.difficulty ?? 'unrated').toLowerCase();
    if (!diffStats[diff]) diffStats[diff] = { correct: 0, total: 0 };
    diffStats[diff].total++;

    const uAns   = answers[i];
    const isMulti = Array.isArray(q.correctAnswer);
    let isCorrect = false, isSkipped = false;

    if (isMulti) {
      const uArr = (uAns as number[]) ?? [];
      const cArr = q.correctAnswer as number[];
      isSkipped = uArr.length === 0;
      isCorrect = !isSkipped && uArr.length === cArr.length && cArr.every(v => uArr.includes(v));
    } else {
      isSkipped = uAns === undefined;
      isCorrect = uAns === q.correctAnswer;
    }

    if (isSkipped) { skippedCount++; }
    else if (isCorrect) {
      correctCount++;
      topicStats[q.topic].correct++;
      if (diffStats[diff]) diffStats[diff].correct++;
    } else { incorrectCount++; }
  });

  const percentage = Math.round((correctCount / questions.length) * 100);
  const isPassed   = percentage >= 80;

  // Strongest / weakest domain
  let bestTopic = 'N/A', worstTopic = 'N/A', bestPct = -1, worstPct = 101;
  Object.entries(topicStats).forEach(([topic, stats]) => {
    const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    if (pct > bestPct)  { bestPct  = pct;  bestTopic  = topic; }
    if (pct < worstPct) { worstPct = pct;  worstTopic = topic; }
  });

  // ── Save to Firebase once on mount ───────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (hasSaved.current) return;
    hasSaved.current = true;

    const payload: ExamResult = {
      examineeName:               examineeName ?? 'Anonymous',
      examMode:                   examMode     ?? 'random',
      scorePercentage:            percentage,
      questionsAnsweredCorrectly: correctCount,
      totalQuestions:             questions.length,
      passed:                     isPassed,
      strongestDomain:            bestTopic,
      weakestDomain:              worstTopic,
      timeTakenSeconds:           timeTaken ?? 0,
      examDate:                   new Date().toISOString(),
    };

    db.collection('exam_results').add(payload).catch(e => console.error('Result save error:', e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passColor = isPassed ? 'text-emerald-600' : 'text-red-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto py-6 px-2"
    >
      <div className="bg-white border border-zinc-100 rounded-3xl shadow-sm p-8 md:p-12">

        {/* ── Score Header ── */}
        <div className="flex flex-col md:flex-row gap-8 items-center mb-10 pb-10 border-b border-zinc-100">
          {/* Circle */}
          <div className="relative w-40 h-40 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="68" fill="none" stroke="#f4f4f5" strokeWidth="12" />
              <circle
                cx="80" cy="80" r="68" fill="none"
                stroke={isPassed ? '#059669' : '#ef4444'}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${427.26 * (percentage / 100)} 427.26`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${passColor}`}>{percentage}%</span>
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-1">Score</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-grow w-full">
            <div className="flex items-center gap-3 mb-4">
              <h2 className={`text-2xl font-bold uppercase tracking-wide ${passColor}`}>
                {isPassed ? 'Passed' : 'Failed'}
              </h2>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                isPassed ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                {isPassed ? 'Above threshold' : 'Below 80%'}
              </span>
            </div>
            {examineeName && (
              <p className="text-sm text-zinc-500 mb-4">
                Candidate: <span className="font-semibold text-zinc-800">{examineeName}</span>
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatBox label="Correct"   value={correctCount}   color="text-emerald-600" />
              <StatBox label="Incorrect" value={incorrectCount} color="text-red-500" />
              <StatBox label="Skipped"   value={skippedCount}   color="text-zinc-400" />
              <StatBox
                label="Time Taken"
                value={`${Math.floor((timeTaken ?? 0) / 60)}m ${(timeTaken ?? 0) % 60}s`}
                color="text-zinc-700"
              />
            </div>
          </div>
        </div>

        {/* ── Best / Worst Domain callout ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl select-none">🏆</span>
            <div>
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-0.5">Strongest Domain</p>
              <p className="text-sm font-semibold text-zinc-800">{bestTopic} <span className="text-emerald-600">({bestPct}%)</span></p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl select-none">⚠️</span>
            <div>
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-0.5">Weakest Domain</p>
              <p className="text-sm font-semibold text-zinc-800">{worstTopic} <span className="text-amber-600">({worstPct}%)</span></p>
            </div>
          </div>
        </div>

        {/* ── Domain Analysis ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">Domain Analysis</h3>
            <div className="space-y-3">
              {Object.entries(topicStats).map(([topic, stats]) => {
                const pct = Math.round((stats.correct / stats.total) * 100);
                return (
                  <div key={topic} className="bg-zinc-50 border border-zinc-100 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-zinc-600 truncate pr-3">{topic}</span>
                      <span className={`text-xs font-bold flex-shrink-0 ${pct >= 80 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {stats.correct}/{stats.total} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? 'bg-emerald-500' : 'bg-red-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Difficulty Matrix */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">Difficulty Matrix</h3>
            <div className="space-y-3">
              {(['easy', 'medium', 'hard'] as const).map(level => {
                const stats = diffStats[level];
                if (!stats || stats.total === 0) return null;
                const pct = Math.round((stats.correct / stats.total) * 100);
                return (
                  <div key={level} className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 flex items-center justify-between">
                    <DiffBadge level={level} />
                    <div className="text-right">
                      <span className="text-sm font-bold text-zinc-900">{stats.correct}</span>
                      <span className="text-zinc-400 text-xs font-medium"> / {stats.total}</span>
                      <div className={`text-[10px] font-bold mt-0.5 ${pct >= 80 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {pct}% accuracy
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Detailed Review ── */}
        <div className="border-t border-zinc-100 pt-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">
              Detailed Question Review
            </h3>
            <button
              onClick={() => navigate('/')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm w-full sm:w-auto"
            >
              Return Home
            </button>
          </div>
          <div className="space-y-3">
            {questions.map((q: Question, i: number) => (
              <ReviewItem key={i} q={q} idx={i} userAns={answers[i]} />
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
