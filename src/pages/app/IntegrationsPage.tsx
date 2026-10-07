import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Github, Link2, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { GuardApiError } from '../../api/apiClient';
import { createGitHubIntegrationApi } from '../../api/githubIntegrationApi';
import { createWorkspaceApi } from '../../api/workspaceApi';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { GitHubInstallation, GitHubRepositorySummary } from '../../types/githubIntegration';
import type { WorkspaceTarget } from '../../types/workspace';

function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString();
}

function readableError(error: unknown) {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'GitHub integration request failed.';
}

function repositoryIdFromTarget(target: WorkspaceTarget): number | null {
  if (target.type !== 'repository' || target.provider !== 'github') return null;
  const raw = target.verificationMetadata.githubRepositoryId;
  const value = typeof raw === 'number' ? raw : Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export default function IntegrationsPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();

  const [installation, setInstallation] = useState<GitHubInstallation | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepositorySummary[]>([]);
  const [targets, setTargets] = useState<WorkspaceTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [repoLoading, setRepoLoading] = useState(false);
  const [installBusy, setInstallBusy] = useState(false);
  const [importBusy, setImportBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const canManage = currentOrg?.role === 'owner' || currentOrg?.role === 'admin';

  useEffect(() => {
    let cancelled = false;
    setInstallation(null);
    setRepositories([]);
    setTargets([]);
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
        const githubApi = createGitHubIntegrationApi(async () => session!.access_token);
        const workspaceApi = createWorkspaceApi(async () => session!.access_token);
        const [status, workspaceTargets] = await Promise.all([
          githubApi.getStatus(currentOrg!.id),
          workspaceApi.listTargets(currentOrg!.id),
        ]);
        if (cancelled) return;
        setInstallation(status);
        setTargets(workspaceTargets);
      } catch (err) {
        if (!cancelled) setError(readableError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading, retry]);

  const importedRepositoryIds = useMemo(
    () => new Set(targets.map(repositoryIdFromTarget).filter((value): value is number => value !== null)),
    [targets],
  );

  async function startInstallation() {
    if (!session?.access_token || !currentOrg || !canManage || installBusy) return;
    setInstallBusy(true);
    setError(null);
    try {
      const api = createGitHubIntegrationApi(async () => session.access_token);
      const install = await api.startInstallation(currentOrg.id);
      window.location.assign(install.url);
    } catch (err) {
      setError(readableError(err));
      setInstallBusy(false);
    }
  }

  async function loadRepositories() {
    if (!session?.access_token || !currentOrg || installation?.status !== 'active' || repoLoading) return;
    setRepoLoading(true);
    setError(null);
    try {
      const api = createGitHubIntegrationApi(async () => session.access_token);
      setRepositories(await api.listRepositories(currentOrg.id));
    } catch (err) {
      setError(readableError(err));
    } finally {
      setRepoLoading(false);
    }
  }

  async function importRepository(repositoryId: number) {
    if (!session?.access_token || !currentOrg || !canManage || importBusy !== null) return;
    setImportBusy(repositoryId);
    setError(null);
    try {
      const api = createGitHubIntegrationApi(async () => session.access_token);
      const target = await api.createRepositoryTarget(currentOrg.id, repositoryId);
      setTargets(current => [...current.filter(item => item.id !== target.id), target]);
    } catch (err) {
      setError(readableError(err));
    } finally {
      setImportBusy(null);
    }
  }

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading integrations...</div>;
  }

  const active = installation?.status === 'active';

  return (
    <div className="mx-auto max-w-6xl space-y-7 animate-in fade-in duration-500">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Connect</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">Integrations</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Connect external systems as evidence and asset sources. GuardAI treats integration health separately from technical pass/fail state.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>{error}</span>
          <button onClick={() => setRetry(value => value + 1)} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-rose-500/10">
            <RefreshCw className="h-4 w-4" /> Reload
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950">
              <Github className="h-6 w-6 text-slate-200" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-100">GitHub</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Install the GuardAI GitHub App, inspect currently authorized repositories, and create verified repository Targets from that live authorization.
              </p>
            </div>
          </div>

          {active ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> Active
            </span>
          ) : installation ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300">
              <XCircle className="h-4 w-4" /> {installation.status}
            </span>
          ) : (
            <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-500">Not connected</span>
          )}
        </div>

        {installation && (
          <div className="mt-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><div className="text-xs text-slate-600">Account</div><div className="mt-1 text-slate-300">{installation.accountLogin}</div></div>
            <div><div className="text-xs text-slate-600">Account type</div><div className="mt-1 text-slate-300">{installation.accountType}</div></div>
            <div><div className="text-xs text-slate-600">Repository access</div><div className="mt-1 text-slate-300">{installation.repositorySelection || 'unknown'}</div></div>
            <div><div className="text-xs text-slate-600">Last synced</div><div className="mt-1 text-slate-300">{formatDate(installation.lastSyncedAt)}</div></div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {canManage && !active && (
            <button
              onClick={startInstallation}
              disabled={installBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" />
              {installBusy ? 'Opening GitHub…' : installation ? 'Reconnect GitHub App' : 'Connect GitHub App'}
            </button>
          )}
          {active && (
            <button
              onClick={loadRepositories}
              disabled={repoLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${repoLoading ? 'animate-spin' : ''}`} />
              {repositories.length > 0 ? 'Refresh repositories' : 'Load repositories'}
            </button>
          )}
        </div>

        {!canManage && (
          <p className="mt-4 text-xs text-slate-600">Your {currentOrg?.role || 'current'} role can inspect integration state but cannot install the GitHub App or create repository Targets.</p>
        )}
      </section>

      {installation && installation.status !== 'active' && (
        <div className="flex gap-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.05] p-4 text-sm leading-6 text-slate-400">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          This GitHub installation is not active. GuardAI must not treat missing repository data as healthy evidence while authorization is suspended or deleted.
        </div>
      )}

      {active && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Authorized repositories</h2>
            <p className="text-sm text-slate-500">The list is read from the current GitHub App installation, not from a cached marketing catalog.</p>
          </div>

          {repositories.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-sm text-slate-500">
              Load repositories to synchronize the current GitHub authorization.
            </div>
          ) : (
            <div className="space-y-3">
              {repositories.map(repository => {
                const imported = importedRepositoryIds.has(repository.id);
                const unusable = repository.disabled;
                return (
                  <article key={repository.id} className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-medium text-slate-100">{repository.fullName}</h3>
                        {repository.private && <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-500">private</span>}
                        {repository.archived && <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300">archived</span>}
                        {repository.disabled && <span className="rounded-full bg-rose-500/10 px-2 py-1 text-[10px] text-rose-300">disabled</span>}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">Default branch: {repository.defaultBranch || 'unknown'} · GitHub ID {repository.id}</div>
                    </div>

                    {imported ? (
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300"><CheckCircle2 className="h-4 w-4" /> GuardAI Target</span>
                    ) : canManage ? (
                      <button
                        onClick={() => importRepository(repository.id)}
                        disabled={unusable || importBusy !== null}
                        className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/15 disabled:opacity-50"
                      >
                        {importBusy === repository.id ? 'Adding…' : 'Add as Target'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-600">Admin required to add Target</span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs leading-5 text-slate-600">
        GitHub connection alone does not mean GuardAI has performed repository security analysis. Repository Targets represent current provider authorization; scanner coverage must be shown separately when repository scanning is enabled.
      </div>
    </div>
  );
}
