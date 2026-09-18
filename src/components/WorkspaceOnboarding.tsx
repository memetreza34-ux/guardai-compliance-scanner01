import { useState } from 'react';
import { useWorkspace } from '../providers/WorkspaceProvider';
import { GuardApiError } from '../api/apiClient';
import type { WorkspaceApi } from '../api/workspaceApi';

interface WorkspaceOnboardingProps {
  api: WorkspaceApi;
}

function errorMessage(error: unknown): string {
  if (error instanceof GuardApiError) {
    return `${error.message} (${error.code})`;
  }
  if (error instanceof Error) return error.message;
  return 'Unbekannter Fehler.';
}

export default function WorkspaceOnboarding({ api }: WorkspaceOnboardingProps) {
  const { refreshOrganizations } = useWorkspace();
  const [organizationName, setOrganizationName] = useState('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api.createOrganization(organizationName);
      setOrganizationName('');
      await refreshOrganizations(created.id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          {error}
        </div>
      )}
      <section className="rounded-2xl border bg-card p-5">
        <form className="space-y-3" onSubmit={handleCreateOrganization}>
          <h2 className="font-semibold text-card-foreground">Workspace anlegen</h2>
          <p className="text-sm text-muted-foreground">Erstellen Sie Ihren ersten Workspace, um Website-Targets hinzuzufügen.</p>
          <input
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            placeholder="z. B. Muster GmbH"
            maxLength={160}
            required
            disabled={busy}
          />
          <button
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            type="submit"
            disabled={busy || !organizationName.trim()}
          >
            {busy ? 'Wird angelegt…' : 'Workspace anlegen'}
          </button>
        </form>
      </section>
    </div>
  );
}
