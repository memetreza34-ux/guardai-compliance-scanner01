import { useWorkspace } from '../providers/WorkspaceProvider';
import { useEffect, useMemo, useState } from 'react';
import { GuardApiError } from '../api/apiClient';
import type { MonitoringApi } from '../api/monitoringApi';
import type { WorkspaceApi } from '../api/workspaceApi';
import type { WorkspaceMonitor, WorkspaceNotification } from '../types/monitoring';
import type { WorkspaceOrganization, WorkspaceTarget } from '../types/workspace';

interface MonitoringCenterProps {
  monitoringApi: MonitoringApi;
  workspaceApi: WorkspaceApi;
}

function canManage(role?: WorkspaceOrganization['role']): boolean {
  return role === 'owner' || role === 'admin';
}

function readableError(error: unknown): string {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'Monitoring-Aktion fehlgeschlagen.';
}

export default function MonitoringCenter({ monitoringApi, workspaceApi }: MonitoringCenterProps) {
  const { currentOrg: selectedOrganization } = useWorkspace();
  const organizationId = selectedOrganization?.id || '';
  const [targets, setTargets] = useState<WorkspaceTarget[]>([]);
  const [monitors, setMonitors] = useState<WorkspaceMonitor[]>([]);
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const [targetId, setTargetId] = useState('');
  const [scheduleMinutes, setScheduleMinutes] = useState(1440);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifiedWebsiteTargets = useMemo(
    () => targets.filter(
      (target) => target.type === 'website' && target.verificationState === 'verified',
    ),
    [targets],
  );

  useEffect(() => {
    let cancelled = false;
    setTargetId('');
    if (!organizationId) {
      setTargets([]);
      setMonitors([]);
      setNotifications([]);
      return undefined;
    }

    Promise.all([
      workspaceApi.listTargets(organizationId),
      monitoringApi.listMonitors(organizationId),
      monitoringApi.listNotifications(organizationId, { unreadOnly: false, limit: 30 }),
    ])
      .then(([nextTargets, nextMonitors, nextNotifications]) => {
        if (cancelled) return;
        setTargets(nextTargets);
        setMonitors(nextMonitors);
        setNotifications(nextNotifications.notifications);
      })
      .catch((loadError) => {
        if (!cancelled) setError(readableError(loadError));
      });

    return () => {
      cancelled = true;
    };
  }, [monitoringApi, organizationId, workspaceApi]);

  async function refresh() {
    if (!organizationId) return;
    const [nextMonitors, nextNotifications] = await Promise.all([
      monitoringApi.listMonitors(organizationId),
      monitoringApi.listNotifications(organizationId, { unreadOnly: false, limit: 30 }),
    ]);
    setMonitors(nextMonitors);
    setNotifications(nextNotifications.notifications);
  }

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(readableError(actionError));
    } finally {
      setBusy(false);
    }
  }

  async function createMonitor() {
    if (!organizationId || !targetId) return;
    await runAction(async () => {
      await monitoringApi.createMonitor(organizationId, { targetId, scheduleMinutes });
      setTargetId('');
      await refresh();
    });
  }

  async function changeStatus(monitor: WorkspaceMonitor, status: WorkspaceMonitor['status']) {
    await runAction(async () => {
      await monitoringApi.setMonitorStatus(organizationId, monitor.id, status);
      await refresh();
    });
  }

  async function markRead(notification: WorkspaceNotification) {
    await runAction(async () => {
      await monitoringApi.markNotificationRead(organizationId, notification.id);
      await refresh();
    });
  }

  async function markAllRead() {
    await runAction(async () => {
      await monitoringApi.markAllNotificationsRead(organizationId);
      await refresh();
    });
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Monitoring & In-App Notifications
        </div>
        <h2 className="text-2xl font-semibold">Persistentes Security-Monitoring</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Monitoring erzeugt zu den geplanten Zeitpunkten echte persistente Security-Scans für verifizierte Website-Targets. Aktuell werden nur In-App-Hinweise gespeichert; E-Mail, Push oder andere Zustellkanäle werden nicht behauptet.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      )}

      {selectedOrganization && canManage(selectedOrganization.role) && (
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <div>
            <h3 className="font-semibold">Security-Monitor anlegen</h3>
            <p className="text-sm text-muted-foreground">
              Nur verifizierte Website-Targets. Minimaler Rhythmus: 60 Minuten.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <select
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              disabled={busy}
            >
              <option value="">Verifiziertes Target auswählen…</option>
              {verifiedWebsiteTargets.map((target) => (
                <option key={target.id} value={target.id}>{target.displayName}</option>
              ))}
            </select>
            <input
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              type="number"
              min={60}
              max={10080}
              step={1}
              value={scheduleMinutes}
              onChange={(e) => setScheduleMinutes(Number(e.target.value))}
              aria-label="Monitoring-Intervall in Minuten"
              disabled={busy}
            />
            <button
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              type="button"
              disabled={busy || !targetId}
              onClick={createMonitor}
            >
              Monitor anlegen
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-2xl border bg-card p-5">
        <h3 className="font-semibold">Aktive Monitoring-Konfiguration</h3>
        {monitors.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch kein Security-Monitor vorhanden.</p>
        ) : monitors.map((monitor) => {
          const target = targets.find((item) => item.id === monitor.targetId);
          return (
            <article key={monitor.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm">
              <div>
                <div className="font-medium">{target?.displayName ?? monitor.targetId}</div>
                <div className="text-muted-foreground">
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border px-2.5 py-1 text-xs">{monitor.status}</span>
                {canManage(selectedOrganization?.role) && monitor.status === 'active' && (
                  <button className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50" onClick={() => changeStatus(monitor, 'paused')} disabled={busy}>
                    Pausieren
                  </button>
                )}
                {canManage(selectedOrganization?.role) && monitor.status === 'paused' && (
                  <button className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50" onClick={() => changeStatus(monitor, 'active')} disabled={busy}>
                    Fortsetzen
                  </button>
                )}
                {canManage(selectedOrganization?.role) && monitor.status !== 'disabled' && (
                  <button className="rounded-lg border px-3 py-1.5 text-xs text-destructive disabled:opacity-50" onClick={() => changeStatus(monitor, 'disabled')} disabled={busy}>
                    Deaktivieren
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="space-y-4 rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">In-App-Hinweise</h3>
            <p className="text-sm text-muted-foreground">Deduplizierte neue Findings und Scan-Fehler.</p>
          </div>
          <button className="rounded-lg border px-3 py-1.5 text-xs" type="button" disabled={busy} onClick={markAllRead}>
            Alle als gelesen markieren
          </button>
        </div>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Hinweise vorhanden.</p>
        ) : notifications.map((notification) => (
          <article key={notification.id} className="space-y-2 rounded-xl border p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-medium">{notification.title}</div>
                <div className="text-xs text-muted-foreground">
                </div>
              </div>
              <span className="rounded-full border px-2.5 py-1 text-xs">
                {notification.readAt ? 'gelesen' : 'neu'}
              </span>
            </div>
            <p className="text-muted-foreground">{notification.message}</p>
            {!notification.readAt && (
              <button className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50" onClick={() => markRead(notification)} disabled={busy}>
                Als gelesen markieren
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
