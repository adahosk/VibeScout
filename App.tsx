
import React from 'react';
import ChatInterface from './components/ChatInterface';
import VibeScoutLogo from './components/VibeScoutLogo';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-effect sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white p-1.5 rounded-lg">
            <VibeScoutLogo className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">VibeScout</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Context over Content</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Analysis Active
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-8">
        <ChatInterface />
      </main>
    </div>
  );
};

export default App;
