// src/pages/Welcome.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db } from '../services/firebase';
import type { Preset } from '../types/index';

const ALL_DOMAINS = [
  'Change Management', 'BOM Management', 'Document Management',
  'Visualization', 'System Administration', 'Business Administration',
  'Workflow & Lifecycles', 'Security & Access Control', 'CAD Integration',
];

const TIME_LABELS: Record<number, string> = {
  25: '15 min', 50: '35 min', 75: '60 min', 100: '75 min',
};

function StatCard({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="bg-white border border-zinc-100 rounded-2xl p-5 text-center shadow-sm">
      <div className="text-2xl mb-2 select-none">{icon}</div>
      <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xl font-bold text-zinc-900">{value}</div>
    </div>
  );
}

export default function Welcome() {
  const navigate = useNavigate();
  const [mode, setMode]                         = useState<'preset' | 'random'>('preset');
  const [presets, setPresets]                   = useState<Preset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [randomCount, setRandomCount]           = useState<25 | 50 | 75 | 100>(25);
  const [examineeName, setExamineeName]         = useState('');
  const [isLoading, setIsLoading]               = useState(true);

  useEffect(() => {
    db.collection('exam_presets')
      .get()
      .then(snap => {
        const loaded: Preset[] = [];
        snap.forEach(doc => loaded.push(doc.data() as Preset));
        setPresets(loaded);
        if (loaded.length > 0) setSelectedPresetId(loaded[0].id);
        else setMode('random');
      })
      .catch(err => console.error('Preset fetch error:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const selectedPreset = presets.find(p => p.id === selectedPresetId);
  const qCount         = mode === 'random' ? randomCount : (selectedPreset?.targetCount ?? 0);
  const timeLabel      = TIME_LABELS[qCount] ?? '—';
  const isValid        = examineeName.trim().length >= 3 && (mode === 'random' || !!selectedPreset);

  const handleStart = () => {
    navigate('/quiz', {
      state: {
        examineeName:      examineeName.trim(),
        mode,
        targetCount:       qCount,
        presetId:          mode === 'preset' ? selectedPresetId : null,
        // Pass IDs so Quiz can filter without a second Firestore round-trip
        presetQuestionIds: mode === 'preset' ? (selectedPreset?.questions ?? null) : null,
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-4xl mx-auto py-6 px-2"
    >
      {/* Hero */}
      <div className="text-center mb-8">
        <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full mb-4">
          Windchill Implementation Practitioner
        </span>
        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-2">
          PTC × Plural Mock Exam
        </h1>
        <p className="text-zinc-500 font-medium">Professional Certification Preparation Environment</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon="📋" label="Questions"  value={qCount || '—'} />
        <StatCard icon="⏱"  label="Time Limit" value={qCount ? timeLabel : '—'} />
        <StatCard icon="🎯" label="Pass Score"  value="80%" />
      </div>

      {/* Config card */}
      <div className="bg-white border border-zinc-100 rounded-3xl shadow-sm p-8 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* LEFT */}
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Examinee Name
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={examineeName}
                onChange={e => setExamineeName(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all placeholder:text-zinc-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Exam Mode
              </label>
              <div className="grid grid-cols-2 gap-1 bg-zinc-100 p-1 rounded-xl">
                {(['preset', 'random'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      mode === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {m === 'preset' ? 'Pre-Setup' : 'Random'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
              {mode === 'preset' ? (
                <>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Available Presets
                  </label>
                  {isLoading ? (
                    <p className="text-zinc-300 text-sm animate-pulse">Loading presets…</p>
                  ) : presets.length > 0 ? (
                    <select
                      value={selectedPresetId}
                      onChange={e => setSelectedPresetId(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-800 text-sm font-medium outline-none focus:border-indigo-400 transition-all"
                    >
                      {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <p className="text-red-500 text-xs font-semibold">
                      No presets found. Switch to Random or ask admin to create one.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Question Volume
                  </label>
                  <select
                    value={randomCount}
                    onChange={e => setRandomCount(Number(e.target.value) as 25 | 50 | 75 | 100)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-800 text-sm font-medium outline-none focus:border-indigo-400 transition-all"
                  >
                    <option value={25}>25 Questions — Focused (15 min)</option>
                    <option value={50}>50 Questions — Comprehensive (35 min)</option>
                    <option value={75}>75 Questions — Full Simulation (60 min)</option>
                    <option value={100}>100 Questions — Complete Exam (75 min)</option>
                  </select>
                </>
              )}
            </div>

            <button
              disabled={!isValid}
              onClick={handleStart}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all ${
                isValid
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 cursor-pointer'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
            >
              Initialize Examination →
            </button>
          </div>

          {/* RIGHT */}
          <div>
            <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Curriculum Coverage
            </h4>
            <div className="flex flex-wrap gap-1.5 mb-6">
              {ALL_DOMAINS.map(d => (
                <span key={d} className="text-[11px] font-medium bg-zinc-50 border border-zinc-200 text-zinc-600 px-3 py-1.5 rounded-lg">
                  {d}
                </span>
              ))}
            </div>
            <div className="border-t border-zinc-100 pt-5">
              <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Exam Regulations
              </h4>
              <ul className="space-y-2.5">
                {[
                  <>Passing threshold is strictly <strong className="text-zinc-700 font-semibold">80%</strong></>,
                  <>Approx. <strong className="text-zinc-700 font-semibold">10%</strong> of questions are Multiple Response</>,
                  <>Session timeout applies based on question volume</>,
                  <>Results are logged to the Enterprise Admin Console</>,
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-zinc-500 list-none">
                    <span className="text-indigo-400 mt-px select-none">›</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Admin link */}
      <div className="mt-5 text-center">
        <button
          onClick={() => navigate('/admin')}
          className="text-[11px] font-medium text-zinc-400 hover:text-indigo-500 border border-zinc-200 hover:border-indigo-200 hover:bg-indigo-50 px-5 py-2 rounded-full transition-all"
        >
          🔐 Admin Command Center
        </button>
      </div>
    </motion.div>
  );
}
