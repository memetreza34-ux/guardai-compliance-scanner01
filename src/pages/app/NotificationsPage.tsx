import { useEffect, useState } from 'react';
import { Bell, CheckCheck, ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GuardApiError } from '../../api/apiClient';
import { createMonitoringApi } from '../../api/monitoringApi';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { WorkspaceNotification } from '../../types/monitoring';

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString();
}

export default function NotificationsPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();
  const navigate = useNavigate();
  const [items, setItems] = useState<WorkspaceNotification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [storageReady, setStorageReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setItems([]);
    setNextCursor(null);
    setError(null);
    setStorageReady(true);

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
        const page = await api.listNotifications(currentOrg!.id, { unreadOnly, limit: 50 });
        if (!cancelled) {
          setItems(page.notifications);
          setNextCursor(page.nextCursor);
        }
      } catch (loadError) {
        if (cancelled) return;
        if (
          loadError instanceof GuardApiError &&
          loadError.code === 'NOTIFICATION_STORAGE_NOT_READY'
        ) {
          setStorageReady(false);
        } else {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load notifications.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading, unreadOnly, retry]);

  async function loadMore() {
    if (!session?.access_token || !currentOrg || !nextCursor || busy) return;
    setBusy(true);
    try {
      const api = createMonitoringApi(async () => session.access_token);
      const page = await api.listNotifications(currentOrg.id, { unreadOnly, limit: 50, cursor: nextCursor });
      setItems((current) => [...current, ...page.notifications]);
      setNextCursor(page.nextCursor);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load more notifications.');
    } finally {
      setBusy(false);
    }
  }

  async function markRead(item: WorkspaceNotification) {
    if (!session?.access_token || !currentOrg || item.readAt) return;
    setBusy(true);
    try {
      const api = createMonitoringApi(async () => session.access_token);
      const updated = await api.markNotificationRead(currentOrg.id, item.id);
      setItems((current) =>
        unreadOnly
          ? current.filter((entry) => entry.id !== item.id)
          : current.map((entry) => entry.id === updated.id ? updated : entry),
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to mark notification read.');
    } finally {
      setBusy(false);
    }
  }

  async function markAll() {
    if (!session?.access_token || !currentOrg || busy) return;
    setBusy(true);
    try {
      const api = createMonitoringApi(async () => session.access_token);
      await api.markAllNotificationsRead(currentOrg.id);
      if (unreadOnly) {
        setItems([]);
      } else {
        const now = new Date().toISOString();
        setItems((current) => current.map((item) => item.readAt ? item : { ...item, readAt: now }));
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to mark notifications read.');
    } finally {
      setBusy(false);
    }
  }

  function openSource(item: WorkspaceNotification) {
    if (item.scanId) {
      navigate(`/app/scans/${item.scanId}`);
      return;
    }
    if (item.findingId) navigate('/app/findings');
  }

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading notifications...</div>;
  }

  const unreadCount = items.filter((item) => !item.readAt).length;

  return (
    <div className="mx-auto max-w-5xl space-y-7 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Notifications</h1>
          <p className="mt-1 text-sm text-slate-400">Tenant-scoped events currently cover new Findings and failed scans.</p>
        </div>
        {storageReady && items.length > 0 && (
          <button disabled={busy || unreadCount === 0} onClick={markAll} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {!storageReady && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-6">
          <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h2 className="font-semibold text-slate-100">Notification storage is not provisioned</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">GuardAI will not fabricate notification history when the tenant-safe database tables are unavailable.</p>
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
          <div className="flex gap-2">
            <button onClick={() => setUnreadOnly(false)} className={`rounded-lg border px-3 py-2 text-sm ${!unreadOnly ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' : 'border-slate-800 bg-slate-900 text-slate-400'}`}>All</button>
            <button onClick={() => setUnreadOnly(true)} className={`rounded-lg border px-3 py-2 text-sm ${unreadOnly ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' : 'border-slate-800 bg-slate-900 text-slate-400'}`}>Unread</button>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
              <Bell className="mx-auto h-8 w-8 text-slate-600" />
              <h2 className="mt-3 font-medium text-slate-200">{unreadOnly ? 'No unread notifications' : 'No notifications yet'}</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Notification absence does not mean that no risks or findings exist.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="divide-y divide-slate-800">
                {items.map((item) => (
                  <article key={item.id} className={`p-5 ${item.readAt ? 'opacity-65' : 'bg-indigo-500/[0.025]'}`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                            item.type === 'scan_failed'
                              ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                              : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                          }`}>{item.type === 'scan_failed' ? 'Scan failed' : 'New finding'}</span>
                          {!item.readAt && <span className="h-2 w-2 rounded-full bg-indigo-400" aria-label="Unread" />}
                        </div>
                        <h2 className="mt-3 font-medium text-slate-100">{item.title}</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{item.message}</p>
                        <div className="mt-2 text-xs text-slate-600">{formatDate(item.createdAt)}</div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {!item.readAt && (
                          <button disabled={busy} onClick={() => markRead(item)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50">Mark read</button>
                        )}
                        {(item.scanId || item.findingId) && (
                          <button onClick={() => openSource(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800">
                            Open source <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {nextCursor && (
            <div className="flex justify-center">
              <button disabled={busy} onClick={loadMore} className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50">
                {busy ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
