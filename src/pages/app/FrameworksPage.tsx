import { useEffect, useState } from 'react';
import { BookOpenCheck, ChevronRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { createGovernanceApi } from '../../api/governanceApi';
import type { GovernanceFrameworkSummary } from '../../types/governance';

export default function FrameworksPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [frameworks, setFrameworks] = useState<GovernanceFrameworkSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    createGovernanceApi(async () => session.access_token)
      .listFrameworks()
      .then((items) => {
        if (!cancelled) setFrameworks(items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load frameworks.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [session, retry]);

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading frameworks...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">Govern</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">Frameworks</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
          Versioned GuardAI requirement catalogs. External framework mappings are shown only when they are explicitly versioned and available.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>{error}</span>
          <button onClick={() => setRetry((value) => value + 1)} className="inline-flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {frameworks.map((framework) => (
          <button
            key={framework.id}
            onClick={() => navigate(`/app/frameworks/${encodeURIComponent(framework.id)}`)}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition-colors hover:bg-slate-800/40"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
                <BookOpenCheck className="h-5 w-5 text-indigo-300" />
              </div>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-indigo-300">{framework.id}</span>
              <span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-500">v{framework.version}</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold text-slate-100">{framework.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{framework.description}</p>
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500">
              <span>{framework.controlCount} controls</span>
              <span>{framework.requirementCount} requirements</span>
              <span>{framework.externalMappingCount} external mappings</span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
        The current catalog is intentionally an internal technical baseline. GuardAI does not claim ISO, SOC 2, NIS2 or other external framework coverage until those mappings are separately versioned and reviewed.
      </div>
    </div>
  );
}
