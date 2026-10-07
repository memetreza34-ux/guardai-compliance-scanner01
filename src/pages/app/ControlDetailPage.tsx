import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, FileCheck2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { createFindingApi } from '../../api/findingApi';
import { createGovernanceApi } from '../../api/governanceApi';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { WorkspaceFindingSummary } from '../../types/findingLifecycle';
import type { GovernanceControl } from '../../types/governance';

export default function ControlDetailPage() {
  const { controlId } = useParams();
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();
  const navigate = useNavigate();
  const [control, setControl] = useState<GovernanceControl | null>(null);
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
    if (!session?.access_token || !currentOrg || !controlId) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const token = async () => session!.access_token;
        const [nextControl, page] = await Promise.all([
          createGovernanceApi(token).getControl(controlId!),
          createFindingApi(token).listFindings(currentOrg!.id, { status: 'open', limit: 100 }),
        ]);
        if (cancelled) return;
        setControl(nextControl);
        setFindings(page.findings);
        setPartial(Boolean(page.nextCursor));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load control.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, controlId, orgLoading, retry]);

  const mappedFindings = useMemo(() => {
    if (!control) return [];
    return findings.filter((finding) => finding.ruleId && control.mappedRuleIds.includes(finding.ruleId));
  }, [control, findings]);

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading control...</div>;
  }

  if (!control || error) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <button onClick={() => navigate('/app/controls')} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Back to controls
        </button>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-300">
          {error || 'Control is unavailable.'}
          <button onClick={() => setRetry((value) => value + 1)} className="ml-3 inline-flex items-center gap-1 underline">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <button onClick={() => navigate('/app/controls')} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Back to controls
      </button>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="font-mono text-xs text-indigo-300">{control.id}</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">{control.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{control.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {control.mappedRuleIds.map((ruleId) => (
            <span key={ruleId} className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-[11px] text-slate-400">{ruleId}</span>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Requirements</h2>
          <p className="text-sm text-slate-500">Technical requirements currently mapped to this GuardAI control.</p>
        </div>
        {control.requirements.map((requirement) => (
          <article key={requirement.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-indigo-400" />
              <span className="font-mono text-xs text-indigo-300">{requirement.id}</span>
            </div>
            <h3 className="mt-3 font-medium text-slate-100">{requirement.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{requirement.scopeBoundary}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Current mapped findings</h2>
            <p className="text-sm text-slate-500">Open findings whose current Rule ID maps to this Control.</p>
          </div>
          <span className="text-xs text-slate-500">{mappedFindings.length}{partial ? '+' : ''}</span>
        </div>

        {mappedFindings.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] p-5 text-sm text-slate-400">
            No open mapped findings are present in the loaded finding view. This is not a pass, audit result, or proof of complete assessment.
          </div>
        ) : (
          <div className="space-y-3">
            {mappedFindings.map((finding) => (
              <button
                key={finding.id}
                onClick={() => finding.latestScanId && navigate(`/app/scans/${finding.latestScanId}`)}
                className="flex w-full items-center justify-between gap-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.05] p-4 text-left hover:bg-amber-500/[0.08]"
              >
                <div>
                  <div className="font-medium text-slate-200">{finding.ruleTitle || finding.message || finding.ruleId}</div>
                  <div className="mt-1 font-mono text-xs text-slate-500">{finding.ruleId}</div>
                </div>
                {finding.latestScanId && <ExternalLink className="h-4 w-4 shrink-0 text-slate-500" />}
              </button>
            ))}
          </div>
        )}

        {partial && (
          <div className="text-xs text-amber-300/80">More open findings exist outside this loaded page; the list above may be incomplete.</div>
        )}
      </section>

      <div className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
        This control currently represents an internal technical GuardAI baseline only.
      </div>
    </div>
  );
}
