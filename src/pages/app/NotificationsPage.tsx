import { useEffect, useState } from 'react';
import { Bell, CheckCheck, ExternalLink, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { GuardApiError } from '../../api/apiClient';
import { createMonitoringApi } from '../../api/monitoringApi';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { WorkspaceNotification } from '../../types/monitoring';

function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString();
}

function readableError(error: unknown) {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'Notification action failed.';
}

function severityClass(severity: WorkspaceNotification['severity']) {
  if (severity === 'critical') return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
  if (severity === 'warning') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  if (severity === 'info') return 'border-sky-500/20 bg-sky-500/10 text-sky-300';
  return 'border-slate-700 bg-slate-800 text-slate-400';
}

export default function NotificationsPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setNotifications([]);
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
        const page = await createMonitoringApi(async () => session!.access_token)
          .listNotifications(currentOrg!.id, { unreadOnly, limit: 30 });
        if (cancelled) return;
        setNotifications(page.notifications);
        setNextCursor(page.nextCursor);
      } catch (err) {
        if (!cancelled) setError(readableError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading, unreadOnly, retry]);

  async function loadMore() {
    if (!session?.access_token || !currentOrg || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await createMonitoringApi(async () => session.access_token)
        .listNotifications(currentOrg.id, { unreadOnly, limit: 30, cursor: nextCursor });
      setNotifications((current) => [...current, ...page.notifications]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoadingMore(false);
    }
  }

  async function markRead(notification: WorkspaceNotification) {
    if (!session?.access_token || !currentOrg || notification.readAt) return;
    setBusyId(notification.id);
    setError(null);
    try {
      const updated = await createMonitoringApi(async () => session.access_token)
        .markNotificationRead(currentOrg.id, notification.id);
      if (unreadOnly) {
        setNotifications((current) => current.filter((item) => item.id !== notification.id));
      } else {
        setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item));
      }
    } catch (err) {
      setError(readableError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    if (!session?.access_token || !currentOrg) return;
    setBusyId('all');
    setError(null);
    try {
      await createMonitoringApi(async () => session.access_token).markAllNotificationsRead(currentOrg.id);
      setRetry((value) => value + 1);
    } catch (err) {
      setError(readableError(err));
    } finally {
      setBusyId(null);
    }
  }

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading notifications...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">Overview</div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100">Notifications</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
            Tenant-private in-app events for newly persisted technical findings and failed scans. Email or push delivery is not implied.
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={busyId !== null || notifications.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" /> Mark all read
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setUnreadOnly(false)}
          className={`rounded-lg border px-3 py-2 text-sm ${
            !unreadOnly ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' : 'border-slate-800 bg-slate-900 text-slate-400'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setUnreadOnly(true)}
          className={`rounded-lg border px-3 py-2 text-sm ${
            unreadOnly ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' : 'border-slate-800 bg-slate-900 text-slate-400'
          }`}
        >
          Unread
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>{error}</span>
          <button onClick={() => setRetry((value) => value + 1)} className="inline-flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center">
          <Bell className="mx-auto h-7 w-7 text-slate-600" />
          <div className="mt-3 text-sm text-slate-500">{unreadOnly ? 'No unread notifications.' : 'No notifications have been persisted.'}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`rounded-2xl border p-5 ${
                notification.readAt
                  ? 'border-slate-800 bg-slate-900/70'
                  : 'border-indigo-500/20 bg-indigo-500/[0.05]'
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] uppercase tracking-wider text-slate-500">
                      {notification.type === 'new_finding' ? 'New finding' : 'Scan failed'}
                    </span>
                    {notification.severity && (
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${severityClass(notification.severity)}`}>
                        {notification.severity}
                      </span>
                    )}
                    {!notification.readAt && (
                      <span className="rounded-full bg-indigo-500/15 px-2 py-1 text-[10px] font-medium text-indigo-300">NEW</span>
                    )}
                  </div>
                  <h2 className="mt-3 font-semibold text-slate-100">{notification.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{notification.message}</p>
                  <div className="mt-3 text-xs text-slate-600">{formatDate(notification.createdAt)}</div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {notification.scanId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/app/scans/${notification.scanId}`)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      Source scan <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {notification.findingId && (
                    <button
                      type="button"
                      onClick={() => navigate('/app/findings')}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      Findings
                    </button>
                  )}
                  {!notification.readAt && (
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => markRead(notification)}
                      className="rounded-lg border border-indigo-500/20 px-3 py-2 text-xs text-indigo-300 hover:bg-indigo-500/10 disabled:opacity-50"
                    >
                      {busyId === notification.id ? 'Saving...' : 'Mark read'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={loadMore}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
