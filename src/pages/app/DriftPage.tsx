import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, GitCompareArrows, RefreshCw, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GuardApiError } from '../../api/apiClient';
import { createMonitoringApi } from '../../api/monitoringApi';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { WorkspaceDriftEvent } from '../../types/monitoring';

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString();
}

function typeLabel(type: WorkspaceDriftEvent['type']) {
  return type === 'finding_reappeared' ? 'Reappeared' : 'Introduced';
}

export default function DriftPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();
  const navigate = useNavigate();
  const [events, setEvents] = useState<WorkspaceDriftEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [storageReady, setStorageReady] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setEvents([]);
    setNextCursor(null);
    setStorageReady(true);
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
        const api = createMonitoringApi(async () => session!.access_token);
        const page = await api.listDriftEvents(currentOrg!.id, { limit: 50 });
        if (!cancelled) {
          setEvents(page.events);
          setNextCursor(page.nextCursor);
        }
      } catch (loadError) {
        if (cancelled) return;
        if (loadError instanceof GuardApiError && loadError.code === 'DRIFT_STORAGE_NOT_READY') {
          setStorageReady(false);
        } else {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load Drift events.');
        }
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
    try {
      const api = createMonitoringApi(async () => session.access_token);
      const page = await api.listDriftEvents(currentOrg.id, { limit: 50, cursor: nextCursor });
      setEvents((current) => [...current, ...page.events]);
      setNextCursor(page.nextCursor);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load more Drift events.');
    } finally {
      setLoadingMore(false);
    }
  }

  const counts = useMemo(() => ({
    introduced: events.filter((event) => event.type === 'finding_introduced').length,
    reappeared: events.filter((event) => event.type === 'finding_reappeared').length,
  }), [events]);

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading Drift...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Drift</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
          Canonical monitored changes backed by Finding status provenance and scheduled Monitor runs. The first run of each Monitor is treated as baseline, not Drift.
        </p>
      </div>

      <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/[0.05] p-4 text-xs leading-5 text-slate-400">
        GuardAI currently records only <strong className="text-slate-300">Introduced</strong> and <strong className="text-slate-300">Reappeared</strong> monitored Findings. It does not claim “Cleared” until ordinary Monitoring can authoritatively verify that the same detector ran successfully and the prior Finding is absent.
      </div>

      {!storageReady && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-6">
          <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h2 className="font-semibold text-slate-100">Drift provenance is not provisioned</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                This environment is missing one or more Finding/Monitoring provenance tables. GuardAI does not synthesize Drift in browser state.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>{error}</span>
          <button onClick={() => setRetry((value) => value + 1)} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-rose-500/10">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {storageReady && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs uppercase tracking-wider text-slate-500">Introduced loaded</div>
              <div className="mt-2 text-2xl font-semibold text-slate-100">{counts.introduced}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs uppercase tracking-wider text-slate-500">Reappeared loaded</div>
              <div className="mt-2 text-2xl font-semibold text-slate-100">{counts.reappeared}</div>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
              <GitCompareArrows className="mx-auto h-8 w-8 text-slate-600" />
              <h2 className="mt-3 font-medium text-slate-200">No canonical Drift events yet</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                A Monitor needs a baseline run before later scanner-originated changes can qualify as Drift.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <article key={event.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                          event.type === 'finding_reappeared'
                            ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                            : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                        }`}>{typeLabel(event.type)}</span>
                        {event.severity && (
                          <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-400">{event.severity}</span>
                        )}
                        {event.ruleId && <span className="font-mono text-xs text-slate-600">{event.ruleId}{event.ruleVersion ? `@${event.ruleVersion}` : ''}</span>}
                      </div>
                      <h2 className="mt-3 font-semibold text-slate-100">{event.ruleTitle || event.message || 'Monitored Finding change'}</h2>
                      {event.message && event.ruleTitle && <p className="mt-2 text-sm leading-6 text-slate-400">{event.message}</p>}
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                        <span>Target: {event.targetDisplayName}</span>
                        <span>Scheduled: {formatDate(event.scheduledFor)}</span>
                        <span>Detected: {formatDate(event.detectedAt)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/app/scans/${event.scanId}`)}
                      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                    >
                      Source scan <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {nextCursor && (
            <div className="flex justify-center">
              <button disabled={loadingMore} onClick={loadMore} className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50">
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
