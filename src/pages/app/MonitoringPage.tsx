import { useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, Pause, Play, Plus, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { GuardApiError } from '../../api/apiClient';
import { createMonitoringApi } from '../../api/monitoringApi';
import { createWorkspaceApi } from '../../api/workspaceApi';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { WorkspaceMonitor } from '../../types/monitoring';
import type { WorkspaceTarget } from '../../types/workspace';

function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString();
}

function intervalLabel(minutes: number) {
  if (minutes === 60) return 'Every hour';
  if (minutes === 360) return 'Every 6 hours';
  if (minutes === 1440) return 'Daily';
  if (minutes === 10080) return 'Weekly';
  if (minutes % 1440 === 0) return `Every ${minutes / 1440} days`;
  return `Every ${minutes} minutes`;
}

export default function MonitoringPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();
  const [monitors, setMonitors] = useState<WorkspaceMonitor[]>([]);
  const [targets, setTargets] = useState<WorkspaceTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(true);
  const [retry, setRetry] = useState(0);
  const [targetId, setTargetId] = useState('');
  const [scheduleMinutes, setScheduleMinutes] = useState(1440);

  const canAdmin = currentOrg?.role === 'owner' || currentOrg?.role === 'admin';

  useEffect(() => {
    let cancelled = false;
    setMonitors([]);
    setTargets([]);
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
      const token = async () => session!.access_token;
      try {
        const workspaceApi = createWorkspaceApi(token);
        const nextTargets = await workspaceApi.listTargets(currentOrg!.id);
        if (!cancelled) setTargets(nextTargets);

        try {
          const monitorApi = createMonitoringApi(token);
          const nextMonitors = await monitorApi.listMonitors(currentOrg!.id);
          if (!cancelled) setMonitors(nextMonitors);
        } catch (monitorError) {
          if (cancelled) return;
          if (
            monitorError instanceof GuardApiError &&
            monitorError.code === 'MONITORING_STORAGE_NOT_READY'
          ) {
            setStorageReady(false);
          } else {
            throw monitorError;
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load Monitoring.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading, retry]);

  const targetNames = useMemo(
    () => Object.fromEntries(targets.map((target) => [target.id, target.displayName])),
    [targets],
  );

  const monitoredTargetIds = new Set(
    monitors.filter((item) => item.status !== 'disabled').map((item) => item.targetId),
  );
  const eligibleTargets = targets.filter(
    (target) =>
      target.type === 'website' &&
      target.verificationState === 'verified' &&
      !monitoredTargetIds.has(target.id),
  );

  async function createMonitor() {
    if (!session?.access_token || !currentOrg || !canAdmin || !targetId) return;
    setBusy(true);
    setError(null);
    try {
      const api = createMonitoringApi(async () => session.access_token);
      const monitor = await api.createMonitor(currentOrg.id, { targetId, scheduleMinutes });
      setMonitors((current) => [monitor, ...current]);
      setTargetId('');
    } catch (createError) {
      if (
        createError instanceof GuardApiError &&
        createError.code === 'MONITORING_STORAGE_NOT_READY'
      ) {
        setStorageReady(false);
      } else {
        setError(createError instanceof Error ? createError.message : 'Failed to create Monitor.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(monitor: WorkspaceMonitor, status: WorkspaceMonitor['status']) {
    if (!session?.access_token || !currentOrg || !canAdmin) return;
    setBusy(true);
    setError(null);
    try {
      const api = createMonitoringApi(async () => session.access_token);
      const updated = await api.setMonitorStatus(currentOrg.id, monitor.id, status);
      setMonitors((current) =>
        status === 'disabled'
          ? current.filter((item) => item.id !== monitor.id)
          : current.map((item) => item.id === updated.id ? updated : item),
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update Monitor.');
    } finally {
      setBusy(false);
    }
  }

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading Monitoring...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Monitoring</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
          Schedule recurring persistent Security scans for verified Website Targets. Monitoring executes real scans; GuardAI does not yet label every state change as a canonical Drift event.
        </p>
      </div>

      {!storageReady && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-6">
          <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h2 className="font-semibold text-slate-100">Monitoring storage is not provisioned</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                This environment has not activated the tenant-safe Monitoring database design. GuardAI does not emulate scheduled monitors in browser state.
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

      {storageReady && canAdmin && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-300" />
            <h2 className="font-semibold text-slate-100">Create Security Monitor</h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px_auto]">
            <select value={targetId} onChange={(event) => setTargetId(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
              <option value="">Select verified Website Target</option>
              {eligibleTargets.map((target) => <option key={target.id} value={target.id}>{target.displayName}</option>)}
            </select>
            <select value={scheduleMinutes} onChange={(event) => setScheduleMinutes(Number(event.target.value))} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
              <option value={60}>Every hour</option>
              <option value={360}>Every 6 hours</option>
              <option value={1440}>Daily</option>
              <option value={10080}>Weekly</option>
            </select>
            <button disabled={!targetId || busy} onClick={createMonitor} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50">
              {busy ? 'Saving...' : 'Enable monitoring'}
            </button>
          </div>
          {eligibleTargets.length === 0 && (
            <p className="mt-3 text-xs text-slate-500">No unmonitored verified Website Target is currently eligible.</p>
          )}
        </section>
      )}

      {storageReady && (
        monitors.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
            <Activity className="mx-auto h-8 w-8 text-slate-600" />
            <h2 className="mt-3 font-medium text-slate-200">No active or paused monitors</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Monitoring is intentionally opt-in and can only run against verified Website Targets.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {monitors.map((monitor) => (
              <article key={monitor.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                        monitor.status === 'active'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                          : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                      }`}>{monitor.status}</span>
                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-400">security</span>
                    </div>
                    <h2 className="mt-3 font-semibold text-slate-100">{targetNames[monitor.targetId] || monitor.targetId}</h2>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                      <span>{intervalLabel(monitor.scheduleMinutes)}</span>
                      <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> Next run {formatDate(monitor.nextRunAt)}</span>
                    </div>
                  </div>
                  {canAdmin && (
                    <div className="flex flex-wrap gap-2">
                      {monitor.status === 'active' ? (
                        <button disabled={busy} onClick={() => changeStatus(monitor, 'paused')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50">
                          <Pause className="h-3.5 w-3.5" /> Pause
                        </button>
                      ) : (
                        <button disabled={busy} onClick={() => changeStatus(monitor, 'active')} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50">
                          <Play className="h-3.5 w-3.5" /> Resume
                        </button>
                      )}
                      <button disabled={busy} onClick={() => changeStatus(monitor, 'disabled')} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50">
                        <Trash2 className="h-3.5 w-3.5" /> Disable
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs leading-5 text-slate-500">
        A monitor schedules recurring supported scans. It does not prove continuous security coverage, complete vulnerability detection or legal compliance.
      </div>
    </div>
  );
}
