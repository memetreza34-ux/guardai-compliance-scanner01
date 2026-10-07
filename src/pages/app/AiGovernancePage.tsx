import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Archive, Brain, FileSearch, Plus, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GuardApiError } from '../../api/apiClient';
import { createAiGovernanceApi } from '../../api/aiGovernanceApi';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import {
  canEditAiGovernance,
  type AiGovernanceDeploymentContext,
  type AiGovernanceOrganizationRole,
  type AiGovernanceReview,
  type AiGovernanceTriState,
  type AiGovernanceUseCase,
  type AiSystemDeclarationInput,
  type AiSystemProfile,
} from '../../types/aiGovernance';

const useCaseOptions: Array<{ value: AiGovernanceUseCase; label: string }> = [
  { value: 'content-generation', label: 'Content generation' },
  { value: 'human-interaction', label: 'Human interaction' },
  { value: 'decision-support', label: 'Decision support' },
  { value: 'automated-action', label: 'Automated action' },
  { value: 'biometric-or-emotion', label: 'Biometric / emotion' },
  { value: 'other', label: 'Other' },
];

const declarationLabels: Array<[keyof AiSystemDeclarationInput['declarations'], string]> = [
  ['interactsDirectlyWithPeople', 'Interacts directly with people'],
  ['generatesSyntheticContent', 'Generates synthetic content'],
  ['aiLiteracyMeasuresDocumented', 'AI-literacy measures documented'],
  ['humanOversightControlsDocumented', 'Human-oversight controls documented'],
  ['interactionDisclosureDocumented', 'Interaction disclosure documented'],
  ['syntheticContentDisclosureDocumented', 'Synthetic-content disclosure documented'],
];

function emptyDeclaration(): AiSystemDeclarationInput {
  return {
    systemName: '',
    organizationRole: 'unknown',
    providerName: null,
    modelName: null,
    deploymentContext: 'unknown',
    useCases: [],
    declarations: {
      interactsDirectlyWithPeople: 'unknown',
      generatesSyntheticContent: 'unknown',
      aiLiteracyMeasuresDocumented: 'unknown',
      humanOversightControlsDocumented: 'unknown',
      interactionDisclosureDocumented: 'unknown',
      syntheticContentDisclosureDocumented: 'unknown',
    },
  };
}

function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString();
}

function reviewBadge(status: AiGovernanceReview['status']) {
  const base = 'rounded-full border px-2.5 py-1 text-xs font-medium';
  if (status === 'reviewed') return <span className={`${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-300`}>Reviewed by human</span>;
  if (status === 'submitted') return <span className={`${base} border-amber-500/20 bg-amber-500/10 text-amber-300`}>Awaiting review</span>;
  if (status === 'reopened') return <span className={`${base} border-violet-500/20 bg-violet-500/10 text-violet-300`}>Reopened</span>;
  return <span className={`${base} border-slate-700 bg-slate-950 text-slate-400`}>Draft</span>;
}

