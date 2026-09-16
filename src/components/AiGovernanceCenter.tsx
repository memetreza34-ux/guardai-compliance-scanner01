import { useWorkspace } from '../providers/WorkspaceProvider';
import { useEffect, useState, type FormEvent } from 'react';
import { GuardApiError } from '../api/apiClient';
import type { AiGovernanceApi } from '../api/aiGovernanceApi';
import type { WorkspaceApi } from '../api/workspaceApi';
import {
  canEditAiGovernance,
  canReviewAiGovernance,
  type AiGovernanceDeclarations,
  type AiGovernanceReview,
  type AiGovernanceTriState,
  type AiGovernanceUseCase,
  type AiSystemDeclarationInput,
  type AiSystemProfile,
} from '../types/aiGovernance';

interface AiGovernanceCenterProps {
  aiGovernanceApi: AiGovernanceApi;
  workspaceApi: WorkspaceApi;
}

const DEFAULT_DECLARATIONS: AiGovernanceDeclarations = {
  interactsDirectlyWithPeople: 'unknown',
  generatesSyntheticContent: 'unknown',
  aiLiteracyMeasuresDocumented: 'unknown',
  humanOversightControlsDocumented: 'unknown',
  interactionDisclosureDocumented: 'unknown',
  syntheticContentDisclosureDocumented: 'unknown',
};

const USE_CASES: Array<{ id: AiGovernanceUseCase; label: string }> = [
  { id: 'content-generation', label: 'Content-Generierung' },
  { id: 'human-interaction', label: 'Direkte Interaktion mit Menschen' },
  { id: 'decision-support', label: 'Entscheidungsunterstützung' },
  { id: 'automated-action', label: 'Automatisierte Aktion' },
  { id: 'biometric-or-emotion', label: 'Biometrie / Emotion' },
  { id: 'other', label: 'Sonstiger Einsatz' },
];

const DECLARATION_FIELDS: Array<{ key: keyof AiGovernanceDeclarations; label: string }> = [
  { key: 'interactsDirectlyWithPeople', label: 'Direkte Interaktion mit Menschen?' },
  { key: 'generatesSyntheticContent', label: 'Erzeugt synthetische Inhalte?' },
  { key: 'aiLiteracyMeasuresDocumented', label: 'AI-Literacy-Maßnahmen dokumentiert?' },
  { key: 'humanOversightControlsDocumented', label: 'Menschliche Aufsicht dokumentiert?' },
  { key: 'interactionDisclosureDocumented', label: 'Transparenzpflicht (Interaktion) dokumentiert?' },
  { key: 'syntheticContentDisclosureDocumented', label: 'Transparenzpflicht (Inhalte) dokumentiert?' },
];

function readableError(error: unknown): string {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'Aktion fehlgeschlagen.';
}

