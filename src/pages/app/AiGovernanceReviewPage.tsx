import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, ExternalLink, FileSearch, RefreshCw, RotateCcw, Send, ShieldAlert } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createAiGovernanceApi } from '../../api/aiGovernanceApi';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import {
  canEditAiGovernance,
  canReviewAiGovernance,
  type AiGovernanceReview,
  type AiGovernanceReviewItem,
} from '../../types/aiGovernance';

function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString();
}

function documentationTone(state: AiGovernanceReviewItem['documentationState']) {
  if (state === 'documented_by_declaration') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (state === 'not_documented_by_declaration') return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
  return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
}

function safeOfficialUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function AiGovernanceReviewPage() {
  const { reviewId } = useParams();
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();
  const navigate = useNavigate();

  const [review, setReview] = useState<AiGovernanceReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const canSubmit = canEditAiGovernance(currentOrg?.role);
  const canReview = canReviewAiGovernance(currentOrg?.role);

  useEffect(() => {
    let cancelled = false;
    setReview(null);
    setError(null);

    if (orgLoading) {
      setLoading(true);
      return;
    }
    if (!session?.access_token || !currentOrg || !reviewId) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const api = createAiGovernanceApi(async () => session!.access_token);
        const next = await api.getReview(currentOrg!.id, reviewId!);
        if (!cancelled) setReview(next);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Failed to load AI Governance review.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, reviewId, orgLoading, retry]);

  async function transition(action: 'submit' | 'review' | 'reopen') {
    if (!session?.access_token || !currentOrg || !review || busy) return;
    setBusy(true);
    setError(null);
    try {
      const api = createAiGovernanceApi(async () => session.access_token);
      const updated = await api.transitionReview(currentOrg.id, review.id, action);
      const refreshed = await api.getReview(currentOrg.id, updated.id);
      setReview(refreshed);
    } catch (transitionError) {
      setError(transitionError instanceof Error ? transitionError.message : 'Failed to update AI Governance review.');
    } finally {
      setBusy(false);
    }
  }

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading guided review...</div>;
  }

  if (!review) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <button onClick={() => navigate('/app/ai-governance')} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"><ArrowLeft className="h-4 w-4" /> Back to AI Governance</button>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">{error || 'Review unavailable.'}</div>
      </div>
    );
  }

  const snapshot = review.systemSnapshot;
  const items = review.items || [];

  return (
    <div className="mx-auto max-w-6xl space-y-7 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate('/app/ai-governance')} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"><ArrowLeft className="h-4 w-4" /> Back to AI Governance</button>
        <div className="flex flex-wrap gap-2">
          {(review.status === 'draft' || review.status === 'reopened') && canSubmit && (
            <button disabled={busy} onClick={() => transition('submit')} className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-300 disabled:opacity-50"><Send className="h-4 w-4" /> Submit for human review</button>
          )}
          {review.status === 'submitted' && canReview && (
            <button disabled={busy} onClick={() => transition('review')} className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Mark human review complete</button>
          )}
          {review.status === 'reviewed' && canReview && (
            <button disabled={busy} onClick={() => transition('reopen')} className="inline-flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-300 disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Reopen review</button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>{error}</span>
          <button onClick={() => setRetry(value => value + 1)} className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Reload</button>
        </div>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Guided review · frozen system snapshot</div>
            <h1 className="mt-3 text-2xl font-semibold text-slate-100">{snapshot.systemName}</h1>
            <p className="mt-2 text-sm text-slate-500">{snapshot.providerName || 'Provider not declared'}{snapshot.modelName ? ` · ${snapshot.modelName}` : ''}</p>
          </div>
          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300">Requires human legal review</span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><div className="text-xs text-slate-600">Workflow status</div><div className="mt-1 text-sm text-slate-300">{review.status}</div></div>
          <div><div className="text-xs text-slate-600">Organization role</div><div className="mt-1 text-sm text-slate-300">{snapshot.organizationRole}</div></div>
          <div><div className="text-xs text-slate-600">Deployment</div><div className="mt-1 text-sm text-slate-300">{snapshot.deploymentContext}</div></div>
          <div><div className="text-xs text-slate-600">Source registry</div><div className="mt-1 text-sm text-slate-300">{review.sourceRegistryId}@{review.sourceRegistryVersion}</div></div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-500">
          This review freezes the AI System declaration and legal-source registry version used when the review cycle was created. GuardAI does not determine EU AI Act applicability or risk classification from this workflow.
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Review items</h2>
          <p className="text-sm text-slate-500">Documentation signals and official-source references for a human reviewer.</p>
        </div>

        {items.map(item => {
          const sourceUrl = safeOfficialUrl(item.legalSource?.sourceUrl);
          return (
            <article key={item.itemKey} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${documentationTone(item.documentationState)}`}>{item.documentationState.replaceAll('_', ' ')}</span>
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">human review</span>
                  </div>
                  <h3 className="mt-3 font-medium text-slate-100">{item.itemKey.replaceAll('-', ' ')}</h3>
                  <div className="mt-2 text-sm text-slate-500">Trigger: {item.trigger.replaceAll('_', ' ')}</div>
                </div>
                {sourceUrl && (
                  <a href={sourceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
                    Official source <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>

              {item.legalSource && (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600"><FileSearch className="h-3.5 w-3.5" /> Legal source provenance</div>
                  <div className="mt-2 text-sm text-slate-300">{item.legalSource.sourceName}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.legalSource.jurisdiction} · {item.legalSource.reference}</div>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-semibold text-slate-100">Workflow provenance</h2>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div><div className="text-xs text-slate-600">Created</div><div className="mt-1 text-slate-400">{formatDate(review.createdAt)}</div></div>
          <div><div className="text-xs text-slate-600">Submitted</div><div className="mt-1 text-slate-400">{formatDate(review.submittedAt)}</div></div>
          <div><div className="text-xs text-slate-600">Human reviewed</div><div className="mt-1 text-slate-400">{formatDate(review.reviewedAt)}</div></div>
        </div>
      </section>

      <div className="flex gap-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.05] p-5 text-sm leading-6 text-slate-400">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        A reviewed workflow status records that an authorized human completed this GuardAI review cycle. It does not certify legal compliance, determine regulatory applicability, or replace legal advice.
      </div>
    </div>
  );
}
