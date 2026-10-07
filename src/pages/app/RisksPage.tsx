import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Link2,
  Plus,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { GuardApiError } from '../../api/apiClient';
import { createFindingApi } from '../../api/findingApi';
import { createGovernanceApi } from '../../api/governanceApi';
import { createRiskApi } from '../../api/riskApi';
import { createWorkspaceApi } from '../../api/workspaceApi';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { GovernanceControl } from '../../types/governance';
import type { WorkspaceFindingSummary } from '../../types/findingLifecycle';
import type { RiskTreatment, WorkspaceRisk } from '../../types/risk';
import type { WorkspaceTarget } from '../../types/workspace';

function formatDate(value?: string | null) {
  if (!value) return 'Not scheduled';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleDateString();
}

function statusBadge(status: WorkspaceRisk['status']) {
  const common = 'rounded-full border px-2.5 py-1 text-xs font-medium';
  if (status === 'accepted') return <span className={`${common} border-violet-500/20 bg-violet-500/10 text-violet-300`}>Accepted</span>;
  if (status === 'closed') return <span className={`${common} border-emerald-500/20 bg-emerald-500/10 text-emerald-300`}>Closed</span>;
  if (status === 'mitigating') return <span className={`${common} border-amber-500/20 bg-amber-500/10 text-amber-300`}>Mitigating</span>;
  return <span className={`${common} border-rose-500/20 bg-rose-500/10 text-rose-300`}>Open</span>;
}

function scoreTone(score: number | null) {
  if (score === null) return 'text-slate-500';
  if (score >= 17) return 'text-rose-300';
  if (score >= 10) return 'text-amber-300';
  if (score >= 5) return 'text-yellow-200';
  return 'text-emerald-300';
}

