import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, FileCheck2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { createEvidenceApi } from '../../api/evidenceApi';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { EvidenceExplorerItem } from '../../types/evidenceExplorer';

function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString();
}

export default function EvidencePage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();
  const navigate = useNavigate();

  const [evidence, setEvidence] = useState<EvidenceExplorerItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setEvidence([]);
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
        const api = createEvidenceApi(async () => session!.access_token);
        const page = await api.listEvidence(currentOrg!.id, { limit: 50 });
        if (cancelled) return;
        setEvidence(page.evidence);
        setNextCursor(page.nextCursor);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load evidence.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading, retry]);

  async function loadMore() {
    if (!session?.access_token || !currentOrg || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const api = createEvidenceApi(async () => session.access_token);
      const page = await api.listEvidence(currentOrg.id, { limit: 50, cursor: nextCursor });
      setEvidence(current => [...current, ...page.evidence]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more evidence.');
    } finally {
      setLoadingMore(false);
    }
  }

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading evidence...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-7 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Evidence</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Technical observations persisted by GuardAI detectors. Evidence records what was observed; it is not itself a legal compliance determination.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>{error}</span>
          <button onClick={() => setRetry(value => value + 1)} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-rose-500/10">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {evidence.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
          <FileCheck2 className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <h2 className="font-medium text-slate-200">No evidence collected yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Run a supported scan against a verified target. Missing evidence is not treated as a passing result.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {evidence.map(item => (
            <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">{item.type}</span>
                    <span className="font-mono text-xs text-slate-500">{item.detectorId}@{item.detectorVersion}</span>
                  </div>
                  <h2 className="mt-3 font-medium text-slate-100">{item.targetDisplayName}</h2>
                  <div className="mt-1 break-all text-sm text-slate-400">{item.source}</div>
                  <div className="mt-2 text-xs text-slate-500">Captured {formatDate(item.capturedAt)}</div>
                </div>
                <button
                  onClick={() => navigate(`/app/scans/${item.scanId}`)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Source scan <ExternalLink className="h-4 w-4" />
                </button>
              </div>

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