export default function AiGovernancePage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();
  const navigate = useNavigate();

  const [systems, setSystems] = useState<AiSystemProfile[]>([]);
  const [reviews, setReviews] = useState<AiGovernanceReview[]>([]);
  const [storageReady, setStorageReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<AiSystemDeclarationInput>(emptyDeclaration());
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const canEdit = canEditAiGovernance(currentOrg?.role);
  const canArchive = currentOrg?.role === 'owner' || currentOrg?.role === 'admin';

  useEffect(() => {
    let cancelled = false;
    setSystems([]);
    setReviews([]);
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
        const api = createAiGovernanceApi(async () => session!.access_token);
        try {
          const [nextSystems, nextReviews] = await Promise.all([
            api.listSystems(currentOrg!.id),
            api.listReviews(currentOrg!.id),
          ]);
          if (!cancelled) {
            setSystems(nextSystems);
            setReviews(nextReviews);
          }
        } catch (loadError) {
          if (loadError instanceof GuardApiError && loadError.code === 'AI_GOVERNANCE_STORAGE_NOT_READY') {
            if (!cancelled) setStorageReady(false);
          } else {
            throw loadError;
          }
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Failed to load AI Governance.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading, retry]);

  const latestReviewBySystem = useMemo(() => {
    const result: Record<string, AiGovernanceReview> = {};
    for (const review of reviews) {
      if (!result[review.aiSystemId]) result[review.aiSystemId] = review;
    }
    return result;
  }, [reviews]);

  function setDeclarationField<K extends keyof AiSystemDeclarationInput>(
    key: K,
    value: AiSystemDeclarationInput[K],
  ) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function setTriState(key: keyof AiSystemDeclarationInput['declarations'], value: AiGovernanceTriState) {
    setForm(current => ({
      ...current,
      declarations: { ...current.declarations, [key]: value },
    }));
  }

  function toggleUseCase(value: AiGovernanceUseCase) {
    setForm(current => ({
      ...current,
      useCases: current.useCases.includes(value)
        ? current.useCases.filter(item => item !== value)
        : [...current.useCases, value],
    }));
  }

  async function createSystem(event: FormEvent) {
    event.preventDefault();
    if (!session?.access_token || !currentOrg || !canEdit || !storageReady) return;
    setBusy('create-system');
    setError(null);
    try {
      const api = createAiGovernanceApi(async () => session.access_token);
      const created = await api.createSystem(currentOrg.id, {
        ...form,
        providerName: form.providerName?.trim() || null,
        modelName: form.modelName?.trim() || null,
      });
      setSystems(current => [created, ...current]);
      setForm(emptyDeclaration());
      setShowCreate(false);
    } catch (createError) {
      if (createError instanceof GuardApiError && createError.code === 'AI_GOVERNANCE_STORAGE_NOT_READY') {
        setStorageReady(false);
      } else {
        setError(createError instanceof Error ? createError.message : 'Failed to create AI System.');
      }
    } finally {
      setBusy(null);
    }
  }

  async function createReview(system: AiSystemProfile) {
    if (!session?.access_token || !currentOrg || !canEdit) return;
    setBusy(`review-${system.id}`);
    setError(null);
    try {
      const api = createAiGovernanceApi(async () => session.access_token);
      const review = await api.createReview(currentOrg.id, system.id);
      setReviews(current => [review, ...current]);
      navigate(`/app/ai-governance/reviews/${review.id}`);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Failed to create guided review.');
    } finally {
      setBusy(null);
    }
  }

  async function archiveSystem(system: AiSystemProfile) {
    if (!session?.access_token || !currentOrg || !canArchive) return;
    setBusy(`archive-${system.id}`);
    setError(null);
    try {
      const api = createAiGovernanceApi(async () => session.access_token);
      await api.archiveSystem(currentOrg.id, system.id);
      setSystems(current => current.filter(item => item.id !== system.id));
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Failed to archive AI System.');
    } finally {
      setBusy(null);
    }
  }

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading AI Governance...</div>;
  }

  if (!currentOrg) {
    return <div className="text-sm text-slate-500">Create or select a workspace before managing AI systems.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Govern</div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100">AI Governance</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Maintain a bounded AI-system inventory and create source-versioned guided reviews. GuardAI records declarations and documentation state; legal applicability remains a human-review decision.
          </p>
        </div>
        {canEdit && storageReady && (
          <button
            onClick={() => setShowCreate(value => !value)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCreate ? 'Cancel' : 'Add AI System'}
          </button>
        )}
      </div>

      <section className="flex gap-3 rounded-2xl border border-amber-500/15 bg-amber-500/[0.05] p-5">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div>
          <h2 className="font-semibold text-slate-200">Human legal review is mandatory</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            GuardAI does not classify an AI system as prohibited, high-risk, compliant, or legally out of scope from this workflow. Every guided-review item remains <span className="font-medium text-slate-300">requires human review</span>.
          </p>
        </div>
      </section>

      {!storageReady && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-6">
          <div className="flex gap-3">
            <Brain className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h2 className="font-semibold text-slate-100">AI Governance storage is not provisioned in this environment</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                GuardAI will not emulate AI-system or legal-review records in browser state. The tenant-safe AI Governance database drafts must be promoted through the dedicated staging migration process before records can be stored.
              </p>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div role="alert" className="flex items-start justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>{error}</span>
          <button onClick={() => setRetry(value => value + 1)} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-rose-500/10">
            <RefreshCw className="h-4 w-4" /> Reload
          </button>
        </div>
      )}

      {showCreate && canEdit && storageReady && (
        <form onSubmit={createSystem} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="font-semibold text-slate-100">AI System declaration</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">Store metadata and bounded declarations only. Do not paste prompts, customer content, model outputs, secrets or personal data here.</p>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-300">System name</span>
              <input required maxLength={160} value={form.systemName} onChange={event => setDeclarationField('systemName', event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200" placeholder="Customer Support Copilot" />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-300">Organization role</span>
              <select value={form.organizationRole} onChange={event => setDeclarationField('organizationRole', event.target.value as AiGovernanceOrganizationRole)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200">
                <option value="unknown">Unknown / needs review</option>
                <option value="provider">Provider</option>
                <option value="deployer">Deployer</option>
                <option value="both">Both</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-300">Provider</span>
              <input maxLength={160} value={form.providerName || ''} onChange={event => setDeclarationField('providerName', event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200" placeholder="OpenAI, internal, other…" />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-300">Model</span>
              <input maxLength={160} value={form.modelName || ''} onChange={event => setDeclarationField('modelName', event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200" placeholder="Model or system identifier" />
            </label>
            <label className="space-y-2 text-sm lg:col-span-2">
              <span className="font-medium text-slate-300">Deployment context</span>
              <select value={form.deploymentContext} onChange={event => setDeclarationField('deploymentContext', event.target.value as AiGovernanceDeploymentContext)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200">
                <option value="unknown">Unknown / needs review</option>
                <option value="internal">Internal</option>
                <option value="customer-facing">Customer-facing</option>
                <option value="embedded">Embedded in product/service</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-medium text-slate-300">Use cases</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {useCaseOptions.map(option => (
                <label key={option.value} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-400">
                  <input type="checkbox" checked={form.useCases.includes(option.value)} onChange={() => toggleUseCase(option.value)} />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="text-sm font-medium text-slate-300">Declarations</legend>
            <p className="mt-1 text-xs text-slate-600">These are organization declarations, not GuardAI verification.</p>
            <div className="mt-3 space-y-3">
              {declarationLabels.map(([key, label]) => (
                <div key={key} className="grid gap-2 rounded-lg border border-slate-800 bg-slate-950 p-3 sm:grid-cols-[1fr_12rem] sm:items-center">
                  <span className="text-sm text-slate-400">{label}</span>
                  <select value={form.declarations[key]} onChange={event => setTriState(key, event.target.value as AiGovernanceTriState)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300">
                    <option value="unknown">Unknown</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 flex justify-end border-t border-slate-800 pt-5">
            <button type="submit" disabled={busy !== null || !form.systemName.trim()} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50">
              {busy === 'create-system' ? 'Saving…' : 'Create AI System'}
            </button>
          </div>
        </form>
      )}

      {storageReady && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">AI Systems</h2>
              <p className="text-sm text-slate-500">Active inventory records in this workspace.</p>
            </div>
            <span className="text-sm text-slate-600">{systems.length} systems</span>
          </div>

          {systems.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
              <Brain className="mx-auto h-8 w-8 text-slate-600" />
              <h3 className="mt-4 font-medium text-slate-200">No AI systems recorded</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Create an inventory record before starting a guided governance review.</p>
            </div>
          ) : systems.map(system => {
            const review = latestReviewBySystem[system.id];
            return (
              <article key={system.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">{system.organizationRole}</span>
                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-400">{system.deploymentContext}</span>
                      {review && reviewBadge(review.status)}
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-slate-100">{system.systemName}</h3>
                    <div className="mt-2 text-sm text-slate-500">
                      {system.providerName || 'Provider not declared'}{system.modelName ? ` · ${system.modelName}` : ''}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {system.useCases.length > 0 ? system.useCases.map(useCase => (
                        <span key={useCase} className="rounded-md bg-slate-950 px-2 py-1 text-xs text-slate-500">{useCase}</span>
                      )) : <span className="text-xs text-slate-600">No use cases declared</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {review ? (
                      <button onClick={() => navigate(`/app/ai-governance/reviews/${review.id}`)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
                        <FileSearch className="h-4 w-4" /> Open review
                      </button>
                    ) : canEdit ? (
                      <button disabled={busy !== null} onClick={() => createReview(system)} className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/15 disabled:opacity-50">
                        <FileSearch className="h-4 w-4" /> {busy === `review-${system.id}` ? 'Creating…' : 'Start guided review'}
                      </button>
                    ) : null}
                    {canArchive && (
                      <button disabled={busy !== null} onClick={() => archiveSystem(system)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-500 hover:bg-slate-800 disabled:opacity-50">
                        <Archive className="h-4 w-4" /> Archive
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <div className="text-xs text-slate-600">Human interaction</div>
                    <div className="mt-1 text-sm text-slate-300">{system.declarations.interactsDirectlyWithPeople}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <div className="text-xs text-slate-600">Synthetic content</div>
                    <div className="mt-1 text-sm text-slate-300">{system.declarations.generatesSyntheticContent}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <div className="text-xs text-slate-600">Last updated</div>
                    <div className="mt-1 text-sm text-slate-300">{formatDate(system.updatedAt)}</div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
