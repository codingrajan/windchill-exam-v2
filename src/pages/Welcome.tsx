// src/pages/Welcome.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import type { Preset } from '../types/index';

export default function Welcome() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'preset' | 'random'>('preset');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [randomCount, setRandomCount] = useState<number>(25);
  const [examineeName, setExamineeName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Full Domain List from V1
  const allDomains = [
    "Change Management", "BOM Management", "Document Management", 
    "Visualization", "System Administration", "Business Administration", 
    "Workflow & Lifecycles", "Security & Access Control", "CAD Integration"
  ];

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const snapshot = await db.collection("exam_presets").get();
        const loaded: Preset[] = [];
        snapshot.forEach(doc => loaded.push(doc.data() as Preset));
        setPresets(loaded);
        if (loaded.length > 0) setSelectedPresetId(loaded[0].id);
        else setMode('random');
      } catch (err) { console.error("Firebase Fetch Error:", err); }
      finally { setIsLoading(false); }
    };
    fetchPresets();
  }, []);

  const getQCount = () => mode === 'random' ? randomCount : presets.find(p => p.id === selectedPresetId)?.targetCount || 0;
  
  const getTimeLimit = () => {
    const count = getQCount();
    if (count <= 25) return "15 Min";
    if (count <= 50) return "35 Min";
    if (count <= 75) return "60 Min";
    return "75 Min";
  };

  const isFormValid = examineeName.trim().length >= 3 && (mode === 'random' || (mode === 'preset' && selectedPresetId !== ''));
  if (isLoading) return <div className="flex h-screen items-center justify-center text-[#4F46E5] font-bold">Loading System...</div>;
  return (
    <div className="max-w-4xl mx-auto mt-4 px-4 pb-12">
      <div className="bg-[#1E293B] border border-[#334155] rounded-[2rem] p-8 md:p-12 shadow-2xl">
        
        <div className="text-center mb-10">
          <div className="inline-block bg-[#4F46E5] text-white text-[10px] font-black tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
            Windchill Implementation Practitioner
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">PTC x Plural Mock Exam</h1>
          <p className="text-[#94A3B8] font-medium italic">Professional Certification Preparation Environment</p>
        </div>

        {/* INFO GRID */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <InfoCard icon="📋" label="Questions" value={getQCount() || '--'} />
          <InfoCard icon="⏱" label="Time Limit" value={getTimeLimit()} />
          <InfoCard icon="🎯" label="Pass Score" value="80%" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* LEFT COLUMN: CONFIGURATION */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-3">Examinee Identity</label>
              <input 
                type="text" 
                placeholder="Enter Full Name" 
                className="w-full bg-[#0F172A] border border-[#334155] p-4 rounded-xl text-white focus:border-[#4F46E5] outline-none transition-all font-semibold"
                value={examineeName}
                onChange={(e) => setExamineeName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-3">Exam Mode</label>
              <div className="flex gap-2">
                <button onClick={() => setMode('preset')} className={`flex-1 py-3 rounded-xl border-2 font-bold text-xs transition-all ${mode === 'preset' ? 'border-[#4F46E5] bg-[#4F46E5]/10 text-[#4F46E5]' : 'border-[#334155] text-[#94A3B8]'}`}>Pre-Setup</button>
                <button onClick={() => setMode('random')} className={`flex-1 py-3 rounded-xl border-2 font-bold text-xs transition-all ${mode === 'random' ? 'border-[#4F46E5] bg-[#4F46E5]/10 text-[#4F46E5]' : 'border-[#334155] text-[#94A3B8]'}`}>Random</button>
              </div>
            </div>

            <div className="bg-[#0F172A]/50 p-5 rounded-2xl border border-[#334155]">
              {mode === 'preset' ? (
                <>
                  <label className="block text-[10px] font-bold text-[#94A3B8] mb-2 uppercase">Available Admin Presets</label>
                  {presets.length > 0 ? (
                    <select className="w-full bg-[#1E293B] border border-[#334155] p-3 rounded-lg text-white outline-none font-bold text-sm" value={selectedPresetId} onChange={(e) => setSelectedPresetId(e.target.value)}>
                      {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <div className="text-red-400 text-xs font-bold">No active presets found.</div>
                  )}
                </>
              ) : (
                <>
                  <label className="block text-[10px] font-bold text-[#94A3B8] mb-2 uppercase">Question Volume</label>
                  <select className="w-full bg-[#1E293B] border border-[#334155] p-3 rounded-lg text-white outline-none font-bold text-sm" value={randomCount} onChange={(e) => setRandomCount(Number(e.target.value))}>
                    <option value={25}>25 Questions (Balanced Difficulty)</option>
                    <option value={50}>50 Questions (Comprehensive)</option>
                    <option value={75}>75 Questions (Full Certification Simulation)</option>
                  </select>
                </>
              )}
            </div>

            <button 
              disabled={!isFormValid}
              onClick={() => navigate('/quiz', { state: { examineeName, mode, targetCount: getQCount(), presetId: mode === 'preset' ? selectedPresetId : null } })}
              className={`w-full py-5 rounded-xl font-bold uppercase tracking-widest transition-all ${isFormValid ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-lg shadow-[#4F46E5]/20 cursor-pointer' : 'bg-[#334155] text-[#94A3B8] opacity-50 cursor-not-allowed'}`}
            >
              Initialize Examination
            </button>
          </div>

          {/* RIGHT COLUMN: DOMAINS & RULES */}
          <div className="bg-[#0F172A]/30 border border-[#334155] rounded-2xl p-6">
            <h4 className="text-xs font-black text-[#4F46E5] uppercase tracking-widest mb-4">Curriculum Coverage</h4>
            <div className="flex flex-wrap gap-2 mb-8">
              {allDomains.map(tag => (
                <span key={tag} className="text-[10px] bg-[#1E293B] border border-[#334155] px-3 py-1.5 rounded-lg font-semibold text-[#F8FAFC]">{tag}</span>
              ))}
            </div>

            <div className="space-y-4 border-t border-[#334155] pt-6">
               <h4 className="text-xs font-black text-[#94A3B8] uppercase tracking-widest mb-2">Exam Regulations</h4>
               <ul className="text-[11px] text-[#94A3B8] space-y-2 list-disc pl-4">
                  <li>Passing threshold is strictly <span className="text-white font-bold">80%</span>.</li>
                  <li>Approx. <span className="text-white font-bold">10%</span> of questions are Multiple Response.</li>
                  <li>Session timeout applies based on question volume.</li>
                  <li>Results are logged to the Enterprise Admin Console.</li>
               </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <button onClick={() => navigate('/admin')} className="text-xs font-bold text-[#94A3B8] hover:text-[#4F46E5] transition-all flex items-center justify-center gap-2 mx-auto border border-[#334155] px-6 py-2 rounded-full hover:bg-[#4F46E5]/5">
            🔐 Admin Command Center
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: string, label: string, value: string | number }) {
  return (
    <div className="bg-[#0F172A] border border-[#334155] p-5 rounded-2xl text-center shadow-inner">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">{label}</div>
      <div className="text-xl font-black text-[#F8FAFC]">{value}</div>
    </div>
  );
}