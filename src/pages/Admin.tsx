// src/pages/Admin.tsx
import { useState, useEffect, useMemo } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '../services/firebase';
import type { Question, ExamResult, Preset } from '../types/index';

// ── Local Types ──────────────────────────────────────────────────────────────

interface ExamResultDoc extends ExamResult {
  docId: string;
}

type ActiveTab = 'reports' | 'presets';

const VALID_COUNTS = [25, 50, 75] as const;

// ── Shared Sub-Components ────────────────────────────────────────────────────

function DifficultyBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    easy:   'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
    medium: 'text-yellow-400  border-yellow-400/30  bg-yellow-400/10',
    hard:   'text-red-400     border-red-500/30     bg-red-500/10',
  };
  const cls = map[level.toLowerCase()] ?? 'text-[#94A3B8] border-[#334155] bg-[#1E293B]';
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${cls}`}>
      {level}
    </span>
  );
}

// Neomorphic checkbox — inset shadow creates the "pressed into surface" illusion
function NeoCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      aria-checked={checked}
      className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all duration-150"
      style={{
        background:  checked ? '#4F46E5' : '#1E293B',
        border:      checked ? '2px solid #4F46E5' : '2px solid transparent',
        boxShadow:   checked
          ? '0 0 0 2px rgba(79,70,229,0.25)'
          : 'inset 3px 3px 6px #0a111e, inset -3px -3px 6px #2c3e54',
      }}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

// ── LOGIN SCREEN ─────────────────────────────────────────────────────────────

function LoginScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.signInWithEmailAndPassword(email, password);
      // onAuthStateChanged in parent handles transition — no explicit callback needed
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Authentication failed. Check credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 16 }}
      animate={{ opacity: 1, scale: 1,    y: 0  }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-md mx-auto mt-12"
    >
      <div className="bg-[#1E293B] border border-[#334155] rounded-[2rem] p-10 shadow-2xl">

        {/* Identity Block */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#4F46E5]/10 border border-[#4F46E5]/30 mb-5">
            <span className="text-3xl select-none">🔐</span>
          </div>
          <h1 className="text-lg font-black text-[#F8FAFC] uppercase tracking-[0.2em]">
            Admin Console
          </h1>
          <p className="text-[#94A3B8] text-[11px] font-semibold mt-1.5 tracking-wide">
            Windchill Enterprise · Restricted Access
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full bg-[#0F172A] border border-[#334155] p-4 rounded-xl text-white focus:border-[#4F46E5] outline-none transition-all font-semibold text-sm placeholder:text-[#475569]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[#0F172A] border border-[#334155] p-4 rounded-xl text-white focus:border-[#4F46E5] outline-none transition-all font-semibold text-sm placeholder:text-[#475569]"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs font-bold"
              >
                ⚠&nbsp; {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] transition-all mt-2 ${
              loading
                ? 'bg-[#334155] text-[#94A3B8] cursor-not-allowed'
                : 'bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-lg shadow-[#4F46E5]/20 cursor-pointer'
            }`}
          >
            {loading ? 'Authenticating…' : 'Access Console'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

// ── TAB A: EXAM REPORTS ──────────────────────────────────────────────────────

function ReportsTab() {
  const [results,        setResults]        = useState<ExamResultDoc[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [filterName,     setFilterName]     = useState('');
  const [filterDate,     setFilterDate]     = useState('');
  const [filterMinScore, setFilterMinScore] = useState('');
  const [filterMaxScore, setFilterMaxScore] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await db.collection('exam_results').orderBy('examDate', 'desc').get();
        const docs: ExamResultDoc[] = [];
        snap.forEach(doc => docs.push({ docId: doc.id, ...(doc.data() as ExamResult) }));
        setResults(docs);
      } catch (err) {
        console.error('Failed to fetch exam_results:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return results.filter(r => {
      const nameOk  = r.examineeName.toLowerCase().includes(filterName.toLowerCase());
      const dateOk  = filterDate      ? r.examDate.includes(filterDate) : true;
      const minOk   = filterMinScore  ? r.scorePercentage >= Number(filterMinScore) : true;
      const maxOk   = filterMaxScore  ? r.scorePercentage <= Number(filterMaxScore) : true;
      return nameOk && dateOk && minOk && maxOk;
    });
  }, [results, filterName, filterDate, filterMinScore, filterMaxScore]);

  const exportCSV = () => {
    const headers = [
      'Name', 'Date', 'Mode', 'Score %', 'Correct', 'Total',
      'Passed', 'Time (s)', 'Strongest Domain', 'Weakest Domain',
    ];
    const rows = filtered.map(r => [
      `"${r.examineeName.replace(/"/g, '""')}"`,
      `"${r.examDate}"`,
      r.examMode,
      r.scorePercentage,
      r.questionsAnsweredCorrectly,
      r.totalQuestions,
      r.passed ? 'Yes' : 'No',
      r.timeTakenSeconds,
      `"${(r.strongestDomain ?? '').replace(/"/g, '""')}"`,
      `"${(r.weakestDomain  ?? '').replace(/"/g, '""')}"`,
    ]);
    const csv  = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `exam_results_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#4F46E5] font-bold text-xs uppercase tracking-widest animate-pulse">
        ⏳ &nbsp;Fetching Exam Records…
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Filter Bar ── */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <div>
            <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-2">
              Examinee Name
            </label>
            <input
              type="text"
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
              placeholder="Search name…"
              className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl text-white text-sm outline-none focus:border-[#4F46E5] transition-all placeholder:text-[#475569] font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-2">
              Date
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl text-white text-sm outline-none focus:border-[#4F46E5] transition-all font-semibold [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-2">
              Min Score %
            </label>
            <input
              type="number"
              value={filterMinScore}
              onChange={e => setFilterMinScore(e.target.value)}
              placeholder="0"
              min={0} max={100}
              className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl text-white text-sm outline-none focus:border-[#4F46E5] transition-all placeholder:text-[#475569] font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-2">
              Max Score %
            </label>
            <input
              type="number"
              value={filterMaxScore}
              onChange={e => setFilterMaxScore(e.target.value)}
              placeholder="100"
              min={0} max={100}
              className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl text-white text-sm outline-none focus:border-[#4F46E5] transition-all placeholder:text-[#475569] font-semibold"
            />
          </div>
        </div>
      </div>

      {/* ── Table Controls ── */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">
          {filtered.length}&nbsp;/&nbsp;{results.length} Records
        </span>
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-[#334155] disabled:text-[#94A3B8] disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[#4F46E5]/20 cursor-pointer"
        >
          ↓ Export CSV
        </button>
      </div>

      {/* ── Glassmorphism Table ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#94A3B8] text-sm font-semibold border border-[#334155] rounded-2xl bg-[#1E293B]/40">
          No exam records match your current filters.
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-2xl border border-[#334155]"
          style={{ background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(16px)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155]" style={{ background: 'rgba(15,23,42,0.7)' }}>
                {['Examinee', 'Date', 'Mode', 'Score', 'Correct / Total', 'Time', 'Status', 'Strongest Domain'].map(h => (
                  <th
                    key={h}
                    className="text-left text-[10px] font-black text-[#94A3B8] uppercase tracking-widest px-5 py-4 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <motion.tr
                  key={r.docId}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.025, 0.5) }}
                  className="border-b border-[#334155]/40 hover:bg-[#4F46E5]/5 transition-colors"
                >
                  <td className="px-5 py-4 font-bold text-white whitespace-nowrap">{r.examineeName}</td>

                  <td className="px-5 py-4 text-[#94A3B8] whitespace-nowrap text-xs font-semibold">
                    {r.examDate}
                  </td>

                  <td className="px-5 py-4">
                    <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-[#0F172A] border border-[#334155] text-[#94A3B8]">
                      {r.examMode}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span className={`text-base font-black ${r.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                      {r.scorePercentage}%
                    </span>
                  </td>

                  <td className="px-5 py-4 text-xs font-bold whitespace-nowrap">
                    <span className="text-white">{r.questionsAnsweredCorrectly}</span>
                    <span className="text-[#94A3B8]"> / {r.totalQuestions}</span>
                  </td>

                  <td className="px-5 py-4 text-[#94A3B8] text-xs font-bold whitespace-nowrap">
                    {Math.floor(r.timeTakenSeconds / 60)}m {r.timeTakenSeconds % 60}s
                  </td>

                  <td className="px-5 py-4">
                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border whitespace-nowrap ${
                      r.passed
                        ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
                        : 'text-red-400 bg-red-500/10 border-red-500/30'
                    }`}>
                      {r.passed ? '✓ Passed' : '✗ Failed'}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-[#94A3B8] text-[11px] font-semibold max-w-[160px] truncate">
                    {r.strongestDomain ?? '—'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── TAB B: PRESET MANAGER ────────────────────────────────────────────────────

function PresetsTab() {
  const [allQuestions,     setAllQuestions]     = useState<Question[]>([]);
  const [loadingQ,         setLoadingQ]         = useState(true);
  const [selected,         setSelected]         = useState<Set<number>>(new Set());
  const [presetName,       setPresetName]       = useState('');
  const [filterText,       setFilterText]       = useState('');
  const [filterTopic,      setFilterTopic]      = useState('All');
  const [filterDiff,       setFilterDiff]       = useState('All');
  const [saving,           setSaving]           = useState(false);
  const [saveStatus,       setSaveStatus]       = useState<'idle' | 'success' | 'error'>('idle');
  const [existingPresets,  setExistingPresets]  = useState<Preset[]>([]);

  // Load all question JSON files (gracefully skips missing files)
  useEffect(() => {
    const loadAll = async () => {
      const acc: Question[] = [];
      for (let i = 1; i <= 5; i++) {
        try {
          const res = await fetch(`/data/windchill_mock_test_${i}.json`);
          if (res.ok) {
            const data: Question[] = await res.json();
            acc.push(...data);
          }
        } catch { /* file may not exist yet */ }
      }
      setAllQuestions(acc);
      setLoadingQ(false);
    };
    loadAll();

    db.collection('exam_presets').get().then(snap => {
      const p: Preset[] = [];
      snap.forEach(doc => p.push(doc.data() as Preset));
      setExistingPresets(p);
    }).catch(err => console.error('Failed to fetch presets:', err));
  }, []);

  const topics = useMemo(
    () => ['All', ...Array.from(new Set(allQuestions.map(q => q.topic))).sort()],
    [allQuestions],
  );

  const filtered = useMemo(() => {
    return allQuestions.filter(q => {
      const topicOk = filterTopic === 'All' || q.topic === filterTopic;
      const diffOk  = filterDiff  === 'All' || q.difficulty === filterDiff;
      const textOk  = filterText  === ''    || q.question.toLowerCase().includes(filterText.toLowerCase());
      return topicOk && diffOk && textOk;
    });
  }, [allQuestions, filterTopic, filterDiff, filterText]);

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectVisible = () => setSelected(prev => new Set([...prev, ...filtered.map(q => q.id)]));
  const clearAll      = () => setSelected(new Set());

  const isValidCount = (VALID_COUNTS as readonly number[]).includes(selected.size);
  const canSave      = isValidCount && presetName.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const id: string = `preset_${Date.now()}`;
      const preset: Preset = {
        id,
        name:        presetName.trim(),
        targetCount: selected.size,
        questions:   Array.from(selected),
        updatedAt:   new Date().toISOString(),
      };
      await db.collection('exam_presets').doc(id).set(preset);
      setExistingPresets(prev => [...prev, preset]);
      setSaveStatus('success');
      setPresetName('');
      setSelected(new Set());
      setTimeout(() => setSaveStatus('idle'), 3500);
    } catch (err) {
      console.error('Preset save failed:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    } finally {
      setSaving(false);
    }
  };

  if (loadingQ) {
    return (
      <div className="flex items-center justify-center py-24 text-[#4F46E5] font-bold text-xs uppercase tracking-widest animate-pulse">
        ⏳ &nbsp;Loading Question Bank…
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Save / Counter Panel ── */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">

          {/* Preset name input */}
          <div className="flex-grow">
            <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-2">
              Preset Name
            </label>
            <input
              type="text"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder="e.g. Mock Exam — Set A"
              className="w-full bg-[#0F172A] border border-[#334155] p-3 rounded-xl text-white text-sm outline-none focus:border-[#4F46E5] transition-all placeholder:text-[#475569] font-semibold"
            />
          </div>

          {/* Live counters */}
          <div className="flex items-center gap-3">
            <div className="text-center bg-[#0F172A] border border-[#334155] px-5 py-3 rounded-xl min-w-[72px]">
              <div className={`text-xl font-black transition-colors ${
                isValidCount    ? 'text-emerald-400' :
                selected.size > 0 ? 'text-yellow-400'  : 'text-[#94A3B8]'
              }`}>
                {selected.size}
              </div>
              <div className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest mt-0.5">Selected</div>
            </div>
            <div className="text-center bg-[#0F172A] border border-[#334155] px-5 py-3 rounded-xl min-w-[72px]">
              <div className="text-xl font-black text-[#94A3B8]">{allQuestions.length}</div>
              <div className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest mt-0.5">Total Q's</div>
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`px-7 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all whitespace-nowrap ${
              canSave
                ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-lg shadow-[#4F46E5]/20 cursor-pointer'
                : 'bg-[#334155] text-[#94A3B8] cursor-not-allowed opacity-60'
            }`}
          >
            {saving ? 'Pushing…' : '↑ Push Preset'}
          </button>
        </div>

        {/* Count validation pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {VALID_COUNTS.map(n => (
            <span
              key={n}
              className={`text-[10px] font-black px-3 py-1 rounded-lg border uppercase tracking-wider transition-all ${
                selected.size === n
                  ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/40'
                  : 'text-[#94A3B8] border-[#334155] bg-[#0F172A]'
              }`}
            >
              {n} Questions {selected.size === n ? '✓' : ''}
            </span>
          ))}
          {!isValidCount && selected.size > 0 && (
            <span className="text-[10px] font-bold text-yellow-400 border border-yellow-400/30 bg-yellow-400/5 px-3 py-1 rounded-lg">
              ⚠ Must select exactly 25, 50, or 75
            </span>
          )}
        </div>

        {/* Save feedback */}
        <AnimatePresence>
          {saveStatus === 'success' && (
            <motion.div
              key="ok"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 text-emerald-400 text-xs font-bold bg-emerald-400/10 border border-emerald-400/30 rounded-xl p-3"
            >
              ✓ Preset pushed to Firestore successfully.
            </motion.div>
          )}
          {saveStatus === 'error' && (
            <motion.div
              key="fail"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 text-red-400 text-xs font-bold bg-red-500/10 border border-red-500/30 rounded-xl p-3"
            >
              ✗ Failed to save preset. Check the browser console for details.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Active Presets in Firestore ── */}
      {existingPresets.length > 0 && (
        <div className="bg-[#0F172A]/50 border border-[#334155] rounded-2xl p-5">
          <h4 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-3">
            Active Presets in Firestore ({existingPresets.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {existingPresets.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-2 bg-[#1E293B] border border-[#334155] px-3 py-2 rounded-xl"
              >
                <span className="text-white text-xs font-bold">{p.name}</span>
                <span className="text-[9px] font-black text-[#4F46E5] bg-[#4F46E5]/10 border border-[#4F46E5]/30 px-1.5 py-0.5 rounded">
                  {p.targetCount}Q
                </span>
                <span className="text-[9px] font-semibold text-[#94A3B8]">
                  {new Date(p.updatedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-[#0F172A]/40 border border-[#334155] rounded-2xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-2">
              Search Text
            </label>
            <input
              type="text"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Filter question text…"
              className="w-full bg-[#1E293B] border border-[#334155] p-3 rounded-xl text-white text-sm outline-none focus:border-[#4F46E5] transition-all placeholder:text-[#475569] font-semibold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-2">
              Topic
            </label>
            <select
              value={filterTopic}
              onChange={e => setFilterTopic(e.target.value)}
              className="w-full bg-[#1E293B] border border-[#334155] p-3 rounded-xl text-white text-sm outline-none font-semibold"
            >
              {topics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-2">
              Difficulty
            </label>
            <select
              value={filterDiff}
              onChange={e => setFilterDiff(e.target.value)}
              className="w-full bg-[#1E293B] border border-[#334155] p-3 rounded-xl text-white text-sm outline-none font-semibold"
            >
              {['All', 'easy', 'medium', 'hard'].map(d => (
                <option key={d} value={d}>
                  {d === 'All' ? 'All Difficulties' : d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick-select actions */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button
            onClick={selectVisible}
            className="text-[10px] font-black uppercase tracking-widest text-[#4F46E5] border border-[#4F46E5]/30 bg-[#4F46E5]/5 hover:bg-[#4F46E5]/10 px-4 py-2 rounded-lg transition-all cursor-pointer"
          >
            + Select Visible ({filtered.length})
          </button>
          <button
            onClick={clearAll}
            className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] border border-[#334155] hover:bg-white/5 px-4 py-2 rounded-lg transition-all cursor-pointer"
          >
            Clear All
          </button>
          <span className="ml-auto text-[10px] font-bold text-[#94A3B8]">
            {filtered.length} / {allQuestions.length} questions visible
          </span>
        </div>
      </div>

      {/* ── Question List ── */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[#94A3B8] text-sm font-semibold border border-[#334155] rounded-2xl bg-[#1E293B]/30">
            No questions match the current filters.
          </div>
        )}
        {filtered.map(q => {
          const isChecked = selected.has(q.id);
          const isMulti   = Array.isArray(q.correctAnswer);

          return (
            <motion.div
              key={q.id}
              layout
              onClick={() => toggle(q.id)}
              className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer select-none transition-all duration-150 ${
                isChecked
                  ? 'border-[#4F46E5]/50 bg-[#4F46E5]/5'
                  : 'border-[#334155] bg-[#1E293B]/50 hover:border-[#4F46E5]/30 hover:bg-[#4F46E5]/5'
              }`}
            >
              {/* Neomorphic checkbox */}
              <div className="pt-0.5 flex-shrink-0">
                <NeoCheckbox
                  checked={isChecked}
                  onChange={() => toggle(q.id)}
                />
              </div>

              {/* Question meta + text */}
              <div className="flex-grow min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-black text-[#475569] uppercase tracking-widest">
                    #{q.id}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[#0F172A] border border-[#334155] text-[#94A3B8]">
                    {q.topic}
                  </span>
                  <DifficultyBadge level={q.difficulty ?? 'unrated'} />
                  {isMulti && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border text-[#4F46E5] bg-[#4F46E5]/10 border-[#4F46E5]/30">
                      Multi
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#F8FAFC] font-semibold leading-snug line-clamp-2">
                  {q.question}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN ADMIN COMPONENT ─────────────────────────────────────────────────────

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked,     setAuthChecked]     = useState(false);
  const [userEmail,       setUserEmail]       = useState<string | null>(null);
  const [activeTab,       setActiveTab]       = useState<ActiveTab>('reports');

  // Single source of truth: Firebase auth state observer
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setIsAuthenticated(!!user);
      setUserEmail(user?.email ?? null);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // Auto-logout after 2 minutes of inactivity
  useEffect(() => {
    if (!isAuthenticated) return;

    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => auth.signOut(), 120_000);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;
    events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer(); // arm immediately on login

    return () => {
      clearTimeout(timer);
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await auth.signOut();
  };

  // ── Loading state (resolving persisted session) ──
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center py-32 text-[#4F46E5] font-bold tracking-widest animate-pulse text-[11px] uppercase">
        Initializing Secure Session…
      </div>
    );
  }

  // ── Unauthenticated ──
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // ── Authenticated Dashboard ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="max-w-7xl mx-auto py-4 px-1"
    >

      {/* ── Dashboard Header Card ── */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-[2rem] p-6 md:p-8 shadow-2xl mb-6">

        {/* Top row: identity + logout */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#4F46E5] bg-[#4F46E5]/10 border border-[#4F46E5]/30 px-3 py-1 rounded-lg">
                Admin Console
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-3 py-1 rounded-lg">
                ● Live
              </span>
            </div>
            <h1 className="text-2xl font-black text-white">Enterprise Control Panel</h1>
            <p className="text-[#94A3B8] text-xs font-semibold mt-1">
              Authenticated as&nbsp;
              <span className="text-white font-bold">{userEmail}</span>
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] border border-[#334155] hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/5 px-5 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            🚪 Sign Out
          </button>
        </div>

        {/* Tab strip */}
        <div className="flex gap-1 border-b border-[#334155]">
          {([
            { key: 'reports' as const, icon: '📊', label: 'Exam Reports',    sub: 'Session logs & export'   },
            { key: 'presets' as const, icon: '⚙️', label: 'Preset Manager',  sub: 'Build & push exam sets'  },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-6 py-3.5 rounded-t-xl font-black text-[11px] uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'text-[#4F46E5] bg-[#4F46E5]/10 border border-b-0 border-[#4F46E5]/30 -mb-px'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8  }}
          animate={{ opacity: 1, y: 0  }}
          exit={{    opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'reports' ? <ReportsTab /> : <PresetsTab />}
        </motion.div>
      </AnimatePresence>

    </motion.div>
  );
}
