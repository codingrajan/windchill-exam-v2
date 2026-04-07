// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Welcome from './pages/Welcome';
import Quiz from './pages/Quiz';
import Results from './pages/Results';
import Admin from './pages/Admin';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] flex flex-col items-center font-sans">
        
        <header className="w-full bg-[#334155]/75 backdrop-blur-xl border-b border-[#475569] p-4 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/images/ptc_logo.png" alt="PTC" className="h-10 bg-white p-1 rounded shadow-sm" />
              <div className="h-6 w-px bg-[#475569]"></div>
              <img src="/images/plural_logo.jpg" alt="Plural" className="h-10 bg-white p-1 rounded shadow-sm" />
            </div>
            <div className="hidden md:block">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#94A3B8] border border-[#334155] px-3 py-1 rounded-md">
                Implementation Practitioner Mock Exam
              </span>
            </div>
          </div>
        </header>

        <main className="w-full max-w-7xl p-6 flex-grow flex flex-col">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/results" element={<Results />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;