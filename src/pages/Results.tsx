// src/pages/Results.tsx
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Question } from '../types/index';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions, answers, timeTaken } = location.state || {};

  if (!questions) return <div className="text-center py-20 text-[#4F46E5] font-bold">No exam data retrieved.</div>;

  // Analysis Logic Data Structures
  const topicStats: Record<string, { correct: number, total: number }> = {};
  const difficultyStats: Record<string, { correct: number, total: number }> = {
    easy: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
    unrated: { correct: 0, total: 0 }
  };
  
  let correctCount = 0, skippedCount = 0, incorrectCount = 0;

  questions.forEach((q: Question, i: number) => {
    // 1. Track Topics
    if (!topicStats[q.topic]) topicStats[q.topic] = { correct: 0, total: 0 };
    topicStats[q.topic].total++;

    // 2. Track Difficulty
    const diff = (q.difficulty || 'unrated').toLowerCase();
    if (!difficultyStats[diff]) difficultyStats[diff] = { correct: 0, total: 0 };
    difficultyStats[diff].total++;

    // 3. Evaluate User Answer
    const userAns = answers[i];
    const isMulti = Array.isArray(q.correctAnswer);
    let isCorrect = false;
    let isSkipped = false;

    if (isMulti) {
      const uArr = userAns as number[] || [];
      const cArr = q.correctAnswer as number[];
      if (uArr.length === 0) isSkipped = true;
      else isCorrect = uArr.length === cArr.length && cArr.every(v => uArr.includes(v));
    } else {
      if (userAns === undefined) isSkipped = true;
      else isCorrect = userAns === q.correctAnswer;
    }

    if (isSkipped) skippedCount++;
    else if (isCorrect) { 
      correctCount++; 
      topicStats[q.topic].correct++; 
      difficultyStats[diff].correct++;
    }
    else incorrectCount++;
  });

  const percentage = Math.round((correctCount / questions.length) * 100);
  const isPassed = percentage >= 80;

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="bg-[#1E293B] border border-[#334155] rounded-[2rem] p-8 md:p-12 shadow-2xl relative">
        
        {/* HEADER SUMMARY */}
        <div className="flex flex-col md:flex-row gap-12 items-center mb-12 border-b border-[#334155] pb-12">
          <div className="w-48 h-48 rounded-full border-8 border-[#0F172A] flex items-center justify-center bg-[#0F172A] flex-shrink-0 shadow-lg">
            <div className="text-center">
              <div className={`text-6xl font-black ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>{percentage}%</div>
              <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mt-1">Final Score</div>
            </div>
          </div>
          <div className="flex-grow text-center md:text-left">
            <h2 className={`text-3xl font-extrabold uppercase mb-2 ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPassed ? 'Passed' : 'Failed'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
               <StatBox label="Correct" val={correctCount} color="text-emerald-400" />
               <StatBox label="Incorrect" val={incorrectCount} color="text-red-400" />
               <StatBox label="Skipped" val={skippedCount} color="text-[#94A3B8]" />
               <StatBox label="Time Taken" val={`${Math.floor(timeTaken/60)}m ${timeTaken%60}s`} color="text-white" />
            </div>
          </div>
        </div>

        {/* PERFORMANCE MATRICES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          
          {/* TOPIC BREAKDOWN (Takes up 2/3 of space) */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-black text-white mb-6 uppercase tracking-wider">Domain Analysis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(topicStats).map(([topic, stats]) => {
                const tPct = Math.round((stats.correct / stats.total) * 100);
                return (
                  <div key={topic} className="bg-[#0F172A] border border-[#334155] p-5 rounded-xl">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-bold text-[#94A3B8] uppercase truncate pr-2">{topic}</span>
                      <span className={`text-xs font-black ${tPct >= 80 ? 'text-emerald-400' : 'text-red-400'}`}>{stats.correct}/{stats.total} ({tPct}%)</span>
                    </div>
                    <div className="h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                      <div className={`h-full ${tPct >= 80 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${tPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DIFFICULTY BREAKDOWN (Takes up 1/3 of space) */}
          <div>
            <h3 className="text-sm font-black text-white mb-6 uppercase tracking-wider">Difficulty Matrix</h3>
            <div className="flex flex-col gap-4">
              {['easy', 'medium', 'hard'].map((level) => {
                const stats = difficultyStats[level];
                if (!stats || stats.total === 0) return null;
                const dPct = Math.round((stats.correct / stats.total) * 100);
                
                // Color code the difficulty tags
                let badgeColor = "text-[#94A3B8] bg-[#334155]/30";
                if (level === 'easy') badgeColor = "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
                if (level === 'medium') badgeColor = "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
                if (level === 'hard') badgeColor = "text-red-400 bg-red-400/10 border-red-400/30";

                return (
                  <div key={level} className="bg-[#0F172A] border border-[#334155] p-5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${badgeColor}`}>
                        {level}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-bold">{stats.correct}</span>
                      <span className="text-[#94A3B8] text-xs font-bold"> / {stats.total}</span>
                      <div className={`text-[10px] font-black mt-1 ${dPct >= 80 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {dPct}% ACCURACY
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DETAILED QUESTION REVIEW */}
        <div className="border-t border-[#334155] pt-12">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Detailed Question Logs</h3>
            <button onClick={() => navigate('/')} className="bg-[#4F46E5] hover:bg-[#4338CA] text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors shadow-lg shadow-[#4F46E5]/20 w-full sm:w-auto">
              Return Home
            </button>
          </div>
          
          <div className="space-y-4">
            {questions.map((q: Question, i: number) => (
              <ReviewItem key={i} q={q} idx={i} userAns={answers[i]} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── UI Sub-Components ──

function StatBox({ label, val, color }: { label: string, val: string | number, color: string }) {
  return (
    <div className="bg-[#0F172A] border border-[#334155] p-4 rounded-xl text-center">
      <div className={`text-2xl font-black ${color} mb-1`}>{val}</div>
      <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">{label}</div>
    </div>
  );
}

function ReviewItem({ q, idx, userAns }: { q: Question, idx: number, userAns: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const isMulti = Array.isArray(q.correctAnswer);
  
  let isCorrect = false, isSkipped = false;
  if (isMulti) {
    const uArr = userAns as number[] || [];
    const cArr = q.correctAnswer as number[];
    isSkipped = uArr.length === 0;
    isCorrect = uArr.length === cArr.length && cArr.every(v => uArr.includes(v));
  } else {
    isSkipped = userAns === undefined;
    isCorrect = userAns === q.correctAnswer;
  }

  const statusIcon = isCorrect ? '✅' : (isSkipped ? '⏭️' : '❌');
  const statusColor = isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : (isSkipped ? 'border-[#334155] bg-[#0F172A]' : 'border-red-500/30 bg-red-500/5');

  // Determine difficulty badge colors
  const diff = (q.difficulty || 'unrated').toLowerCase();
  let diffColor = "text-[#94A3B8] border-[#334155] bg-[#1E293B]";
  if (diff === 'easy') diffColor = "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
  if (diff === 'medium') diffColor = "text-yellow-400 border-yellow-400/30 bg-yellow-400/10";
  if (diff === 'hard') diffColor = "text-red-400 border-red-400/30 bg-red-400/10";

  return (
    <div className={`border-2 rounded-xl overflow-hidden transition-all ${statusColor}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-start sm:items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-start sm:items-center gap-4 pr-4">
          <span className="text-xl mt-1 sm:mt-0">{statusIcon}</span>
          <div>
            <span className="font-semibold text-white text-sm md:text-base line-clamp-2 mb-2">
              <span className="text-[#94A3B8] mr-2">Q{idx + 1}.</span> {q.question}
            </span>
            {/* INJECTED DATA: Domain & Difficulty Tags */}
            <div className="flex flex-wrap gap-2 mt-1">
               <span className="text-[9px] uppercase font-black tracking-widest px-2 py-1 rounded bg-[#0F172A] border border-[#334155] text-[#94A3B8]">
                 {q.topic}
               </span>
               <span className={`text-[9px] uppercase font-black tracking-widest px-2 py-1 rounded border ${diffColor}`}>
                 {diff}
               </span>
               {isMulti && (
                 <span className="text-[9px] uppercase font-black tracking-widest px-2 py-1 rounded bg-[#4F46E5]/10 border border-[#4F46E5]/30 text-[#4F46E5]">
                   Multiple Choice
                 </span>
               )}
            </div>
          </div>
        </div>
        <span className="text-[#94A3B8] font-bold text-xl ml-2">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="p-6 border-t border-[#334155] bg-[#0F172A]">
          <div className="space-y-3 mb-6">
            {q.options.map((opt, i) => {
              const isOptCorrect = isMulti ? (q.correctAnswer as number[]).includes(i) : q.correctAnswer === i;
              const didUserSelect = isMulti ? (userAns as number[] || []).includes(i) : userAns === i;
              
              let optClass = "border-[#334155] text-[#94A3B8] bg-[#1E293B]"; 
              if (isOptCorrect) optClass = "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold";
              else if (didUserSelect && !isCorrect) optClass = "border-red-500 bg-red-500/10 text-red-400 line-through";

              return (
                <div key={i} className={`p-4 rounded-lg border text-sm flex gap-3 ${optClass}`}>
                  <span className="font-bold">{String.fromCharCode(65 + i)}.</span>
                  <span>{opt}</span>
                </div>
              );
            })}
          </div>
          <div className="bg-[#1E293B] border border-[#334155] p-5 rounded-lg">
             <span className="text-[10px] font-black text-[#4F46E5] uppercase tracking-widest block mb-2">Explanation / Rationale</span>
             <p className="text-sm text-white leading-relaxed">{q.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}