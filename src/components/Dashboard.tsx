import React from 'react';
import { 
  ShieldCheck, 
  Activity, 
  ServerCrash,
  ArrowUpRight,
  ArrowDownRight,
  GitCommit,
  Globe,
  Monitor
} from 'lucide-react';

const OVERVIEW_METRICS = [
  { label: 'Overall Compliance', value: '92%', trend: '+2.4%', status: 'good' },
  { label: 'Active Targets', value: '14', trend: '0%', status: 'neutral' },
  { label: 'Critical Findings', value: '3', trend: '-2', status: 'bad' },
  { label: 'Pending Reviews', value: '7', trend: '+1', status: 'warning' }
];

const RECENT_SCANS = [
  { id: 'SCN-1042', target: 'api.production.internal', type: 'website', status: 'passed', time: '12m ago', findings: 0 },
  { id: 'SCN-1041', target: 'frontend-core-repo', type: 'repository', status: 'warning', time: '1h ago', findings: 2 },
  { id: 'SCN-1040', target: 'auth-service', type: 'repository', status: 'failed', time: '3h ago', findings: 5 },
  { id: 'SCN-1039', target: 'marketing-site', type: 'website', status: 'passed', time: '5h ago', findings: 0 },
];

export function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Technical Compliance Overview</h1>
          <p className="text-sm text-slate-400 mt-1">Immutable evidence and scoring provenance across your assets.</p>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Run Global Scan
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {OVERVIEW_METRICS.map((metric, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-400 mb-2">{metric.label}</div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-semibold text-slate-100">{metric.value}</div>
              <div className={`text-xs font-medium flex items-center gap-1
                ${metric.status === 'good' ? 'text-emerald-400' : ''}
                ${metric.status === 'bad' ? 'text-rose-400' : ''}
                ${metric.status === 'warning' ? 'text-amber-400' : ''}
                ${metric.status === 'neutral' ? 'text-slate-500' : ''}
              `}>
                {metric.trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : null}
                {metric.trend.startsWith('-') ? <ArrowDownRight className="w-3 h-3" /> : null}
                {metric.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Scans */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-800/60 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">Recent Scans</h2>
            <button className="text-sm text-emerald-400 hover:text-emerald-300 font-medium">View all log</button>
          </div>
          <div className="divide-y divide-slate-800/60">
            {RECENT_SCANS.map((scan) => (
              <div key={scan.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border
                    ${scan.status === 'passed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : ''}
                    ${scan.status === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : ''}
                    ${scan.status === 'failed' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : ''}
                  `}>
                    {scan.type === 'website' ? <Globe className="w-4 h-4" /> : <GitCommit className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 text-sm flex items-center gap-2">
                      {scan.target}
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                        {scan.id}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Completed {scan.time} • {scan.findings} findings
                    </div>
                  </div>
                </div>
                <div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border
                    ${scan.status === 'passed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : ''}
                    ${scan.status === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : ''}
                    ${scan.status === 'failed' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : ''}
                  `}>
                    {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-100 mb-4">Module Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-slate-300">Security Headers</span>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GitCommit className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-slate-300">Repository Baseline</span>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-500">Privacy Browser</span>
                </div>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Disabled</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-xl shadow-sm p-6">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
              <ServerCrash className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mb-2">Automated Incident Response</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              GuardAI can automatically notify external webhooks when Critical findings are detected.
            </p>
            <button className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">
              Configure Webhooks &rarr;
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