export default function AiGovernanceCenter({ aiGovernanceApi }: AiGovernanceCenterProps) {
  const { currentOrg: selectedOrganization } = useWorkspace();
  const organizationId = selectedOrganization?.id || '';

  const [systems, setSystems] = useState<AiSystemProfile[]>([]);
  const [reviews, setReviews] = useState<AiGovernanceReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<AiGovernanceReview | null>(null);

  const [systemName, setSystemName] = useState('');
  const [providerName, setProviderName] = useState('');
  const [modelName, setModelName] = useState('');
  const [organizationRole, setOrganizationRole] = useState<AiSystemDeclarationInput['organizationRole']>('unknown');
  const [deploymentContext, setDeploymentContext] = useState<AiSystemDeclarationInput['deploymentContext']>('unknown');
  const [selectedUseCases, setSelectedUseCases] = useState<Set<AiGovernanceUseCase>>(new Set());
  const [declarations, setDeclarations] = useState<AiGovernanceDeclarations>(DEFAULT_DECLARATIONS);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSelectedReview(null);

    if (!organizationId) {
      setSystems([]);
      setReviews([]);
      return undefined;
    }

    Promise.all([
      aiGovernanceApi.listSystems(organizationId),
      aiGovernanceApi.listReviews(organizationId),
    ])
      .then(([nextSystems, nextReviews]) => {
        if (cancelled) return;
        setSystems(nextSystems);
        setReviews(nextReviews);
      })
      .catch((loadError) => {
        if (!cancelled) setError(readableError(loadError));
      });

    return () => {
      cancelled = true;
    };
  }, [aiGovernanceApi, organizationId]);

  async function reload() {
    if (!organizationId) return;
    const [nextSystems, nextReviews] = await Promise.all([
      aiGovernanceApi.listSystems(organizationId),
      aiGovernanceApi.listReviews(organizationId),
    ]);
    setSystems(nextSystems);
    setReviews(nextReviews);
  }

  function toggleUseCase(useCase: AiGovernanceUseCase) {
    setSelectedUseCases((current) => {
      const next = new Set(current);
      if (next.has(useCase)) {
        next.delete(useCase);
      } else {
        next.add(useCase);
      }
      return next;
    });
  }

  async function handleCreateSystem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;

    setBusy(true);
    setError(null);

    const input: AiSystemDeclarationInput = {
      systemName: systemName.trim(),
      providerName: providerName.trim() || null,
      modelName: modelName.trim() || null,
      organizationRole,
      deploymentContext,
      useCases: Array.from(selectedUseCases),
      declarations,
    };

    try {
      await aiGovernanceApi.createSystem(organizationId, input);
      setSystemName('');
      setProviderName('');
      setModelName('');
      setOrganizationRole('unknown');
      setDeploymentContext('unknown');
      setSelectedUseCases(new Set());
      setDeclarations(DEFAULT_DECLARATIONS);
      await reload();
    } catch (createError) {
      setError(readableError(createError));
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await reload();
    } catch (actionError) {
      setError(readableError(actionError));
    } finally {
      setBusy(false);
    }
  }

  async function handleArchiveSystem(systemId: string) {
    if (!organizationId) return;
    await runAction(async () => { await aiGovernanceApi.archiveSystem(organizationId, systemId) });
  }

  async function handleCreateReview(systemId: string) {
    if (!organizationId) return;
    await runAction(async () => { await aiGovernanceApi.createReview(organizationId, systemId) });
  }

  async function handleOpenReview(reviewId: string) {
    if (!organizationId) return;
    setBusy(true);
    setError(null);
    try {
      const review = await aiGovernanceApi.getReview(organizationId, reviewId);
      setSelectedReview(review);
    } catch (openError) {
      setError(readableError(openError));
    } finally {
      setBusy(false);
    }
  }

  async function handleTransitionReview(reviewId: string, action: 'submit' | 'review' | 'reopen') {
    if (!organizationId) return;
    setBusy(true);
    setError(null);
    try {
      const review = await aiGovernanceApi.transitionReview(organizationId, reviewId, action);
      setSelectedReview(review);
      await reload();
    } catch (transitionError) {
      setError(readableError(transitionError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          AI Governance & Compliance
        </div>
        <h2 className="text-2xl font-semibold">AI-System-Inventar & Assessment</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Deklarieren Sie genutzte oder bereitgestellte AI-Systeme und generieren Sie einen Guided Review. Der Review ist eine geführte Checkliste basierend auf der Systemdeklaration. GuardAI trifft hier keine automatisierten Rechtsurteile oder Risikoeinstufungen, sondern verlangt die Bestätigung durch den Menschen (requires_human_review).
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      )}

      {selectedOrganization && canEditAiGovernance(selectedOrganization.role) && (
        <form className="space-y-5 rounded-2xl border bg-card p-5" onSubmit={handleCreateSystem}>
          <div>
            <h3 className="font-semibold">AI-System deklarieren</h3>
            <p className="text-sm text-muted-foreground">Erfassen Sie ein neues System für das Inventar.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span>Systemname</span>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2"
                value={systemName}
                onChange={(event) => setSystemName(event.target.value)}
                required
                disabled={busy}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Provider (optional)</span>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2"
                value={providerName}
                onChange={(event) => setProviderName(event.target.value)}
                disabled={busy}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Modell (optional)</span>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2"
                value={modelName}
                onChange={(event) => setModelName(event.target.value)}
                disabled={busy}
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Rolle der Organisation</span>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2"
                value={organizationRole}
                onChange={(event) => setOrganizationRole(event.target.value as AiSystemDeclarationInput['organizationRole'])}
                disabled={busy}
              >
                <option value="unknown">Unklar</option>
                <option value="provider">Provider</option>
                <option value="deployer">Deployer</option>
                <option value="both">Beides</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Einsatzkontext</span>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2"
                value={deploymentContext}
                onChange={(event) => setDeploymentContext(event.target.value as AiSystemDeclarationInput['deploymentContext'])}
                disabled={busy}
              >
                <option value="unknown">Unklar</option>
                <option value="internal">Intern</option>
                <option value="customer-facing">Kundenkontakt</option>
                <option value="embedded">Eingebettet</option>
                <option value="other">Sonstiger</option>
              </select>
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Einsatzarten</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {USE_CASES.map((useCase) => (
                <label key={useCase.id} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedUseCases.has(useCase.id)}
                    onChange={() => toggleUseCase(useCase.id)}
                    disabled={busy}
                  />
                  <span>{useCase.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Strukturierte Angaben</legend>
            {DECLARATION_FIELDS.map((field) => (
              <label key={field.key} className="grid gap-2 rounded-lg border p-3 text-sm md:grid-cols-[1fr_180px] md:items-center">
                <span>{field.label}</span>
                <select
                  className="rounded-lg border bg-background px-3 py-2"
                  value={declarations[field.key]}
                  onChange={(event) => setDeclarations((current) => ({
                    ...current,
                    [field.key]: event.target.value as AiGovernanceTriState,
                  }))}
                  disabled={busy}
                >
                  <option value="unknown">Unklar</option>
                  <option value="yes">Ja</option>
                  <option value="no">Nein</option>
                </select>
              </label>
            ))}
          </fieldset>

          <button
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            type="submit"
            disabled={busy}
          >
            {busy ? 'Bitte warten…' : 'AI-System speichern'}
          </button>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border bg-card p-5">
          <div>
            <h3 className="font-semibold">AI-Systeme</h3>
            <p className="text-sm text-muted-foreground">Aktive strukturierte Deklarationen im Workspace.</p>
          </div>
          {systems.length === 0 && <p className="text-sm text-muted-foreground">Noch kein AI-System erfasst.</p>}
          {systems.map((system) => (
            <article key={system.id} className="space-y-3 rounded-xl border p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{system.systemName}</div>
                  <div className="text-xs text-muted-foreground">
                    {system.organizationRole} · {system.deploymentContext}
                  </div>
                </div>
                <span className="rounded-full border px-2 py-1 text-xs">Kein Rechtsstatus</span>
              </div>
              <div className="grid gap-1 text-xs text-muted-foreground">
                <span>Provider: {system.providerName ?? '—'}</span>
                <span>Modell: {system.modelName ?? '—'}</span>
                <span>Einsatzarten: {system.useCases.length > 0 ? system.useCases.join(', ') : '—'}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {canEditAiGovernance(selectedOrganization?.role) && (
                  <button
                    className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
                    type="button"
                    disabled={busy}
                    onClick={() => handleCreateReview(system.id)}
                  >
                    Guided Review erzeugen
                  </button>
                )}
                {canReviewAiGovernance(selectedOrganization?.role) && (
                  <button
                    className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive disabled:opacity-50"
                    type="button"
                    disabled={busy}
                    onClick={() => handleArchiveSystem(system.id)}
                  >
                    Archivieren
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="space-y-3 rounded-2xl border bg-card p-5">
          <div>
            <h3 className="font-semibold">Guided Reviews</h3>
            <p className="text-sm text-muted-foreground">Jeder Review friert die damalige Systemdeklaration und Quellen-Version ein.</p>
          </div>
          {reviews.length === 0 && <p className="text-sm text-muted-foreground">Noch kein Review vorhanden.</p>}
          {reviews.map((review) => (
            <article key={review.id} className="space-y-2 rounded-xl border p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{review.status}</span>
                <span className="rounded-full border px-2 py-1 text-xs">Menschliche Prüfung erforderlich</span>
              </div>
              <div className="text-xs text-muted-foreground">
                System Snapshot: {review.systemSnapshot.systemName}
              </div>
              <button
                className="w-full rounded-lg bg-muted px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                type="button"
                disabled={busy}
                onClick={() => handleOpenReview(review.id)}
              >
                Review öffnen
              </button>
            </article>
          ))}
        </div>
      </div>

      {selectedReview && (
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">Review-Details</h3>
              <p className="text-sm text-muted-foreground">
                Status: {selectedReview.status} · kein automatischer Rechtsentscheid · kein Compliance-Score
              </p>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs">requires_human_review</span>
          </div>

          {selectedReview.items?.map((item) => (
            <article key={item.itemKey} className="space-y-2 rounded-xl border p-4 text-sm">
              <div className="font-medium">{item.itemKey}</div>
              <div className="grid gap-1 text-xs text-muted-foreground">
                <span>Anwendbarkeit: menschlich zu prüfen</span>
                <span>Trigger: {item.trigger}</span>
              </div>
              {item.legalSource && (
                <div className="text-xs">
                  <span className="font-medium">Quelle: </span>
                  {item.legalSource.sourceUrl ? (
                    <a className="underline underline-offset-4" href={item.legalSource.sourceUrl} target="_blank" rel="noreferrer">
                      {item.legalSource.reference}
                    </a>
                  ) : item.legalSource.reference}
                </div>
              )}
            </article>
          ))}

          <div className="rounded-xl bg-muted p-4 text-xs text-muted-foreground">
            Snapshot: {selectedReview.systemSnapshot.systemName} · Rolle {selectedReview.systemSnapshot.organizationRole} · Einsatz {selectedReview.systemSnapshot.deploymentContext}. Die damalige Deklaration bleibt für diesen Review unverändert erhalten.
          </div>

          <div className="flex flex-wrap gap-2">
            {canEditAiGovernance(selectedOrganization?.role) && ['draft', 'reopened'].includes(selectedReview.status) && (
              <button
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                type="button"
                disabled={busy}
                onClick={() => handleTransitionReview(selectedReview.id, 'submit')}
              >
                Zur menschlichen Prüfung einreichen
              </button>
            )}
            {canReviewAiGovernance(selectedOrganization?.role) && selectedReview.status === 'submitted' && (
              <button
                className="rounded-lg border px-4 py-2 text-xs font-medium disabled:opacity-50"
                type="button"
                disabled={busy}
                onClick={() => handleTransitionReview(selectedReview.id, 'review')}
              >
                Als geprüft markieren
              </button>
            )}
            {canReviewAiGovernance(selectedOrganization?.role) && selectedReview.status === 'reviewed' && (
              <button
                className="rounded-lg border px-4 py-2 text-xs font-medium disabled:opacity-50"
                type="button"
                disabled={busy}
                onClick={() => handleTransitionReview(selectedReview.id, 'reopen')}
              >
                Review wieder öffnen
              </button>
            )}
          </div>
          
          <div className="grid gap-1 text-xs text-muted-foreground mt-4">
            {Object.entries(selectedReview.systemSnapshot.declarations).map(([key, value]) => (
               <div key={key}>{key}: {value as string}</div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
