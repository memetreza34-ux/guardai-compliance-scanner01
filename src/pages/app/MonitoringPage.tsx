import { useEffect, useMemo, useState } from 'react';
import { Activity, ExternalLink, Pause, Play, Plus, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { GuardApiError } from '../../api/apiClient';
import { createMonitoringApi } from '../../api/monitoringApi';
import { createWorkspaceApi } from '../../api/workspaceApi';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { WorkspaceMonitor, WorkspaceMonitorRun } from '../../types/monitoring';
import type { WorkspaceTarget } from '../../types/workspace';

function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString();
}

function intervalLabel(minutes: number) {
  if (minutes === 60) return 'Every hour';
  if (minutes === 360) return 'Every 6 hours';
  if (minutes === 1440) return 'Daily';
  if (minutes === 10080) return 'Weekly';
  if (minutes % 1440 === 0) return `Every ${minutes / 1440} days`;
  if (minutes % 60 === 0) return `Every ${minutes / 60} hours`;
  return `Every ${minutes} minutes`;
}

function readableError(error: unknown) {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'Monitoring action failed.';
}

function runStatusClass(status: WorkspaceMonitorRun['scanStatus']) {
  if (status === 'completed') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (status === 'failed') return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
  if (status === 'running' || status === 'queued') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  return 'border-slate-700 bg-slate-800 text-slate-400';
}

