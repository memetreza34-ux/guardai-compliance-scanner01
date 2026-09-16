import React from 'react';
import { Search, Filter, GitCommit, Globe, MoreVertical } from 'lucide-react';

const SCANS_LIST = [
  { id: 'SCN-1042', target: 'api.production.internal', type: 'website', status: 'passed', time: '12m ago', findings: 0, profile: 'security-mvp@1' },
  { id: 'SCN-1041', target: 'frontend-core-repo', type: 'repository', status: 'warning', time: '1h ago', findings: 2, profile: 'repository-mvp@1' },
  { id: 'SCN-1040', target: 'auth-service', type: 'repository', status: 'failed', time: '3h ago', findings: 5, profile: 'repository-mvp@1' },
  { id: 'SCN-1039', target: 'marketing-site', type: 'website', status: 'passed', time: '5h ago', findings: 0, profile: 'security-mvp@1' },
  { id: 'SCN-1038', target: 'dashboard-ui', type: 'website', status: 'passed', time: '1d ago', findings: 0, profile: 'security-mvp@1' },
  { id: 'SCN-1037', target: 'payment-gateway', type: 'repository', status: 'passed', time: '1d ago', findings: 0, profile: 'repository-mvp@1' },
];

export function Scans() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Scans & Evidence</h1>
          <p className="text-sm text-slate-400 mt-1">Immutable report snapshots and technical findings.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search targets or IDs..." 
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all w-64"
            />
          </div>
          <button className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800/60 bg-slate-900/50 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4">Scan ID</th>
              <th className="px-6 py-4">Target</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Profile</th>
              <th className="px-6 py-4">Findings</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {SCANS_LIST.map((scan) => (
              <tr key={scan.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-6 py-4">
                  <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800/60">
                    {scan.id}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-200">{scan.target}</td>
                <td className="px-6 py-4 text-slate-400">
                  <div className="flex items-center gap-2">
                    {scan.type === 'website' ? <Globe className="w-4 h-4" /> : <GitCommit className="w-4 h-4" />}
                    <span className="capitalize">{scan.type}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400 font-mono text-xs">{scan.profile}</td>
                <td className="px-6 py-4">
                  {scan.findings > 0 ? (
                    <span className="text-rose-400 font-medium">{scan.findings} issues</span>
                  ) : (
                    <span className="text-slate-500">None</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                    ${scan.status === 'passed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : ''}
                    ${scan.status === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : ''}
                    ${scan.status === 'failed' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : ''}
                  `}>
                    {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
