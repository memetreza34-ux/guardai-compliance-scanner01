import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { createFindingApi } from '../../api/findingApi';
import { createWorkspaceApi } from '../../api/workspaceApi';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { FindingLifecycleStatus, FindingTechnicalSeverity, WorkspaceFindingSummary } from '../../types/findingLifecycle';

function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString();
}

function severityClass(severity: FindingTechnicalSeverity | null) {
  if (severity === 'critical') return 'border-rose-500/20 bg-rose-500/10 text-rose-400';
  if (severity === 'warning') return 'border-amber-500/20 bg-amber-500/10 text-amber-400';
  if (severity === 'info') return 'border-sky-500/20 bg-sky-500/10 text-sky-400';
  return 'border-slate-700 bg-slate-800/50 text-slate-400';
}

function statusLabel(finding: WorkspaceFindingSummary) {
  if (finding.status === 'resolved') return 'Resolved — not scan-verified';
  if (finding.status === 'accepted_risk') return 'Accepted risk';
  return 'Open';
}

export default function FindingsPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();
  const navigate = useNavigate();

  const [findings, setFindings] = useState<WorkspaceFindingSummary[]>([]);
  const [targetNames, setTargetNames] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<FindingLifecycleStatus | 'all'>('open');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFindings([]);
    setNextCursor(null);
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
        const findingApi = createFindingApi(async () => session!.access_token);
        const workspaceApi = createWorkspaceApi(async () => session!.access_token);
        const [page, targets] = await Promise.all([
          findingApi.listFindings(currentOrg!.id, {
            status: status === 'all' ? undefined : status,
            limit: 50,
          }),
          workspaceApi.listTargets(currentOrg!.id),
        ]);
        if (cancelled) return;
        setFindings(page.findings);
        setNextCursor(page.nextCursor);
        setTargetNames(Object.fromEntries(targets.map(target => [target.id, target.displayName])));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load findings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading, status, retry]);

  async function loadMore() {
    if (!session?.access_token || !currentOrg || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const api = createFindingApi(async () => session.access_token);
      const page = await api.listFindings(currentOrg.id, {
        status: status === 'all' ? undefined : status,
        limit: 50,
        cursor: nextCursor,
      });
      setFindings(current => [...current, ...page.findings]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more findings.');
    } finally {
      setLoadingMore(false);
    }
  }

  const counts = useMemo(() => {
    const result = { critical: 0, warning: 0, info: 0, unknown: 0 };
    for (const finding of findings) {
      if (finding.severity === 'critical') result.critical += 1;
      else if (finding.severity === 'warning') result.warning += 1;
      else if (finding.severity === 'info') result.info += 1;
      else result.unknown += 1;
    }
    return result;
  }, [findings]);

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading findings...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-7 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Findings</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Technical issues derived from persisted scan evidence. A manual resolved state is not the same as a scan-verified fix.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Critical', counts.critical],
          ['Warning', counts.warning],
          ['Info', counts.info],
          ['Unknown', counts.unknown],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {([
          ['open', 'Open'],
          ['all', 'All'],
          ['resolved', 'Resolved'],
          ['accepted_risk', 'Accepted risk'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
              status === value
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>{error}</span>
          <button onClick={() => setRetry(value => value + 1)} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-rose-500/10">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {findings.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <h2 className="font-medium text-slate-200">No findings in this view</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
            This only describes the selected GuardAI finding set. It does not prove that no vulnerabilities or compliance issues exist.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {findings.map(finding => (
            <article key={finding.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${severityClass(finding.severity)}`}>
                      {finding.severity || 'unknown'}
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-400">
                      {statusLabel(finding)}
                    </span>
                    {finding.ruleId && <span className="font-mono text-xs text-slate-500">{finding.ruleId}{finding.ruleVersion ? `@${finding.ruleVersion}` : ''}</span>}
                  </div>
                  <h2 className="mt-3 text-base font-semibold text-slate-100">{finding.ruleTitle || finding.message || 'Technical finding'}</h2>
                  {finding.message && finding.ruleTitle && <p className="mt-2 text-sm leading-6 text-slate-300">{finding.message}</p>}
                  <div className="mt-3 text-xs text-slate-500">
                    Target: {targetNames[finding.targetId] || finding.targetId} · Last observed {formatDate(finding.lastSeenAt)}
                  </div>
                </div>
                {finding.latestScanId && (
                  <button
                    onClick={() => navigate(`/app/scans/${finding.latestScanId}`)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    View source scan <ExternalLink className="h-4 w-4" />
                  </button>
                )}
              </div>

              {finding.remediation && (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <AlertTriangle className="h-3.5 w-3.5" /> Recommended remediation
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{finding.remediation}</p>
                </div>
              )}

              {finding.status === 'resolved' && (
                <div className="mt-4 text-xs text-amber-400/90">
                  This finding is marked resolved in the workflow. GuardAI has not yet represented this state as a verified re-test result.
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