export default function MonitoringPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();
  const navigate = useNavigate();
  const [targets, setTargets] = useState<WorkspaceTarget[]>([]);
  const [monitors, setMonitors] = useState<WorkspaceMonitor[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [scheduleMinutes, setScheduleMinutes] = useState(1440);
  const [selectedMonitorId, setSelectedMonitorId] = useState<string | null>(null);
  const [runs, setRuns] = useState<WorkspaceMonitorRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = currentOrg?.role === 'owner' || currentOrg?.role === 'admin';

  const verifiedTargets = useMemo(
    () => targets.filter((target) => target.type === 'website' && target.verificationState === 'verified'),
    [targets],
  );

  const targetNames = useMemo(
    () => Object.fromEntries(targets.map((target) => [target.id, target.displayName])),
    [targets],
  );

  async function loadWorkspace() {
    if (!session?.access_token || !currentOrg) return;
    const token = async () => session.access_token;
    const [nextTargets, nextMonitors] = await Promise.all([
      createWorkspaceApi(token).listTargets(currentOrg.id),
      createMonitoringApi(token).listMonitors(currentOrg.id),
    ]);
    setTargets(nextTargets);
    setMonitors(nextMonitors);
  }

  useEffect(() => {
    let cancelled = false;
    setSelectedTargetId('');
    setSelectedMonitorId(null);
    setRuns([]);
    setError(null);

    if (orgLoading) {
      setLoading(true);
      return;
    }
    if (!session?.access_token || !currentOrg) {
      setTargets([]);
      setMonitors([]);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const token = async () => session!.access_token;
        const [nextTargets, nextMonitors] = await Promise.all([
          createWorkspaceApi(token).listTargets(currentOrg!.id),
          createMonitoringApi(token).listMonitors(currentOrg!.id),
        ]);
        if (cancelled) return;
        setTargets(nextTargets);
        setMonitors(nextMonitors);
      } catch (err) {
        if (!cancelled) setError(readableError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading]);

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(readableError(err));
    } finally {
      setBusy(false);
    }
  }

  async function createMonitor() {
    if (!session?.access_token || !currentOrg || !selectedTargetId || !canManage) return;
    await runAction(async () => {
      const api = createMonitoringApi(async () => session.access_token);
      await api.createMonitor(currentOrg.id, { targetId: selectedTargetId, scheduleMinutes });
      setSelectedTargetId('');
      await loadWorkspace();
    });
  }

  async function changeStatus(monitor: WorkspaceMonitor, status: WorkspaceMonitor['status']) {
    if (!session?.access_token || !currentOrg || !canManage) return;
    await runAction(async () => {
      const api = createMonitoringApi(async () => session.access_token);
      await api.setMonitorStatus(currentOrg.id, monitor.id, status);
      await loadWorkspace();
      if (status === 'disabled' && selectedMonitorId === monitor.id) {
        setSelectedMonitorId(null);
        setRuns([]);
      }
    });
  }

  async function showRuns(monitorId: string) {
    if (!session?.access_token || !currentOrg) return;
    setSelectedMonitorId(monitorId);
    setRunsLoading(true);
    setError(null);
    try {
      const nextRuns = await createMonitoringApi(async () => session.access_token)
        .listMonitorRuns(currentOrg.id, monitorId, 20);
      setRuns(nextRuns);
    } catch (err) {
      setError(readableError(err));
      setRuns([]);
    } finally {
      setRunsLoading(false);
    }
  }

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading monitoring...</div>;
  }

  if (!currentOrg) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-xl font-semibold text-slate-100">Monitoring</h1>
        <p className="mt-2 text-sm text-slate-500">Select a workspace before configuring monitoring.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">Monitor</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">Continuous Monitoring</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
          Scheduled monitoring creates real persistent Security scans for verified website targets. A scheduler failure or scan failure is not treated as a passing result.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {canManage && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-400" />
            <h2 className="font-semibold text-slate-100">Create Security monitor</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">Only verified website targets are eligible. Current minimum interval is one hour.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <select
              value={selectedTargetId}
              onChange={(event) => setSelectedTargetId(event.target.value)}
              disabled={busy}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300"
            >
              <option value="">Select verified target...</option>
              {verifiedTargets.map((target) => (
                <option key={target.id} value={target.id}>{target.displayName}</option>
              ))}
            </select>
            <select
              value={scheduleMinutes}
              onChange={(event) => setScheduleMinutes(Number(event.target.value))}
              disabled={busy}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300"
            >
              <option value={60}>Every hour</option>
              <option value={360}>Every 6 hours</option>
              <option value={1440}>Daily</option>
              <option value={10080}>Weekly</option>
            </select>
            <button
              type="button"
              disabled={busy || !selectedTargetId}
              onClick={createMonitor}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? 'Saving...' : 'Create monitor'}
            </button>
          </div>
          {verifiedTargets.length === 0 && (
            <p className="mt-4 text-xs text-amber-300/80">No verified website target is currently available.</p>
          )}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Monitor configurations</h2>
            <p className="text-sm text-slate-500">Active and paused monitors for this workspace.</p>
          </div>
          <span className="text-xs text-slate-600">{monitors.length} monitor{monitors.length === 1 ? '' : 's'}</span>
        </div>

        {monitors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center">
            <Activity className="mx-auto h-7 w-7 text-slate-600" />
            <div className="mt-3 text-sm text-slate-500">No Security monitor has been configured.</div>
          </div>
        ) : monitors.map((monitor) => (
          <article key={monitor.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="font-medium text-slate-100">{targetNames[monitor.targetId] || monitor.targetId}</div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                  <span>{intervalLabel(monitor.scheduleMinutes)}</span>
                  <span>Next run: {formatDate(monitor.nextRunAt)}</span>
                  <span>Module: {monitor.moduleId}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  monitor.status === 'active'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}>
                  {monitor.status}
                </span>
                <button
                  type="button"
                  disabled={runsLoading}
                  onClick={() => showRuns(monitor.id)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  View runs
                </button>
                {canManage && monitor.status === 'active' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeStatus(monitor, 'paused')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Pause className="h-3.5 w-3.5" /> Pause
                  </button>
                )}
                {canManage && monitor.status === 'paused' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeStatus(monitor, 'active')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" /> Resume
                  </button>
                )}
                {canManage && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeStatus(monitor, 'disabled')}
                    className="rounded-lg border border-rose-500/20 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                  >
                    Disable
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>

      {selectedMonitorId && (
        <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-100">Recent scheduled runs</h2>
              <p className="text-xs text-slate-500">Up to the 20 most recent persisted monitor runs. No hidden total is inferred.</p>
            </div>
            <button
              type="button"
              onClick={() => showRuns(selectedMonitorId)}
              disabled={runsLoading}
              className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 disabled:opacity-50"
              aria-label="Refresh run history"
            >
              <RefreshCw className={`h-4 w-4 ${runsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {runsLoading ? (
            <div className="py-6 text-sm text-slate-500">Loading run history...</div>
          ) : runs.length === 0 ? (
            <div className="py-6 text-sm text-slate-500">No scheduled scan run has been persisted for this monitor yet.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => navigate(`/app/scans/${run.scanId}`)}
                  className="flex w-full items-center justify-between gap-4 py-3 text-left"
                >
                  <div>
                    <div className="text-sm text-slate-300">Scheduled {formatDate(run.scheduledFor)}</div>
                    <div className="mt-1 font-mono text-[11px] text-slate-600">{run.scanId}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${runStatusClass(run.scanStatus)}`}>
                      {run.scanStatus || 'unknown'}
                    </span>
                    <ExternalLink className="h-4 w-4 text-slate-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
        Monitoring schedules future GuardAI scans. It does not continuously inspect every request or replace a SIEM, uptime monitor, penetration test, or complete security assessment.
      </div>
    </div>
  );
}
