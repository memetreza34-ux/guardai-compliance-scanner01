import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Github, ShieldAlert } from 'lucide-react';
import { GuardApiError } from '../api/apiClient';
import { completeGitHubInstallation } from '../api/githubIntegrationApi';
import type { GitHubInstallationCompletion } from '../types/githubIntegration';

function readableError(error: unknown): string {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'GitHub installation could not be completed.';
}

export default function GitHubIntegrationCallbackPage() {
  const [result, setResult] = useState<GitHubInstallationCompletion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const state = params.get('state');
    const installationId = params.get('installation_id');
    if (!state || !installationId) {
      setError('GitHub callback is missing the required installation data.');
      return undefined;
    }

    completeGitHubInstallation(state, installationId)
      .then((next) => {
        if (!cancelled) setResult(next);
      })
      .catch((callbackError) => {
        if (!cancelled) setError(readableError(callbackError));
      })
      .finally(() => {
        if (!cancelled) window.history.replaceState({}, '', '/integrations/github/callback');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950">
          <Github className="h-6 w-6 text-slate-200" />
        </div>

        {error ? (
          <>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-rose-300"><ShieldAlert className="h-4 w-4" /> Connection failed</div>
            <h1 className="mt-3 text-3xl font-semibold">GitHub installation was not completed</h1>
            <div role="alert" className="mt-5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>
          </>
        ) : result ? (
          <>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Provider verified</div>
            <h1 className="mt-3 text-3xl font-semibold">GitHub App connected</h1>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Account: {result.accountLogin} · Status: {result.status} · Repository access: {result.repositorySelection || 'unknown'}.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Connecting GitHub does not automatically mean repository security checks have run. Authorized repositories can now be selected as GuardAI Targets.
            </p>
          </>
        ) : (
          <>
            <div className="mt-6 text-sm font-semibold text-indigo-300">Verifying installation</div>
            <h1 className="mt-3 text-3xl font-semibold">GuardAI is verifying GitHub</h1>
            <p className="mt-4 text-sm leading-6 text-slate-500">The one-time installation state is being consumed and the provider installation is being read back from GitHub.</p>
          </>
        )}

        <Link
          to="/app/integrations"
          className="mt-7 inline-flex rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
        >
          Open Integrations
        </Link>
      </div>
    </main>
  );
}