export default function RisksPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();

  const [risks, setRisks] = useState<WorkspaceRisk[]>([]);
  const [targets, setTargets] = useState<WorkspaceTarget[]>([]);
  const [findings, setFindings] = useState<WorkspaceFindingSummary[]>([]);
  const [controls, setControls] = useState<GovernanceControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageReady, setStorageReady] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);
  const [treatment, setTreatment] = useState<RiskTreatment>('mitigate');
  const [reviewDate, setReviewDate] = useState('');
  const [targetId, setTargetId] = useState('');
  const [findingId, setFindingId] = useState('');
  const [controlId, setControlId] = useState('');

  const canEdit = currentOrg?.role === 'owner' || currentOrg?.role === 'admin' || currentOrg?.role === 'member';
  const canAccept = currentOrg?.role === 'owner' || currentOrg?.role === 'admin';

  useEffect(() => {
    let cancelled = false;
    setRisks([]);
    setTargets([]);
    setFindings([]);
    setControls([]);
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
      const tokenProvider = async () => session!.access_token;
      const riskApi = createRiskApi(tokenProvider);
      const workspaceApi = createWorkspaceApi(tokenProvider);
      const findingApi = createFindingApi(tokenProvider);
      const governanceApi = createGovernanceApi(tokenProvider);

      try {
        const [nextTargets, findingPage, nextControls] = await Promise.all([
          workspaceApi.listTargets(currentOrg!.id),
          findingApi.listFindings(currentOrg!.id, { status: 'open', limit: 50 }),
          governanceApi.listControls(),
        ]);
        if (!cancelled) {
          setTargets(nextTargets);
          setFindings(findingPage.findings);
          setControls(nextControls);
        }

        try {
          const nextRisks = await riskApi.listRisks(currentOrg!.id);
          if (!cancelled) setRisks(nextRisks);
        } catch (riskError) {
          if (cancelled) return;
          if (riskError instanceof GuardApiError && riskError.code === 'RISK_STORAGE_NOT_READY') {
            setStorageReady(false);
          } else {
            throw riskError;
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load Risk Register.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading, retry]);

  const targetNames = useMemo(
    () => Object.fromEntries(targets.map(item => [item.id, item.displayName])),
    [targets],
  );
  const findingNames = useMemo(
    () => Object.fromEntries(findings.map(item => [item.id, item.ruleTitle || item.message || item.id])),
    [findings],
  );
  const controlNames = useMemo(
    () => Object.fromEntries(controls.map(item => [item.id, item.title])),
    [controls],
  );

  const counts = useMemo(() => ({
    open: risks.filter(risk => risk.status === 'open').length,
    mitigating: risks.filter(risk => risk.status === 'mitigating').length,
    accepted: risks.filter(risk => risk.status === 'accepted').length,
    closed: risks.filter(risk => risk.status === 'closed').length,
  }), [risks]);

  function resetCreate() {
    setTitle('');
    setDescription('');
    setLikelihood(3);
    setImpact(3);
    setTreatment('mitigate');
    setReviewDate('');
    setTargetId('');
    setFindingId('');
    setControlId('');
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!session?.access_token || !currentOrg || !canEdit || !storageReady) return;
    setBusy(true);
    setError(null);
    try {
      const api = createRiskApi(async () => session.access_token);
      const risk = await api.createRisk(currentOrg.id, {
        title,
        description: description.trim() || null,
        likelihood,
        impact,
        treatment,
        reviewDueAt: reviewDate ? new Date(`${reviewDate}T12:00:00Z`).toISOString() : null,
        targetIds: targetId ? [targetId] : [],
        findingIds: findingId ? [findingId] : [],
        controlIds: controlId ? [controlId] : [],
      });
      setRisks(current => [risk, ...current]);
      resetCreate();
      setShowCreate(false);
    } catch (createError) {
      if (createError instanceof GuardApiError && createError.code === 'RISK_STORAGE_NOT_READY') {
        setStorageReady(false);
      } else {
        setError(createError instanceof Error ? createError.message : 'Failed to create Risk.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function updateRisk(risk: WorkspaceRisk, patch: Parameters<ReturnType<typeof createRiskApi>['updateRisk']>[2]) {
    if (!session?.access_token || !currentOrg || !canEdit) return;
    setBusy(true);
    setError(null);
    try {
      const api = createRiskApi(async () => session.access_token);
      const updated = await api.updateRisk(currentOrg.id, risk.id, patch);
      setRisks(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update Risk.');
    } finally {
      setBusy(false);
    }
  }

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading Risk Register...</div>;
  }

  if (!currentOrg) {
    return <div className="text-sm text-slate-500">Create or select a workspace before managing Risks.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Risk Register</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Risks describe potential business or security impact and treatment decisions. A Finding is an observed issue; it is not automatically a Risk.
          </p>
        </div>
        {canEdit && storageReady && (
          <button
            onClick={() => setShowCreate(value => !value)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCreate ? 'Cancel' : 'New Risk'}
          </button>
        )}
      </div>

      {!storageReady && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-6">
          <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h2 className="font-semibold text-slate-100">Risk storage is not provisioned in this environment</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                GuardAI will not simulate Risk records in browser state. The tenant-safe Risk storage design must be promoted through the dedicated GuardAI database migration process before Risk data can be written here.
              </p>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>{error}</span>
          <button onClick={() => setRetry(value => value + 1)} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-rose-500/10">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {storageReady && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ['Open', counts.open],
              ['Mitigating', counts.mitigating],
              ['Accepted', counts.accepted],
              ['Closed', counts.closed],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
              </div>
            ))}
          </div>

          {showCreate && canEdit && (
            <form onSubmit={handleCreate} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="grid gap-5 lg:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-300">Risk title</span>
                  <input
                    value={title}
                    onChange={event => setTitle(event.target.value)}
                    required
                    maxLength={200}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 outline-none focus:border-indigo-500/50"
                    placeholder="e.g. Unauthorized access to customer data"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-300">Likelihood (1–5)</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={likelihood}
                      onChange={event => setLikelihood(Number(event.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-300">Impact (1–5)</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={impact}
                      onChange={event => setImpact(Number(event.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                    />
                  </label>
                </div>

                <label className="space-y-2 text-sm lg:col-span-2">
                  <span className="font-medium text-slate-300">Description</span>
                  <textarea
                    value={description}
                    onChange={event => setDescription(event.target.value)}
                    maxLength={5000}
                    className="min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                    placeholder="Describe the potential event, exposure and business impact."
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-300">Treatment</span>
                  <select
                    value={treatment}
                    onChange={event => setTreatment(event.target.value as RiskTreatment)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                  >
                    <option value="mitigate">Mitigate</option>
                    <option value="avoid">Avoid</option>
                    <option value="transfer">Transfer</option>
                    <option value="monitor">Monitor</option>
                    {canAccept && <option value="accept">Accept</option>}
                  </select>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-300">Review due</span>
                  <input
                    type="date"
                    value={reviewDate}
                    onChange={event => setReviewDate(event.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-300">Related Target</span>
                  <select value={targetId} onChange={event => setTargetId(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200">
                    <option value="">None</option>
                    {targets.map(target => <option key={target.id} value={target.id}>{target.displayName}</option>)}
                  </select>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-300">Related open Finding</span>
                  <select value={findingId} onChange={event => setFindingId(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200">
                    <option value="">None</option>
                    {findings.map(finding => (
                      <option key={finding.id} value={finding.id}>{finding.ruleTitle || finding.message || finding.id}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm lg:col-span-2">
                  <span className="font-medium text-slate-300">Related Control</span>
                  <select value={controlId} onChange={event => setControlId(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200">
                    <option value="">None</option>
                    {controls.map(control => <option key={control.id} value={control.id}>{control.id} — {control.title}</option>)}
                  </select>
                </label>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-800 pt-5">
                <div className="text-sm text-slate-500">
                  Inherent score: <span className={`font-semibold ${scoreTone(likelihood * impact)}`}>{likelihood * impact}/25</span>
                </div>
                <button
                  type="submit"
                  disabled={busy || !title.trim()}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
                >
                  {busy ? 'Saving...' : 'Create Risk'}
                </button>
              </div>
            </form>
          )}

          {risks.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
              <ShieldAlert className="mx-auto h-8 w-8 text-slate-600" />
              <h2 className="mt-3 font-medium text-slate-200">No Risks recorded yet</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                Findings do not automatically become Risks. Create a Risk only when the organization needs to track a potential impact and treatment decision.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {risks.map(risk => (
                <article key={risk.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {statusBadge(risk.status)}
                        <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-400">
                          {risk.treatment}
                        </span>
                      </div>
                      <h2 className="mt-3 text-base font-semibold text-slate-100">{risk.title}</h2>
                      {risk.description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{risk.description}</p>}
                    </div>

                    <div className="grid shrink-0 grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-center">
                        <div className="text-[11px] uppercase tracking-wider text-slate-600">Inherent</div>
                        <div className={`mt-1 text-xl font-semibold ${scoreTone(risk.inherentScore)}`}>{risk.inherentScore}/25</div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-center">
                        <div className="text-[11px] uppercase tracking-wider text-slate-600">Residual</div>
                        <div className={`mt-1 text-xl font-semibold ${scoreTone(risk.residualScore)}`}>{risk.residualScore ?? '—'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <div className="flex items-center gap-1.5 text-slate-600"><CalendarClock className="h-3.5 w-3.5" /> Review</div>
                      <div className="mt-1 text-slate-400">{formatDate(risk.reviewDueAt)}</div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <div className="flex items-center gap-1.5 text-slate-600"><Link2 className="h-3.5 w-3.5" /> Targets</div>
                      <div className="mt-1 truncate text-slate-400">{risk.targetIds.map(id => targetNames[id] || id).join(', ') || 'None'}</div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <div className="text-slate-600">Findings</div>
                      <div className="mt-1 truncate text-slate-400">{risk.findingIds.map(id => findingNames[id] || id).join(', ') || 'None'}</div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <div className="text-slate-600">Controls</div>
                      <div className="mt-1 truncate text-slate-400">{risk.controlIds.map(id => controlNames[id] || id).join(', ') || 'None'}</div>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                      {risk.status === 'open' && (
                        <button disabled={busy} onClick={() => updateRisk(risk, { status: 'mitigating' })} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50">
                          Start mitigation
                        </button>
                      )}
                      {risk.status !== 'closed' && risk.status !== 'accepted' && (
                        <button disabled={busy} onClick={() => updateRisk(risk, { status: 'closed' })} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Close
                        </button>
                      )}
                      {canAccept && risk.status !== 'accepted' && risk.status !== 'closed' && (
                        <button disabled={busy} onClick={() => updateRisk(risk, { status: 'accepted', treatment: 'accept' })} className="rounded-lg border border-violet-500/20 px-3 py-2 text-xs font-medium text-violet-300 hover:bg-violet-500/10 disabled:opacity-50">
                          Accept risk
                        </button>
                      )}
                      {canAccept && risk.status === 'accepted' && (
                        <button disabled={busy} onClick={() => updateRisk(risk, { status: 'open', treatment: 'monitor' })} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50">
                          Reopen
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
