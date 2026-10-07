import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, CircleDot, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { createFindingApi } from '../../api/findingApi';
import { createGovernanceApi } from '../../api/governanceApi';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { WorkspaceFindingSummary } from '../../types/findingLifecycle';
import type { GovernanceControl } from '../../types/governance';

function controlState(control: GovernanceControl, findings: WorkspaceFindingSummary[], partial: boolean) {
  const mapped = findings.filter((finding) => finding.ruleId && control.mappedRuleIds.includes(finding.ruleId));
  if (mapped.length > 0) {
    return {
      label: `${mapped.length} open finding${mapped.length === 1 ? '' : 's'}`,
      className: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
      count: mapped.length,
    };
  }
  if (partial) {
    return {
      label: 'Partial finding view',
      className: 'border-slate-700 bg-slate-800/60 text-slate-400',
      count: 0,
    };
  }
  return {
    label: 'No open mapped findings',
    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    count: 0,
  };
}

export default function ControlsPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();
  const navigate = useNavigate();
  const [controls, setControls] = useState<GovernanceControl[]>([]);
  const [findings, setFindings] = useState<WorkspaceFindingSummary[]>([]);
  const [partial, setPartial] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    if (orgLoading) {
      setLoading(true);
      return;
    }
    if (!session?.access_token || !currentOrg) {
      setControls([]);
      setFindings([]);
      setPartial(false);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const token = async () => session!.access_token;
        const governanceApi = createGovernanceApi(token);
        const findingApi = createFindingApi(token);
        const [nextControls, findingPage] = await Promise.all([
          governanceApi.listControls(),
          findingApi.listFindings(currentOrg!.id, { status: 'open', limit: 100 }),
        ]);
        if (cancelled) return;
        setControls(nextControls);
        setFindings(findingPage.findings);
        setPartial(Boolean(findingPage.nextCursor));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load controls.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading, retry]);

  const mappedOpenFindings = useMemo(() => {
    const mappedRules = new Set(controls.flatMap((control) => control.mappedRuleIds));
    return findings.filter((finding) => finding.ruleId && mappedRules.has(finding.ruleId)).length;
  }, [controls, findings]);

  const requirementCount = useMemo(
    () => controls.reduce((total, control) => total + control.requirements.length, 0),
    [controls],
  );

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading controls...</div>;
  }

  if (!currentOrg) {
    return (
      <div className="max-w-5xl mx-auto rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-xl font-semibold text-slate-100">Controls</h1>
        <p className="mt-2 text-sm text-slate-500">Create or select a workspace to evaluate technical controls against workspace findings.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 animate-in fade-in duration-500">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">Govern</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">Controls</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
          Canonical GuardAI technical controls mapped to versioned scanner rules. Control state below is derived from currently loaded open findings and is not an auditor opinion or compliance result.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Controls</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{controls.length}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Requirements</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{requirementCount}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Mapped open findings</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{mappedOpenFindings}{partial ? '+' : ''}</div>
        </div>
      </div>

      {partial && (
        <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          More than 100 open findings exist. Control finding counts on this page are a partial view and are not presented as complete.
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>{error}</span>
          <button onClick={() => setRetry((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-rose-500/10">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      <div className="space-y-3">
        {controls.map((control) => {
          const state = controlState(control, findings, partial);
          return (
            <button
              key={control.id}
              onClick={() => navigate(`/app/controls/${encodeURIComponent(control.id)}`)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition-colors hover:bg-slate-800/40"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-indigo-300">{control.id}</span>
                    <span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] uppercase tracking-wider text-slate-500">{control.category}</span>
                  </div>
                  <h2 className="mt-3 text-base font-semibold text-slate-100">{control.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{control.description}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>{control.requirements.length} requirement{control.requirements.length === 1 ? '' : 's'}</span>
                    <span>{control.mappedRuleIds.length} mapped rule{control.mappedRuleIds.length === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${state.className}`}>
                    {state.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {controls.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center">
          <CircleDot className="mx-auto h-7 w-7 text-slate-600" />
          <div className="mt-3 text-sm text-slate-500">No GuardAI controls are available.</div>
        </div>
      )}

      <div className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
        “No open mapped findings” only describes the mapped GuardAI finding set in the loaded view. It does not mean a Control passed an audit or that all relevant security conditions were assessed.
      </div>
    </div>
  );
}
