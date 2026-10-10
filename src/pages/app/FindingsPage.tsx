import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, RotateCcw, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { createFindingApi } from '../../api/findingApi';
import { createScanIdempotencyKey, createWorkspaceApi } from '../../api/workspaceApi';
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
  if (finding.status === 'resolved' && finding.resolutionVerification === 'verified') return 'Verified resolved';
  if (finding.status === 'resolved') return 'Resolved — unverified';
  if (finding.status === 'accepted_risk') return 'Accepted risk';
  return 'Open';
}

export default function FindingsPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading, error: orgError } = useWorkspace();
  const navigate = useNavigate();

  const [findings, setFindings] = useState<WorkspaceFindingSummary[]>([]);
  const [targetNames, setTargetNames] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<FindingLifecycleStatus | 'all'>('open');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [targetNameLookupFailed, setTargetNameLookupFailed] = useState(false);

  // Each page/cursor belongs to the authenticated user, Organization and status filter.
  const scopeKey = session?.user.id && currentOrg?.id
    ? `${session.user.id}:${currentOrg.id}:${status}`
    : null;
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [failedScope, setFailedScope] = useState<string | null>(null);
  const requestEpoch = useRef(0);

  // Invalidate pagination and mutations before a changed workspace/filter is painted.
  useLayoutEffect(() => {
    requestEpoch.current += 1;
    setLoadingMore(false);
    setActionBusy(null);
  }, [session, currentOrg, orgLoading, status, retry]);

  useEffect(() => {
    let cancelled = false;
    setFindings([]);
    setTargetNames({});
    setTargetNameLookupFailed(false);
    setNextCursor(null);
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
      const token = session!.access_token;
      const orgId = currentOrg!.id;
      const workspaceApi = createWorkspaceApi(async () => token);

      // Target names are supplemental. Failure here must not hide real Findings.
      void workspaceApi.listTargets(orgId).then(targets => {
        if (!cancelled) {
          setTargetNames(Object.fromEntries(targets.map(target => [target.id, target.displayName])));
        }
      }).catch(() => {
        if (!cancelled) setTargetNameLookupFailed(true);
      });

      try {
        const findingApi = createFindingApi(async () => token);
        const page = await findingApi.listFindings(orgId, {
          status: status === 'all' ? undefined : status,
          limit: 50,
        });
        if (cancelled) return;
        setFindings(page.findings);
        setNextCursor(page.nextCursor);
        setLoadedScope(scopeKey);
      } catch (err) {
        if (!cancelled) {
          setFailedScope(scopeKey);
          setError(err instanceof Error ? err.message : 'Failed to load findings.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading, status, retry, scopeKey]);

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

  const canMutate = currentOrg?.role === 'owner' || currentOrg?.role === 'admin' || currentOrg?.role === 'member';

  async function markFixedUnverified(finding: WorkspaceFindingSummary) {
    if (!session?.access_token || !currentOrg || !canMutate) return;
    setActionBusy(`resolve:${finding.id}`);
    setError(null);
    try {
      const api = createFindingApi(async () => session.access_token);
      await api.updateFindingStatus(
        currentOrg.id,
        finding.id,
        'resolved',
        'Marked fixed by user; awaiting technical verification re-test.',
      );
      setRetry(value => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update finding.');
    } finally {
      setActionBusy(null);
    }
  }

  async function requestRetest(finding: WorkspaceFindingSummary) {
    if (!session?.access_token || !currentOrg || !canMutate) return;
    setActionBusy(`retest:${finding.id}`);
    setError(null);
    try {
      const api = createFindingApi(async () => session.access_token);
      const submission = await api.requestFindingRetest(
        currentOrg.id,
        finding.id,
        createScanIdempotencyKey(),
      );
      navigate(`/app/scans/${submission.scan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start finding re-test.');
      setActionBusy(null);
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

              {finding.status === 'resolved' && finding.resolutionVerification === 'verified' && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" /> Verified resolved by GuardAI re-test
                    </div>
                    <div className="mt-1 text-xs text-emerald-300/70">
                      Verified {formatDate(finding.verifiedAt)}. A later rediscovery will reopen this finding.
                    </div>
                  </div>
                  {finding.verifiedByScanId && (
                    <button
                      onClick={() => navigate(`/app/scans/${finding.verifiedByScanId}`)}
                      className="rounded-lg border border-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/10"
                    >
                      View verification scan
                    </button>
                  )}
                </div>
              )}

              {finding.status === 'resolved' && finding.resolutionVerification !== 'verified' && (
                <div className="mt-4 text-xs text-amber-400/90">
                  Marked fixed by workflow, but not yet verified by a GuardAI re-test.
                </div>
              )}

              {canMutate && finding.status !== 'accepted_risk' && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                  {finding.status === 'open' && (
                    <button
                      type="button"
                      disabled={actionBusy !== null}
                      onClick={() => markFixedUnverified(finding)}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                    >
                      {actionBusy === `resolve:${finding.id}` ? 'Saving...' : 'Mark fixed (unverified)'}
                    </button>
                  )}
                  {finding.ruleId?.startsWith('security.') && finding.latestDetectorId && (
                    <button
                      type="button"
                      disabled={actionBusy !== null}
                      onClick={() => requestRetest(finding)}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {actionBusy === `retest:${finding.id}` ? 'Starting re-test...' : 'Re-test finding'}
                    </button>
                  )}
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
