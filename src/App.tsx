import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Scans } from './components/Scans';
import { AIGovernance } from './components/AIGovernance';
import type { ViewState } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 font-sans overflow-hidden">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-y-auto p-8 selection:bg-emerald-500/30">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'scans' && <Scans />}
        {currentView === 'ai-governance' && <AIGovernance />}
      </main>
    </div>
  );
}

