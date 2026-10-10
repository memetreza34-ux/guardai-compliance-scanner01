import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, ExternalLink, FileCheck2, RefreshCw, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { createEvidenceApi } from '../../api/evidenceApi';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { EvidenceExplorerItem } from '../../types/evidenceExplorer';

function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString();
}

function evidenceAge(value: string) {
  const captured = new Date(value);
  if (Number.isNaN(captured.getTime())) return 'Age unavailable';
  const diffMs = Math.max(0, Date.now() - captured.getTime());
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'Less than 1 hour old';
  if (hours < 48) return `${hours} hours old`;
  return `${Math.floor(hours / 24)} days old`;
}

function freshnessBadge(item: EvidenceExplorerItem) {
  if (item.freshnessState === 'superseded') {
    return <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-400">Superseded</span>;
  }
  return <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">Current</span>;
}

function collectionBadge(item: EvidenceExplorerItem) {
  if (item.collectionHealth === 'healthy') {
    return <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300">Collection healthy</span>;
  }
  if (item.collectionHealth === 'pending') {
    return <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">Collection pending</span>;
  }
  if (item.collectionHealth === 'collection_error') {
    return <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300">Collection error</span>;
  }
  if (item.collectionHealth === 'cancelled') {
    return <span className="rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-400">Collection cancelled</span>;
  }
  return <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-500">Collection unknown</span>;
}

export default function EvidencePage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading, error: orgError } = useWorkspace();
  const navigate = useNavigate();

  const [evidence, setEvidence] = useState<EvidenceExplorerItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  // A list and its pagination cursor are only valid for the identity that fetched them.
  const scopeKey = session?.user.id && currentOrg?.id
    ? `${session.user.id}:${currentOrg.id}`
    : null;
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [failedScope, setFailedScope] = useState<string | null>(null);
  const requestEpoch = useRef(0);

  // Invalidate in-flight pagination before a different workspace can render.
  useLayoutEffect(() => {
    requestEpoch.current += 1;
    setLoadingMore(false);
  }, [scopeKey, retry]);

  useEffect(() => {
    let cancelled = false;
    setEvidence([]);
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
      try {
        const api = createEvidenceApi(async () => session!.access_token);
        const page = await api.listEvidence(currentOrg!.id, { limit: 50 });
        if (cancelled) return;
        setEvidence(page.evidence);
        setNextCursor(page.nextCursor);
        setLoadedScope(scopeKey);
      } catch (err) {
        if (!cancelled) {
          setFailedScope(scopeKey);
          setError(err instanceof Error ? err.message : 'Failed to load evidence.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading, retry, scopeKey]);

  async function loadMore() {
    if (!session?.access_token || !currentOrg || !nextCursor || loadingMore || loadedScope !== scopeKey) return;
    const epoch = requestEpoch.current;
    const organizationId = currentOrg.id;
    const cursor = nextCursor;
    setLoadingMore(true);
    setError(null);
    try {
      const api = createEvidenceApi(async () => session.access_token);
      const page = await api.listEvidence(organizationId, { limit: 50, cursor });
      if (requestEpoch.current !== epoch) return;
      setEvidence(current => [...current, ...page.evidence]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      if (requestEpoch.current === epoch) {
        setError(err instanceof Error ? err.message : 'Failed to load more evidence.');
      }
    } finally {
      if (requestEpoch.current === epoch) setLoadingMore(false);
    }
  }

  const visibleEvidence = useMemo(
    () => showHistory ? evidence : evidence.filter(item => item.freshnessState === 'current'),
    [evidence, showHistory],
  );
  const currentCount = evidence.filter(item => item.freshnessState === 'current').length;
  const supersededCount = evidence.filter(item => item.freshnessState === 'superseded').length;
  const unhealthyCount = evidence.filter(item => item.collectionHealth !== 'healthy').length;

  const isCurrent = !!scopeKey && loadedScope === scopeKey;
  const initialFailed = !!scopeKey && failedScope === scopeKey && !isCurrent;

  if (orgLoading || loading || (scopeKey && !isCurrent && !initialFailed)) {
    return <div role="status" className="flex items-center justify-center p-12 text-slate-400">Loading evidence...</div>;
  }

  if (orgError) {
    return <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-300">Workspace access could not be verified: {orgError}</div>;
  }

  if (!scopeKey) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
        Select or create a workspace before browsing evidence.
        <button type="button" onClick={() => navigate('/app')} className="ml-3 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800">Go to dashboard</button>
      </div>
    );
  }

  if (initialFailed) {
    return (
      <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-300">
        <p className="font-medium">Evidence could not be loaded for this workspace.</p>
        <p className="mt-2">{error || 'The Evidence API did not return a usable result.'}</p>
        <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-500/30 px-3 py-2 hover:bg-rose-500/10">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-7 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Evidence</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Technical observations persisted by GuardAI detectors. Current means newest known Evidence for the same Target and Detector — not legally valid, secure, or compliant.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Current loaded</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{currentCount}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Superseded loaded</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{supersededCount}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Non-healthy collection loaded</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{unhealthyCount}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/[0.05] px-4 py-3 text-xs leading-5 text-slate-400">
          Evidence age is shown separately. GuardAI does not apply an arbitrary universal expiry period to all technical Evidence.
        </div>
        <button
          type="button"
          onClick={() => setShowHistory(value => !value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          {showHistory ? 'Hide superseded history' : 'Show superseded history'}
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>{error}</span>
          <button onClick={() => setRetry(value => value + 1)} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-rose-500/10">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {visibleEvidence.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
          <FileCheck2 className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <h2 className="font-medium text-slate-200">No evidence in this view</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
            Run a supported scan against a verified target. Missing Evidence is not treated as a passing result.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleEvidence.map(item => (
            <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">{item.type}</span>
                    {freshnessBadge(item)}
                    {collectionBadge(item)}
                    <span className="font-mono text-xs text-slate-500">{item.detectorId}@{item.detectorVersion}</span>
                  </div>
                  <h2 className="mt-3 font-medium text-slate-100">{item.targetDisplayName}</h2>
                  <div className="mt-1 break-all text-sm text-slate-400">{item.source}</div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {evidenceAge(item.capturedAt)}</span>
                    <span>Captured {formatDate(item.capturedAt)}</span>
                    <span>Source scan: {item.sourceScanStatus}</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/app/scans/${item.scanId}`)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Source scan <ExternalLink className="h-4 w-4" />
                </button>
              </div>

              {item.collectionHealth !== 'healthy' && (
                <div className="mt-4 flex gap-2 rounded-xl border border-amber-500/15 bg-amber-500/[0.05] p-3 text-xs leading-5 text-amber-200/80">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  This Evidence came from a scan whose collection state is not healthy. GuardAI does not convert collection uncertainty into a pass.
                </div>
              )}

              {item.contentHash && (
                <div className="mt-4 break-all rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[11px] text-slate-600">
                  content hash: {item.contentHash}
                </div>
              )}

              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-medium text-slate-400">Normalized observation</summary>
                <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">{JSON.stringify(item.normalizedData, null, 2)}</pre>
              </details>
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
