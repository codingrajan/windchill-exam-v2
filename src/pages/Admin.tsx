// src/pages/Admin.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '../services/firebase';
import type { Question, ExamResult, Preset } from '../types/index';

// ── Local Types ───────────────────────────────────────────────────────────────

interface ExamResultDoc extends ExamResult {
  docId: string;
}

type ActiveTab = 'reports' | 'presets';

// ── Preset slot definitions (V1 parity — fixed slot IDs) ─────────────────────
const PRESET_SLOTS = [
  { id: 'preset_1', label: 'Slot A', targetCount: 25 },
  { id: 'preset_2', label: 'Slot B', targetCount: 50 },
  { id: 'preset_3', label: 'Slot C', targetCount: 75 },
] as const;

type SlotId = (typeof PRESET_SLOTS)[number]['id'];

const POOL_FILES = [
  '/data/windchill_mock_test_1.json',
  '/data/windchill_mock_test_2.json',
  '/data/windchill_mock_test_3.json',
  '/data/windchill_mock_test_4.json',
  '/data/windchill_mock_test_5.json',
];

// ── Shared Sub-Components ─────────────────────────────────────────────────────

function DiffBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    easy:   'bg-emerald-50 text-emerald-600 border-emerald-100',
    medium: 'bg-amber-50  text-amber-600  border-amber-100',
    hard:   'bg-red-50    text-red-600    border-red-100',
  };
  const cls = map[level?.toLowerCase()] ?? 'bg-zinc-100 text-zinc-500 border-zinc-200';
  return (
    <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cls}`}>
      {level}
    </span>
  );
}

// Light-theme checkbox
function LiteCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      aria-checked={checked}
      className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all duration-150 border-2"
      style={{
        background:   checked ? '#4F46E5' : '#FFFFFF',
        borderColor:  checked ? '#4F46E5' : '#D4D4D8',
        boxShadow:    checked ? '0 0 0 3px rgba(79,70,229,0.15)' : 'none',
      }}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────

function ReportsTab() {
  const [records,       setRecords]       = useState<ExamResultDoc[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [filterName,    setFilterName]    = useState('');
  const [filterFrom,    setFilterFrom]    = useState('');
  const [filterTo,      setFilterTo]      = useState('');
  const [filterScore,   setFilterScore]   = useState<'all' | 'pass' | 'fail'>('all');
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [isDeleting,    setIsDeleting]    = useState(false);

  const fetchRecords = () => {
    setIsLoading(true);
    db.collection('exam_results')
      .orderBy('examDate', 'desc')
      .get()
      .then(snap => {
        const docs: ExamResultDoc[] = [];
        snap.forEach(d => docs.push({ ...(d.data() as ExamResult), docId: d.id }));
        setRecords(docs);
      })
      .catch(err => console.error('Fetch error:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchRecords(); }, []);

  const filtered = useMemo(() => {
    return records.filter(r => {
      const nameMatch  = !filterName || r.examineeName.toLowerCase().includes(filterName.toLowerCase());
      const scoreMatch = filterScore === 'all' || (filterScore === 'pass' ? r.passed : !r.passed);
      const date = r.examDate ? new Date(r.examDate) : null;
      const fromMatch  = !filterFrom || (date && date >= new Date(filterFrom));
      const toMatch    = !filterTo   || (date && date <= new Date(filterTo + 'T23:59:59'));
      return nameMatch && scoreMatch && fromMatch && toMatch;
    });
  }, [records, filterName, filterScore, filterFrom, filterTo]);

  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.docId));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(r => next.delete(r.docId));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(r => next.add(r.docId));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Permanently delete ${selected.size} record(s)? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await Promise.all([...selected].map(id => db.collection('exam_results').doc(id).delete()));
      setSelected(new Set());
      fetchRecords();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Some records could not be deleted. Check console.');
    } finally {
      setIsDeleting(false);
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Name', 'Mode', 'Score %', 'Correct', 'Total', 'Passed', 'Strongest Domain', 'Weakest Domain', 'Time (s)', 'Date'],
      ...filtered.map(r => [
        r.examineeName, r.examMode, r.scorePercentage, r.questionsAnsweredCorrectly,
        r.totalQuestions, r.passed ? 'Yes' : 'No',
        r.strongestDomain ?? '', r.weakestDomain ?? '',
        r.timeTakenSeconds, r.examDate,
      ]),
    ];
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `exam_results_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fmtTime = (sec?: number) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Filter Records</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search by name…"
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-800 font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-zinc-300"
          />
          <select
            value={filterScore}
            onChange={e => setFilterScore(e.target.value as 'all' | 'pass' | 'fail')}
            className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-800 font-medium outline-none focus:border-indigo-400 transition-all"
          >
            <option value="all">All Results</option>
            <option value="pass">Passed Only</option>
            <option value="fail">Failed Only</option>
          </select>
          <div className="relative">
            <label className="absolute -top-2 left-3 text-[9px] font-semibold text-zinc-400 uppercase tracking-wider bg-white px-1">From</label>
            <input
              type="date"
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-800 font-medium outline-none focus:border-indigo-400 transition-all"
            />
          </div>
          <div className="relative">
            <label className="absolute -top-2 left-3 text-[9px] font-semibold text-zinc-400 uppercase tracking-wider bg-white px-1">To</label>
            <input
              type="date"
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-800 font-medium outline-none focus:border-indigo-400 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-zinc-600">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </span>
          {selected.size > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                {selected.size} selected
              </span>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="text-xs font-semibold text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 px-3 py-1 rounded-full transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Delete Selected'}
              </button>
            </motion.div>
          )}
        </div>
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 text-sm font-medium">
            No records match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="px-4 py-3 text-left">
                    <LiteCheckbox checked={allSelected} onChange={toggleAll} />
                  </th>
                  {['Examinee', 'Mode', 'Score', 'Result', 'Time', 'Strongest Domain', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr
                    key={r.docId}
                    className={`border-b border-zinc-50 hover:bg-zinc-50/60 transition-colors ${
                      selected.has(r.docId) ? 'bg-indigo-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <LiteCheckbox checked={selected.has(r.docId)} onChange={() => toggleOne(r.docId)} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-800 whitespace-nowrap">{r.examineeName}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-medium text-zinc-500 capitalize bg-zinc-100 px-2.5 py-1 rounded-full">
                        {r.examMode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${r.scorePercentage >= 80 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {r.scorePercentage}%
                      </span>
                      <span className="text-[11px] text-zinc-400 ml-1">
                        ({r.questionsAnsweredCorrectly}/{r.totalQuestions})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                        r.passed
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-red-50 text-red-500 border-red-100'
                      }`}>
                        {r.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-medium whitespace-nowrap">{fmtTime(r.timeTakenSeconds)}</td>
                    <td className="px-4 py-3 text-zinc-500 font-medium text-[12px] max-w-[140px] truncate">
                      {r.strongestDomain ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-[12px] whitespace-nowrap">{fmtDate(r.examDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Presets Tab ───────────────────────────────────────────────────────────────

function PresetsTab() {
  const [allQuestions,   setAllQuestions]   = useState<Question[]>([]);
  const [isPoolLoading,  setIsPoolLoading]  = useState(true);
  const [activeSlot,     setActiveSlot]     = useState<SlotId>('preset_1');
  const [slotPresets,    setSlotPresets]    = useState<Partial<Record<SlotId, Preset>>>({});
  const [search,         setSearch]         = useState('');
  const [filterTopic,    setFilterTopic]    = useState('');
  const [filterDiff,     setFilterDiff]     = useState('');
  const [selected,       setSelected]       = useState<Set<number>>(new Set());
  const [presetName,     setPresetName]     = useState('');
  const [isSaving,       setIsSaving]       = useState(false);
  const [isDeleting,     setIsDeleting]     = useState(false);
  const [saveMsg,        setSaveMsg]        = useState('');

  const slot = PRESET_SLOTS.find(s => s.id === activeSlot)!;

  // Load question pool
  useEffect(() => {
    const init = async () => {
      const reqs = POOL_FILES.map(f => fetch(f).then(r => r.ok ? r.json() : []).catch(() => []));
      const flat: Question[] = (await Promise.all(reqs)).flat();
      setAllQuestions(flat);
      setIsPoolLoading(false);
    };
    init();
  }, []);

  // Load existing preset for each slot
  useEffect(() => {
    PRESET_SLOTS.forEach(s => {
      db.collection('exam_presets').doc(s.id).get()
        .then(doc => {
          if (doc.exists) {
            setSlotPresets(prev => ({ ...prev, [s.id]: doc.data() as Preset }));
          }
        })
        .catch(err => console.error(`Preset load error for ${s.id}:`, err));
    });
  }, []);

  // When slot changes, populate name from existing preset
  useEffect(() => {
    const existing = slotPresets[activeSlot];
    setPresetName(existing?.name ?? '');
    setSelected(new Set(existing?.questions ?? []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlot, slotPresets]);

  const topics = useMemo(() => [...new Set(allQuestions.map(q => q.topic))].sort(), [allQuestions]);

  const filtered = useMemo(() => {
    return allQuestions.filter(q => {
      const textMatch  = !search || q.question.toLowerCase().includes(search.toLowerCase());
      const topicMatch = !filterTopic || q.topic === filterTopic;
      const diffMatch  = !filterDiff  || q.difficulty?.toLowerCase() === filterDiff;
      return textMatch && topicMatch && diffMatch;
    });
  }, [allQuestions, search, filterTopic, filterDiff]);

  const allFiltered = filtered.length > 0 && filtered.every(q => selected.has(q.id));

  const toggleAll = () => {
    if (allFiltered) {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(q => next.delete(q.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(q => next.add(q.id));
        return next;
      });
    }
  };

  const toggleQ = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (selected.size !== slot.targetCount) return;
    if (!presetName.trim()) return;
    setIsSaving(true);
    setSaveMsg('');
    try {
      const payload: Preset = {
        id:          activeSlot,
        name:        presetName.trim(),
        questions:   [...selected],
        targetCount: slot.targetCount,
        updatedAt:   new Date().toISOString(),
      };
      await db.collection('exam_presets').doc(activeSlot).set(payload);
      setSlotPresets(prev => ({ ...prev, [activeSlot]: payload }));
      setSaveMsg('Preset saved successfully.');
    } catch (err) {
      console.error('Save error:', err);
      setSaveMsg('Error saving preset.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete the preset in ${slot.label}? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await db.collection('exam_presets').doc(activeSlot).delete();
      setSlotPresets(prev => { const next = { ...prev }; delete next[activeSlot]; return next; });
      setPresetName('');
      setSelected(new Set());
      setSaveMsg('Preset deleted.');
    } catch (err) {
      console.error('Delete error:', err);
      setSaveMsg('Error deleting preset.');
    } finally {
      setIsDeleting(false);
    }
  };

  const existingPreset = slotPresets[activeSlot];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

      {/* Left — Slot selector + form */}
      <div className="xl:col-span-1 space-y-4">

        {/* Slot tabs */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Preset Slots</p>
          <div className="space-y-2">
            {PRESET_SLOTS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSlot(s.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  activeSlot === s.id
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-zinc-100 bg-zinc-50 hover:border-indigo-200'
                }`}
              >
                <div>
                  <span className={`text-sm font-semibold ${activeSlot === s.id ? 'text-indigo-700' : 'text-zinc-700'}`}>
                    {s.label}
                  </span>
                  <span className="text-[11px] text-zinc-400 ml-2">{s.targetCount}Q</span>
                </div>
                {slotPresets[s.id] ? (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-zinc-400">Empty</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Preset form */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              {slot.label} — {slot.targetCount} Questions
            </p>
            {existingPreset && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-[11px] font-semibold text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Delete Preset'}
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Preset Name
              </label>
              <input
                type="text"
                placeholder="e.g. Week 3 Mock Exam"
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-800 font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-zinc-300"
              />
            </div>

            {/* Selection count indicator */}
            <div className={`rounded-xl px-4 py-3 border text-center ${
              selected.size === slot.targetCount
                ? 'bg-emerald-50 border-emerald-100'
                : 'bg-zinc-50 border-zinc-100'
            }`}>
              <span className={`text-sm font-bold ${
                selected.size === slot.targetCount ? 'text-emerald-600' : 'text-zinc-500'
              }`}>
                {selected.size} / {slot.targetCount} selected
              </span>
              {selected.size !== slot.targetCount && (
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Select exactly {slot.targetCount} questions to save
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={selected.size !== slot.targetCount || !presetName.trim() || isSaving}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-100"
            >
              {isSaving ? 'Saving…' : `Save ${slot.label} Preset`}
            </button>

            {saveMsg && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-[12px] font-medium text-center ${
                  saveMsg.includes('Error') ? 'text-red-500' : 'text-emerald-600'
                }`}
              >
                {saveMsg}
              </motion.p>
            )}
          </form>
        </div>
      </div>

      {/* Right — Question picker */}
      <div className="xl:col-span-2 space-y-4">
        {/* Filters */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Filter Question Pool</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Search questions…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-800 font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-zinc-300"
            />
            <select
              value={filterTopic}
              onChange={e => setFilterTopic(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-800 font-medium outline-none focus:border-indigo-400 transition-all"
            >
              <option value="">All Topics</option>
              {topics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={filterDiff}
              onChange={e => setFilterDiff(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-800 font-medium outline-none focus:border-indigo-400 transition-all"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Question list */}
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
          {isPoolLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50 border-b border-zinc-100">
                <LiteCheckbox checked={allFiltered} onChange={toggleAll} />
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {filtered.length} question{filtered.length !== 1 ? 's' : ''} shown
                </span>
              </div>

              <div className="max-h-[520px] overflow-y-auto divide-y divide-zinc-50">
                {filtered.map(q => (
                  <div
                    key={q.id}
                    onClick={() => toggleQ(q.id)}
                    className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                      selected.has(q.id) ? 'bg-indigo-50/50' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <LiteCheckbox checked={selected.has(q.id)} onChange={() => toggleQ(q.id)} />
                    <div className="flex-grow min-w-0">
                      <p className="text-[13px] font-medium text-zinc-700 leading-snug line-clamp-2">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] font-medium bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
                          {q.topic}
                        </span>
                        <DiffBadge level={q.difficulty} />
                        {Array.isArray(q.correctAnswer) && (
                          <span className="text-[10px] font-medium bg-indigo-50 text-indigo-500 border border-indigo-100 px-2 py-0.5 rounded-full">
                            Multi
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-300 font-medium ml-auto">#{q.id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Component ──────────────────────────────────────────────────────

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading,   setIsAuthLoading]   = useState(true);
  const [activeTab,       setActiveTab]       = useState<ActiveTab>('reports');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [loginError,      setLoginError]      = useState('');
  const [isLoggingIn,     setIsLoggingIn]     = useState(false);

  // Auth state observer
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      setIsAuthenticated(!!user);
      setIsAuthLoading(false);
    });
    return unsub;
  }, []);

  // Inactivity auto-logout (2 minutes)
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isAuthenticated) return;
    const TIMEOUT = 120_000;
    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => auth.signOut(), TIMEOUT);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;
    events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [isAuthenticated]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch {
      setLoginError('Invalid credentials. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Auth loading
  if (isAuthLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center min-h-[70vh] px-4"
      >
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl mb-4">
              <span className="text-2xl select-none">🔐</span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Admin Console</h2>
            <p className="text-zinc-500 text-sm font-medium mt-1">Windchill Exam Administration</p>
          </div>

          <div className="bg-white border border-zinc-100 rounded-3xl shadow-sm p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 font-medium outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all placeholder:text-zinc-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 font-medium outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all placeholder:text-zinc-300"
                />
              </div>

              <AnimatePresence>
                {loginError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs font-semibold text-red-500 text-center"
                  >
                    {loginError}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm tracking-wide shadow-sm shadow-indigo-100 transition-all disabled:opacity-60"
              >
                {isLoggingIn ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    );
  }

  // Authenticated view
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-7xl mx-auto py-4 px-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Admin Command Center</h1>
          <p className="text-sm text-zinc-500 font-medium mt-0.5">Exam Reports & Preset Management</p>
        </div>
        <button
          onClick={() => auth.signOut()}
          className="text-xs font-semibold text-zinc-500 border border-zinc-200 hover:border-red-200 hover:text-red-500 hover:bg-red-50 px-4 py-2 rounded-full transition-all"
        >
          Sign Out
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit mb-6">
        {([
          { key: 'reports', label: 'Exam Reports' },
          { key: 'presets', label: 'Preset Manager' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === t.key
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'reports' ? <ReportsTab /> : <PresetsTab />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
