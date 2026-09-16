import React from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  ScanSearch, 
  BookOpenCheck,
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react';
import type { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const navItems = [
    { id: 'dashboard' as ViewState, label: 'Overview', icon: LayoutDashboard },
    { id: 'scans' as ViewState, label: 'Scans & Evidence', icon: ScanSearch },
    { id: 'ai-governance' as ViewState, label: 'AI Governance', icon: BookOpenCheck },
  ];

  return (
    <div className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800/60">
        <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <span className="font-semibold text-slate-100 tracking-wide">GuardAI</span>
      </div>

      <div className="flex-1 py-6 px-4 space-y-1">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 px-2">
          Platform
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-slate-800 text-slate-100 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : ''}`} />
                {item.label}
              </div>
              {isActive && <ChevronRight className="w-4 h-4 text-slate-500" />}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800/60 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all">
          <Settings className="w-4 h-4" />
          Settings
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
