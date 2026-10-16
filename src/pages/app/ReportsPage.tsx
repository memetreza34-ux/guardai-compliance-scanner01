import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { createReportApi } from '../../api/reportApi';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { TechnicalReportRecord } from '../../types/report';
import { isCurrentReportScope, reportListScope, reportsBelongToOrganization } from '../../lib/reportViewScope';

function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString();
}

export default function ReportsPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading, error: orgError } = useWorkspace();
  const navigate = useNavigate();
  const [reports, setReports] = useState<TechnicalReportRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [failedScope, setFailedScope] = useState<string | null>(null);
  const scopeKey = reportListScope(session?.user.id, currentOrg?.id);
  const activeContext = useRef({ scopeKey, token: session?.access_token ?? null });
  activeContext.current = { scopeKey, token: session?.access_token ?? null };

  useEffect(() => {
    let cancelled = false;
    setReports([]);
    setNextCursor(null);
    setLoadedScope(null);
    setFailedScope(null);
    setLoadingMore(false);
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
        const api = createReportApi(async () => session!.access_token);
        const page = await api.listReports(currentOrg!.id, { limit: 50 });
        if (!reportsBelongToOrganization(page.reports, currentOrg!.id)) {
          throw new Error('Die Bericht-Antwort enthält Daten eines anderen Workspaces.');
        }
        if (!cancelled) {
          setReports(page.reports);
          setNextCursor(page.nextCursor);
          setLoadedScope(scopeKey);
        }
      } catch (err) {
        if (!cancelled) {
          setFailedScope(scopeKey);
          setError(err instanceof Error ? err.message : 'Berichte konnten nicht geladen werden.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading, retry, scopeKey]);

  async function loadMore() {
    if (!session?.access_token || !currentOrg || !nextCursor || loadingMore
      || !isCurrentReportScope(scopeKey, loadedScope)) return;
    const issuedToken = session.access_token;
    const issuedScope = scopeKey;
    const issuedOrgId = currentOrg.id;
    setLoadingMore(true);
    setError(null);
    try {
      const api = createReportApi(async () => issuedToken);
      const page = await api.listReports(issuedOrgId, { limit: 50, cursor: nextCursor });
      if (!reportsBelongToOrganization(page.reports, issuedOrgId)) {
        throw new Error('Die zusätzliche Berichtsseite enthält Daten eines anderen Workspaces.');
      }
      if (activeContext.current.scopeKey !== issuedScope || activeContext.current.token !== issuedToken) return;
      setReports(current => [...current, ...page.reports]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      if (activeContext.current.scopeKey === issuedScope && activeContext.current.token === issuedToken) {
        setError(err instanceof Error ? err.message : 'Weitere Berichte konnten nicht geladen werden.');
      }
    } finally {
      if (activeContext.current.scopeKey === issuedScope && activeContext.current.token === issuedToken) setLoadingMore(false);
    }
  }

  const hasCurrentData = isCurrentReportScope(scopeKey, loadedScope);
  const initialFailed = !!scopeKey && !hasCurrentData && failedScope === scopeKey;

  if (orgLoading || loading || (scopeKey && !hasCurrentData && !initialFailed)) {
    return <div role="status" className="flex items-center justify-center p-12 text-slate-400">Berichte werden geladen…</div>;
  }
  if (orgError || initialFailed) {
    return <div role="alert" className="mx-auto max-w-3xl rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">
      <p>Berichte konnten für diesen Workspace nicht überprüft werden: {orgError || error || 'Unbekannter Ladefehler.'}</p>
      <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-4 rounded-lg border border-rose-500/30 px-3 py-2">Erneut versuchen</button>
    </div>;
  }
  if (!currentOrg) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-7 animate-in fade-in duration-500">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Assure</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">Reports</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Immutable technical screening snapshots. A report freezes the target, scan, scoring, evidence and finding provenance that existed when it was created.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-500">
        Reports are created from completed scans. Open a completed Scan and choose <span className="font-medium text-slate-300">Create immutable report</span>.
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>{error}</span>
          <button onClick={() => setRetry(value => value + 1)} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-rose-500/10">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-600" />
          <h2 className="mt-4 font-medium text-slate-200">No report snapshots yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
            Complete a supported scan first, then freeze it into an immutable technical report snapshot.
          </p>
          <button
            onClick={() => navigate('/app/scans')}
            className="mt-5 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Open scans
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <button
              key={report.id}
              onClick={() => navigate(`/app/reports/${report.id}`)}
              className="grid w-full gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition-colors hover:bg-slate-800/40 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-300" />
                  <span className="truncate font-medium text-slate-100">{report.snapshot.target.displayName}</span>
                </div>
                <div className="mt-2 truncate font-mono text-xs text-slate-600">{report.id}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-600">Snapshot</div>
                <div className="mt-1 text-sm text-slate-300">Schema v{report.schemaVersion}</div>
                <div className="mt-1 text-xs text-slate-500">{formatDate(report.createdAt)}</div>
              </div>
              <div className="md:text-right">
                <div className="text-xs uppercase tracking-wider text-slate-600">Hash</div>
                <div className="mt-1 font-mono text-xs text-slate-400">{report.snapshotHash.slice(0, 12)}…</div>
                <div className="mt-1 text-xs text-slate-600">{report.snapshot.findings.length} findings · {report.snapshot.evidence.length} evidence</div>
              </div>
            </button>
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
