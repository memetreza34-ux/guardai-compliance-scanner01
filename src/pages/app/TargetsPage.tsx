import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import { createWorkspaceApi } from '../../api/workspaceApi';
import type { WorkspaceTarget } from '../../types/workspace';
import { Target, CheckCircle2, Clock, XCircle, HelpCircle, RefreshCw } from 'lucide-react';
import { GuardApiError } from '../../api/apiClient';
import WorkspaceOnboarding from '../../components/WorkspaceOnboarding';
import { isCurrentTargetScope, isTargetInitialFailure, targetListScope, targetsBelongToOrganization } from '../../lib/targetViewScope';

function TargetStatusBadge({ state }: { state: WorkspaceTarget['verificationState'] }) {
  switch (state) {
    case 'verified':
      return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500 border border-emerald-500/20"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>;
    case 'pending':
      return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-500 border border-amber-500/20"><Clock className="w-3.5 h-3.5" /> Pending</span>;
    case 'failed':
      return <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-500 border border-rose-500/20"><XCircle className="w-3.5 h-3.5" /> Failed</span>;
    default:
      return <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-400 border border-slate-500/20"><HelpCircle className="w-3.5 h-3.5" /> Unverified</span>;
  }
}

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleDateString();
}

export default function TargetsPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading, error: orgError } = useWorkspace();
  const navigate = useNavigate();

  const [targets, setTargets] = useState<WorkspaceTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [targetUrl, setTargetUrl] = useState('');
  const [targetName, setTargetName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [retryCount, setRetryCount] = useState(0);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [failedScope, setFailedScope] = useState<string | null>(null);
  const scopeKey = targetListScope(session?.user.id, currentOrg?.id);
  const activeScopeRef = useRef<string | null>(scopeKey);
  const roleRef = useRef(currentOrg?.role);
  const createRequestRef = useRef(0);

  activeScopeRef.current = scopeKey;
  roleRef.current = currentOrg?.role;

  useEffect(() => {
    let cancelled = false;

    createRequestRef.current += 1;
    setCreating(false);
    setTargets([]);
    setLoadedScope(null);
    setFailedScope(null);
    setError(null);
    setCreateError(null);
    setTargetUrl('');
    setTargetName('');

    if (orgLoading) {
      setLoading(true);
      return;
    }

    if (!session?.access_token || !currentOrg) {
      setLoading(false);
      return;
    }

    async function loadTargets() {
      setLoading(true);
      setError(null);
      try {
        const api = createWorkspaceApi(async () => session!.access_token);
        const list = await api.listTargets(currentOrg!.id);
        if (!targetsBelongToOrganization(list, currentOrg!.id)) {
          throw new Error('Target list returned a different organization. No results were displayed.');
        }
        if (!cancelled) {
          setTargets(list);
          setLoadedScope(scopeKey);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setFailedScope(scopeKey);
          setError(err instanceof Error ? err.message : 'Failed to load targets.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTargets();

    return () => {
      cancelled = true;
    };
  }, [session, currentOrg, orgLoading, retryCount, scopeKey]);

  const hasCurrentData = isCurrentTargetScope(scopeKey, loadedScope);
  const initialFailed = isTargetInitialFailure(scopeKey, loadedScope, failedScope);

  if (orgLoading || (scopeKey && !hasCurrentData && !initialFailed)) {
    return <div role="status" className="animate-pulse flex items-center justify-center p-12 text-slate-400">Loading website targets...</div>;
  }

  if (orgError) {
    return <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-300">Workspace access could not be verified: {orgError}</div>;
  }

  if (!currentOrg) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Website Targets</h1>
          <p className="text-sm text-slate-400 mt-1">Create a workspace to manage and verify your website targets.</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-sm">
          {session?.access_token ? <WorkspaceOnboarding api={createWorkspaceApi(async () => session.access_token)} /> : <p className="text-slate-400">Loading auth...</p>}
        </div>
      </div>
    );
  }

  const canCreate = currentOrg.role === 'owner' || currentOrg.role === 'admin';

  async function handleCreateTarget(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !session || !canCreate || creating) return;

    const activeOrgId = currentOrg.id;
    const requestId = ++createRequestRef.current;
    const isCurrentRequest = () =>
      createRequestRef.current === requestId &&
      activeScopeRef.current === scopeKey &&
      (roleRef.current === 'owner' || roleRef.current === 'admin');

    setCreating(true);
    setCreateError(null);

    try {
      const api = createWorkspaceApi(async () => session.access_token);
      const newTarget = await api.createWebsiteTarget(activeOrgId, {
        url: targetUrl,
        displayName: targetName || undefined,
      });

      if (isCurrentRequest()) {
        navigate(`/app/targets/${newTarget.id}`);
      }
    } catch (err) {
      if (!isCurrentRequest()) return;

      if (err instanceof GuardApiError) {
        setCreateError(
          err.status === 429
            ? 'Too many target requests. Wait a moment before trying again.'
            : `${err.message} (${err.code})`,
        );
      } else {
        setCreateError(err instanceof Error ? err.message : 'Failed to create target.');
      }
    } finally {
      if (isCurrentRequest()) {
        setCreating(false);
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Website Targets</h1>
        <p className="text-sm text-slate-400 mt-1">Manage domain ownership verification for your organization.</p>
      </div>

      {canCreate && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-medium text-slate-200 mb-4">Add Website Target</h2>
          <form onSubmit={handleCreateTarget} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="target-url" className="sr-only">Website URL or domain</label>
              <input
                id="target-url"
                type="text"
                placeholder="example.com or https://example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                maxLength={2048}
                required
                disabled={creating}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="target-name" className="sr-only">Optional display name</label>
              <input
                id="target-name"
                type="text"
                placeholder="Optional display name"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                maxLength={200}
                disabled={creating}
              />
            </div>
            <button
              type="submit"
              disabled={creating || !targetUrl.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {creating ? 'Adding...' : 'Add Target'}
            </button>
          </form>
          {createError && <p role="alert" className="text-sm text-rose-500 mt-2">{createError}</p>}
        </section>
      )}

      {loading ? (
        <div role="status" className="animate-pulse flex items-center justify-center p-12 text-slate-400">Loading targets...</div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 flex items-center justify-between gap-4">
          <p className="text-sm text-destructive-foreground">{error}</p>
          <button
            onClick={() => setRetryCount(c => c + 1)}
            className="flex items-center gap-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/20 px-3 py-1.5 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {targets.length === 0 ? (
            <div className="p-12 text-center">
              <Target className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No website targets have been created in this organization yet. This is not a security assessment.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {targets.map(target => (
                <button
                  key={target.id}
                  onClick={() => navigate(`/app/targets/${target.id}`)}
                  className="w-full text-left p-4 hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-200 break-words">{target.displayName}</h3>
                    <p className="text-sm text-slate-500 mt-0.5 font-mono break-all">{target.canonicalUrl}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <TargetStatusBadge state={target.verificationState} />
                    <div className="text-xs text-slate-500 whitespace-nowrap">
                      Created {formatDate(target.createdAt)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
