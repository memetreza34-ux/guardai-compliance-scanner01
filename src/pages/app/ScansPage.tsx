import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Clock3, RefreshCw, Search, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { createWorkspaceApi } from '../../api/workspaceApi';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { PersistentScan, PersistentScanStatus } from '../../types/workspace';

function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString();
}

function statusBadge(status: PersistentScanStatus) {
  const common = 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium';
  if (status === 'completed') {
    return <span className={`${common} border-emerald-500/20 bg-emerald-500/10 text-emerald-400`}><ShieldCheck className="h-3.5 w-3.5" /> Completed</span>;
  }
  if (status === 'failed') {
    return <span className={`${common} border-rose-500/20 bg-rose-500/10 text-rose-400`}><XCircle className="h-3.5 w-3.5" /> Failed</span>;
  }
  if (status === 'cancelled') {
    return <span className={`${common} border-slate-500/20 bg-slate-500/10 text-slate-400`}>Cancelled</span>;
  }
  return <span className={`${common} border-amber-500/20 bg-amber-500/10 text-amber-400`}><Clock3 className="h-3.5 w-3.5" /> {status === 'running' ? 'Running' : 'Queued'}</span>;
}

function targetLabel(scan: PersistentScan) {
  return scan.targetSnapshot?.displayName || scan.targetSnapshot?.canonicalUrl || scan.targetId;
}

export default function ScansPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading, error: orgError } = useWorkspace();
  const navigate = useNavigate();
  const [scans, setScans] = useState<PersistentScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [failedScope, setFailedScope] = useState<string | null>(null);
  // Do not render a previous tenant's scan history while the new request is pending.
  const scopeKey = session?.user.id && currentOrg?.id
    ? `${session.user.id}:${currentOrg.id}`
    : null;

  useEffect(() => {
    let cancelled = false;
    setScans([]);
    setLoadedScope(null);
    setFailedScope(null);
    setError(null);

    if (orgLoading) {
      setLoading(true);
      return;
    }

    if (!session?.access_token || !currentOrg) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const api = createWorkspaceApi(async () => session!.access_token);
        const result = await api.listScans(currentOrg!.id, 50);
        if (!cancelled) {
          setScans(result.scans);
          setLoadedScope(scopeKey);
        }
      } catch (err) {
        if (!cancelled) {
          setFailedScope(scopeKey);
          setError(err instanceof Error ? err.message : 'Failed to load scan history.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [session, currentOrg, orgLoading, retry, scopeKey]);

  const hasCurrentData = !!scopeKey && loadedScope === scopeKey;
  const initialFailed = !!scopeKey && failedScope === scopeKey && !hasCurrentData;

  if (orgLoading || loading || (scopeKey && !hasCurrentData && !initialFailed)) {
    return <div role="status" className="flex items-center justify-center p-12 text-slate-400">Loading scan history...</div>;
  }

  if (orgError) {
    return (
      <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-300">
        Workspace access could not be verified: {orgError}
      </div>
    );
  }

  if (initialFailed) {
    return (
      <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-300">
        <p className="font-medium">Scan history is unavailable for this workspace.</p>
        <p className="mt-2">{error || 'The scan history API did not return usable data.'}</p>
        <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-500/30 px-3 py-2 hover:bg-rose-500/10">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Scans</h1>
          <p className="mt-1 text-sm text-slate-400">Create a workspace and a verified target before running technical scans.</p>
        </div>
        <button onClick={() => navigate('/app/targets')} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Go to Targets
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-7 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Technical Scans</h1>
          <p className="mt-1 text-sm text-slate-400">Persistent scan executions for the current workspace. Completion means the requested checks ran; it is not proof of complete security or legal compliance.</p>
        </div>
        <button
          onClick={() => navigate('/app/targets')}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          <Search className="h-4 w-4" /> Run from a target
        </button>
      </div>

      {error ? (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>{error}</span>
          <button onClick={() => setRetry(value => value + 1)} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-rose-500/10">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      ) : scans.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
          <Activity className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <h2 className="font-medium text-slate-200">No persistent scans yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">Open a verified website target and start the available security module. GuardAI will store the execution, evidence and findings in this workspace.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-3 text-xs text-slate-500">Showing up to 50 recent scans returned by this workspace. This is not a complete historical total.</div>
          <div className="divide-y divide-slate-800/70">
            {scans.map(scan => (
              <button
                key={scan.id}
                onClick={() => navigate(`/app/scans/${scan.id}`)}
                className="grid w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-800/30 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-200">{targetLabel(scan)}</div>
                  <div className="mt-1 truncate font-mono text-xs text-slate-500">{scan.id}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500">Modules</div>
                  <div className="mt-1 text-sm text-slate-300">{scan.requestedModules.join(', ')}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatDate(scan.createdAt)}</div>
                </div>
                <div className="flex items-center md:justify-end">
                  {statusBadge(scan.status)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
