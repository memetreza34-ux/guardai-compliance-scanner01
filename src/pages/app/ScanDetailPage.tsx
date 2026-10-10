import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock3, FileCheck2, FileText, RefreshCw, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { createWorkspaceApi } from '../../api/workspaceApi';
import { createReportApi } from '../../api/reportApi';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type {
  PersistentFindingSeverity,
  PersistentScanResult,
  PersistentScanStatus,
} from '../../types/workspace';

function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString();
}

function scanStatusLabel(status: PersistentScanStatus) {
  if (status === 'completed') return 'Completed';
  if (status === 'failed') return 'Failed';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'running') return 'Running';
  return 'Queued';
}

function severityClass(severity: PersistentFindingSeverity) {
  if (severity === 'critical') return 'border-rose-500/20 bg-rose-500/10 text-rose-400';
  if (severity === 'warning') return 'border-amber-500/20 bg-amber-500/10 text-amber-400';
  return 'border-sky-500/20 bg-sky-500/10 text-sky-400';
}

export default function ScanDetailPage() {
  const { scanId } = useParams();
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading, error: orgError } = useWorkspace();
  const navigate = useNavigate();

  const [result, setResult] = useState<PersistentScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualRefresh, setManualRefresh] = useState(0);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [resultScope, setResultScope] = useState<string | null>(null);
  const [failedScope, setFailedScope] = useState<string | null>(null);
  const scopeKey = session?.user.id && currentOrg?.id && scanId
    ? `${session.user.id}:${currentOrg.id}:${scanId}`
    : null;
  const mutationEpoch = useRef(0);

  // A completed report request may only redirect within its original scan scope.
  useLayoutEffect(() => {
    mutationEpoch.current += 1;
    setReportBusy(false);
    setReportError(null);
    return () => { mutationEpoch.current += 1; };
  }, [session, currentOrg, scanId, orgLoading]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    setResult(null);
    setResultScope(null);
    setFailedScope(null);
    setError(null);

    if (orgLoading) {
      setLoading(true);
      return;
    }

    if (!session?.access_token || !currentOrg || !scanId) {
      setLoading(false);
      return;
    }

    async function load(isPoll = false) {
      if (isPoll) setRefreshing(true);
      else setLoading(true);

      try {
        const api = createWorkspaceApi(async () => session!.access_token);
        const next = await api.getScanStatus(currentOrg!.id, scanId!);
        if (cancelled) return;

        setResult(next);
        setResultScope(scopeKey);
        setFailedScope(null);
        setError(null);

        if (next.scan.status === 'queued' || next.scan.status === 'running') {
          timer = window.setTimeout(() => void load(true), 3000);
        }
      } catch (err) {
        if (!cancelled) {
          setFailedScope(scopeKey);
          setError(err instanceof Error ? err.message : 'Failed to load scan.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void load(false);

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [session, currentOrg, scanId, orgLoading, manualRefresh, scopeKey]);

  const hasCurrentData = !!scopeKey && resultScope === scopeKey;
  const initialFailed = !!scopeKey && failedScope === scopeKey && !hasCurrentData;

  if (orgLoading || loading || (scopeKey && !hasCurrentData && !initialFailed)) {
    return <div role="status" className="flex items-center justify-center p-12 text-slate-400">Loading scan...</div>;
  }

  if (orgError) {
    return <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-300">Workspace access could not be verified: {orgError}</div>;
  }

  if (!scopeKey) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
        Select a workspace and scan to view technical results.
        <button type="button" onClick={() => navigate('/app/scans')} className="ml-3 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800">Back to scans</button>
      </div>
    );
  }

  if (!result || !hasCurrentData) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <button onClick={() => navigate('/app/scans')} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Back to scans
        </button>
        <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-rose-300">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5" />
            <div>
              <h1 className="font-semibold">Scan unavailable</h1>
              <p className="mt-1 text-sm">{error || 'The scan could not be loaded in this workspace.'}</p>
              <button type="button" onClick={() => setManualRefresh(value => value + 1)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-500/30 px-3 py-2 text-sm hover:bg-rose-500/10">
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { scan, jobs, evidence, findings } = result;
  const active = scan.status === 'queued' || scan.status === 'running';
  const canCreateReport = currentOrg?.role === 'owner' || currentOrg?.role === 'admin' || currentOrg?.role === 'member';

  async function createImmutableReport() {
    if (!session?.access_token || !currentOrg || scan.status !== 'completed' || !canCreateReport || reportBusy || !hasCurrentData) return;
    const epoch = mutationEpoch.current;
    const orgId = currentOrg.id;
    const scanIdForReport = scan.id;
    setReportBusy(true);
    setReportError(null);
    try {
      const api = createReportApi(async () => session.access_token);
      const created = await api.createReport(orgId, scanIdForReport);
      if (mutationEpoch.current === epoch) navigate(`/app/reports/${created.report.id}`);
    } catch (err) {
      if (mutationEpoch.current === epoch) {
        setReportError(err instanceof Error ? err.message : 'Failed to create report snapshot.');
      }
    } finally {
      if (mutationEpoch.current === epoch) setReportBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-7 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate('/app/scans')} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Back to scans
        </button>
        <div className="flex flex-wrap gap-2">
          {scan.status === 'completed' && canCreateReport && (
            <button
              onClick={createImmutableReport}
              disabled={reportBusy}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/15 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {reportBusy ? 'Creating report…' : 'Create immutable report'}
            </button>
          )}
          <button
            onClick={() => setManualRefresh(value => value + 1)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
          GuardAI could not refresh the latest scan state: {error}. The data shown below is the last successfully loaded state and may be stale.
        </div>
      )}

      {reportError && (
        <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          {reportError}
        </div>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Technical scan</div>
            <h1 className="mt-2 break-words text-2xl font-semibold text-slate-100">
              {scan.targetSnapshot?.displayName || scan.targetSnapshot?.canonicalUrl || scan.targetId}
            </h1>
            <p className="mt-2 break-all font-mono text-xs text-slate-500">{scan.id}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-300">
            {active ? <Clock3 className="h-4 w-4 text-amber-400" /> : scan.status === 'completed' ? <ShieldCheck className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}
            {scanStatusLabel(scan.status)}
          </div>
        </div>

        <div className="mt-7 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><div className="text-slate-500">Requested modules</div><div className="mt-1 text-slate-200">{scan.requestedModules.join(', ')}</div></div>
          <div><div className="text-slate-500">Scanner version</div><div className="mt-1 text-slate-200">{scan.scannerVersion}</div></div>
          <div><div className="text-slate-500">Created</div><div className="mt-1 text-slate-200">{formatDate(scan.createdAt)}</div></div>
          <div><div className="text-slate-500">Completed</div><div className="mt-1 text-slate-200">{formatDate(scan.completedAt)}</div></div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-500">
          A completed scan means GuardAI executed the requested automated checks and persisted their result. It is not a penetration test, certification, legal determination, or proof that no vulnerabilities exist.
        </div>

        {(scan.errorCode || scan.errorMessage) && (
          <div role="alert" className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
            <div className="font-medium">{scan.errorCode || 'SCAN_FAILED'}</div>
            {scan.errorMessage && <div className="mt-1">{scan.errorMessage}</div>}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Execution jobs</h2>
          <p className="text-sm text-slate-500">Actual worker executions for this scan.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {jobs.map(job => (
            <div key={job.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium capitalize text-slate-200">{job.jobType}</div>
                <span className="text-xs uppercase tracking-wider text-slate-500">{job.status}</span>
              </div>
              <div className="mt-3 text-xs text-slate-500">Attempts {job.attemptCount} / {job.maxAttempts}</div>
              {job.errorCode && <div className="mt-3 text-sm text-rose-400">{job.errorCode}: {job.errorMessage || 'Worker failed.'}</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Evidence</h2>
            <p className="text-sm text-slate-500">Persisted technical observations with detector provenance.</p>
          </div>
          <span className="text-sm text-slate-500">{evidence.length} item{evidence.length === 1 ? '' : 's'}</span>
        </div>
        {evidence.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-500">
            {active ? 'Evidence has not been persisted yet.' : 'No evidence was persisted for this scan.'}
          </div>
        ) : (
          <div className="grid gap-3">
            {evidence.map(item => (
              <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-medium text-slate-200"><FileCheck2 className="h-4 w-4 text-indigo-400" /> {item.type}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.detectorId} · v{item.detectorVersion}</div>
                  </div>
                  <div className="text-xs text-slate-500">{formatDate(item.capturedAt)}</div>
                </div>
                <div className="mt-4 break-all text-sm text-slate-400">{item.source}</div>
                {item.contentHash && <div className="mt-2 break-all font-mono text-[11px] text-slate-600">hash {item.contentHash}</div>}
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-medium text-slate-400">Normalized observation</summary>
                  <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">{JSON.stringify(item.normalizedData, null, 2)}</pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Findings</h2>
            <p className="text-sm text-slate-500">Issues derived from the evidence produced by this scan.</p>
          </div>
          <span className="text-sm text-slate-500">{findings.length} finding{findings.length === 1 ? '' : 's'}</span>
        </div>
        {findings.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-500">
            {active
              ? 'Findings will appear after the requested checks are evaluated.'
              : 'No findings were produced by the requested automated checks. This does not prove that no vulnerabilities or compliance issues exist.'}
          </div>
        ) : (
          <div className="space-y-3">
            {findings.map(finding => (
              <article key={finding.findingId} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${severityClass(finding.severity)}`}>{finding.severity}</span>
                  <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-400">{finding.status}</span>
                  {finding.ruleId && <span className="font-mono text-xs text-slate-500">{finding.ruleId}{finding.ruleVersion ? `@${finding.ruleVersion}` : ''}</span>}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-200">{finding.message}</p>
                {finding.remediation && (
                  <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recommended remediation</div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{finding.remediation}</p>
                  </div>
                )}
                <div className="mt-3 text-xs text-slate-600">{finding.evidenceIds.length} linked evidence item{finding.evidenceIds.length === 1 ? '' : 's'}</div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
