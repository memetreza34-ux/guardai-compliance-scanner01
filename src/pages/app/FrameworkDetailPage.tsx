import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpenCheck, ChevronRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { createGovernanceApi } from '../../api/governanceApi';
import type { GovernanceFrameworkDetail } from '../../types/governance';

export default function FrameworkDetailPage() {
  const { frameworkId } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [framework, setFramework] = useState<GovernanceFrameworkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!session?.access_token || !frameworkId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    createGovernanceApi(async () => session.access_token)
      .getFramework(frameworkId)
      .then((item) => {
        if (!cancelled) setFramework(item);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load framework.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [session, frameworkId, retry]);

  const requirementsByControl = useMemo(() => {
    const grouped = new Map<string, GovernanceFrameworkDetail['requirements']>();
    for (const requirement of framework?.requirements || []) {
      grouped.set(requirement.controlId, [...(grouped.get(requirement.controlId) || []), requirement]);
    }
    return grouped;
  }, [framework]);

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading framework...</div>;
  }

  if (!framework || error) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <button onClick={() => navigate('/app/frameworks')} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Back to frameworks
        </button>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-300">
          {error || 'Framework is unavailable.'}
          <button onClick={() => setRetry((value) => value + 1)} className="ml-3 inline-flex items-center gap-1 underline">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <button onClick={() => navigate('/app/frameworks')} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Back to frameworks
      </button>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
          <BookOpenCheck className="h-5 w-5 text-indigo-300" />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-indigo-300">{framework.id}</span>
          <span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-500">version {framework.version}</span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-slate-100">{framework.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{framework.description}</p>
        <div className="mt-6 rounded-xl border border-amber-500/15 bg-amber-500/[0.05] p-4 text-xs leading-5 text-amber-100/80">
          {framework.claimBoundary}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Controls and requirements</h2>
          <p className="text-sm text-slate-500">{framework.controlCount} controls · {framework.requirementCount} requirements</p>
        </div>

        {framework.controls.map((control) => (
          <article key={control.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <button
              className="flex w-full items-start justify-between gap-4 text-left"
              onClick={() => navigate(`/app/controls/${encodeURIComponent(control.id)}`)}
            >
              <div>
                <div className="font-mono text-xs text-indigo-300">{control.id}</div>
                <h3 className="mt-2 font-semibold text-slate-100">{control.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{control.description}</p>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-600" />
            </button>

            <div className="mt-5 space-y-2 border-t border-slate-800 pt-4">
              {(requirementsByControl.get(control.id) || []).map((requirement) => (
                <div key={requirement.id} className="rounded-lg bg-slate-950 p-4">
                  <div className="font-mono text-[11px] text-slate-500">{requirement.id}</div>
                  <div className="mt-1 text-sm font-medium text-slate-300">{requirement.title}</div>
                  <div className="mt-2 text-xs leading-5 text-slate-600">{requirement.scopeBoundary}</div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <div className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
        External mappings: {framework.externalMappingCount}. An empty value is intentional and must not be interpreted as missing hidden compliance coverage.
      </div>
    </div>
  );
}
