// src/pages/Quiz.tsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Question } from '../types/index';
import { buildRandomExam } from '../utils/examLogic';

const POOL_FILES = ['/data/windchill_mock_test_1.json'];

export default function Quiz() {
  const location = useLocation();
  const navigate = useNavigate();
  const config = location.state;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | number[]>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!config) { navigate('/'); return; }
    const initExam = async () => {
      const requests = POOL_FILES.map(f => fetch(f).then(res => res.json()));
      const rawPool = (await Promise.all(requests)).flat();
      const finalSet = config.mode === 'preset' 
        ? rawPool.slice(0, config.targetCount) // Note: Replace with actual preset logic if fetching from DB
        : buildRandomExam(rawPool, config.targetCount);
      
      setQuestions(finalSet);
      setTimeLeft(config.targetCount * 60); 
      setIsLoaded(true);
    };
    initExam();
  }, [config, navigate]);

  useEffect(() => {
    if (!isLoaded || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [isLoaded, timeLeft]);

  const handleSubmitEarly = () => {
    if (confirm(`Are you sure you want to submit early?\nYou have answered ${Object.keys(answers).length} of ${questions.length} questions.`)) {
      navigate('/results', { state: { questions, answers, timeTaken: config.targetCount * 60 - timeLeft } });
    }
  };

  if (!isLoaded) return <div className="flex h-screen items-center justify-center text-[#4F46E5] font-bold text-xl">Loading Exam Data...</div>;

  const q = questions[currentIdx];
  const isMulti = Array.isArray(q.correctAnswer);

  const handleOptionClick = (idx: number) => {
    setAnswers(prev => {
      const current = prev[currentIdx];
      if (isMulti) {
        const arr = Array.isArray(current) ? [...current] : [];
        const exists = arr.indexOf(idx);
        if (exists > -1) arr.splice(exists, 1);
        else arr.push(idx);
        return { ...prev, [currentIdx]: arr };
      }
      return { ...prev, [currentIdx]: idx };
    });
  };

  const isAnswered = (idx: number) => {
    const val = answers[idx];
    return Array.isArray(val) ? val.length > 0 : val !== undefined;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-7xl mx-auto py-4">
      
      {/* LEFT: Question Navigator */}
      <aside className="w-full lg:w-72 flex-shrink-0">
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 sticky top-24">
          <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-6">Question Navigator</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={`h-10 rounded-lg text-xs font-bold transition-all border-2 
                  ${currentIdx === i ? 'border-[#4F46E5] bg-[#4F46E5]/20 text-white' : 
                    isAnswered(i) ? 'border-[#334155] bg-[#334155] text-white' : 
                    'border-[#334155] hover:border-[#94A3B8] text-[#94A3B8]'}
                  ${flagged[i] ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-[#0F172A]' : ''}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3">
             <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-[#94A3B8]">
                <div className="w-2 h-2 rounded-full bg-[#334155]" /> Answered
             </div>
             <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-[#94A3B8]">
                <div className="w-2 h-2 rounded-full bg-[#4F46E5]" /> Current
             </div>
             <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-[#94A3B8]">
                <div className="w-2 h-2 rounded-full bg-yellow-500" /> Flagged
             </div>
          </div>
        </div>
      </aside>

      {/* RIGHT: Main Question Area */}
      <main className="flex-grow">
        <div className="flex justify-between items-center mb-6 bg-[#1E293B] p-4 rounded-2xl border border-[#334155]">
           <div className="flex gap-4 items-center">
             <div className="bg-[#0F172A] border border-[#334155] px-4 py-2 rounded-xl">
                <span className="text-[#94A3B8] text-xs font-bold mr-2 uppercase">Time Remaining</span>
                <span className={`font-mono text-xl font-black ${timeLeft < 300 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </span>
             </div>
             <button 
              onClick={() => setFlagged(prev => ({...prev, [currentIdx]: !prev[currentIdx]}))}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border-2
              ${flagged[currentIdx] ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' : 'border-[#334155] text-[#94A3B8] hover:border-yellow-500/50'}`}
             >
               {flagged[currentIdx] ? '🚩 Flagged' : '⚑ Flag for Review'}
             </button>
           </div>

           {/* PERSISTENT SUBMIT BUTTON */}
           <button 
             onClick={handleSubmitEarly}
             className="bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors"
           >
             Submit Exam
           </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#1E293B] border border-[#334155] rounded-[2rem] p-8 md:p-12 shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-8">
              <span className="text-xl font-black text-[#94A3B8]">Question {currentIdx + 1} of {questions.length}</span>
              <div className="h-px flex-grow bg-[#334155]" />
              <span className="text-[10px] font-bold bg-[#0F172A] border border-[#334155] text-[#94A3B8] px-3 py-1 rounded-md uppercase">{q.topic}</span>
              <span className="text-[10px] font-bold bg-[#0F172A] border border-[#334155] text-[#94A3B8] px-3 py-1 rounded-md uppercase">{q.difficulty}</span>
              {isMulti && <span className="bg-[#4F46E5]/20 text-[#4F46E5] text-[10px] font-bold px-3 py-1 rounded-md border border-[#4F46E5]/30 uppercase">Select Multiple</span>}
            </div>

            <h2 className="text-2xl font-bold text-white mb-10 leading-snug">
              {q.question}
            </h2>

            <div className="space-y-4">
              {q.options.map((opt, i) => {
                const selected = isMulti ? (answers[currentIdx] as number[] || []).includes(i) : answers[currentIdx] === i;
                return (
                  <button
                    key={i}
                    onClick={() => handleOptionClick(i)}
                    className={`w-full group flex items-center p-5 rounded-2xl border-2 transition-all text-left
                    ${selected ? 'border-[#4F46E5] bg-[#4F46E5]/10' : 'border-[#334155] hover:border-[#94A3B8] bg-[#0F172A]'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold mr-6 transition-all
                    ${selected ? 'bg-[#4F46E5] text-white' : 'bg-[#1E293B] border border-[#334155] text-[#94A3B8] group-hover:text-white'}`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className={`text-base font-medium ${selected ? 'text-white' : 'text-[#94A3B8] group-hover:text-white'}`}>{opt}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-12 flex justify-between gap-4 border-t border-[#334155] pt-8">
               <button 
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="px-8 py-4 rounded-xl font-bold text-[#94A3B8] uppercase tracking-widest text-xs hover:text-white disabled:opacity-30 transition-colors"
               >
                 ← Previous
               </button>
               <button 
                onClick={() => {
                  if (currentIdx < questions.length - 1) setCurrentIdx(prev => prev + 1);
                  else if (confirm("Ready to submit your final exam?")) navigate('/results', { state: { questions, answers, timeTaken: config.targetCount * 60 - timeLeft } });
                }}
                className="bg-[#4F46E5] text-white px-10 py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#4338CA] shadow-lg transition-all"
              >
                {currentIdx === questions.length - 1 ? 'Finish Exam' : 'Next Question →'}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}