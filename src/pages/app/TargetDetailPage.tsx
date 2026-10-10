import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import { createScanIdempotencyKey, createWorkspaceApi } from '../../api/workspaceApi';
import type { WorkspaceTarget } from '../../types/workspace';
import { CheckCircle2, Clock, XCircle, ArrowLeft, Copy, Check, ShieldAlert, Play } from 'lucide-react';
import { GuardApiError } from '../../api/apiClient';
import { isCurrentTargetScope, isTargetInitialFailure, targetDetailScope } from '../../lib/targetViewScope';

interface ChallengeDetails {
  dnsRecordName: string;
  dnsRecordValue: string;
  expiresAt: string;
}

interface VerificationCheckResult {
  status: 'verified' | 'pending' | 'expired' | 'failed';
  verified: boolean;
  attemptCount?: number;
  expiresAt?: string;
  lastCheckedAt?: string;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString();
}

function verificationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof GuardApiError) {
    if (error.status === 429) {
      return 'Too many verification requests. Wait a moment before trying again. GuardAI will not retry aggressively.';
    }
    return `${error.message} (${error.code})`;
  }
  return error instanceof Error ? error.message : fallback;
}

export default function TargetDetailPage() {
  const { targetId } = useParams();
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading, error: orgError } = useWorkspace();
  const navigate = useNavigate();

  const [target, setTarget] = useState<WorkspaceTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [failedScope, setFailedScope] = useState<string | null>(null);
  const [loadRetry, setLoadRetry] = useState(0);
  const scopeKey = targetDetailScope(session?.user.id, currentOrg?.id, targetId);
  const hasCurrentData = isCurrentTargetScope(scopeKey, loadedScope);
  const initialFailed = isTargetInitialFailure(scopeKey, loadedScope, failedScope);

  const [challenge, setChallenge] = useState<ChallengeDetails | null>(null);
  const [checkResult, setCheckResult] = useState<VerificationCheckResult | null>(null);
  const [actionBusy, setActionBusy] = useState<'start' | 'check' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [copiedName, setCopiedName] = useState(false);
  const [copiedValue, setCopiedValue] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const contextRef = useRef({ scopeKey, role: currentOrg?.role });
  const actionRequestRef = useRef(0);
  const scanRequestRef = useRef(0);
  const copyRequestRef = useRef(0);

  contextRef.current = { scopeKey, role: currentOrg?.role };

  // Invalidate actions before a changed user, role or target can render stale results.
  useLayoutEffect(() => {
    actionRequestRef.current += 1;
    scanRequestRef.current += 1;
    copyRequestRef.current += 1;
    return () => {
      actionRequestRef.current += 1;
      scanRequestRef.current += 1;
      copyRequestRef.current += 1;
    };
  }, [scopeKey, currentOrg?.role, session?.access_token]);

  useEffect(() => {
    let cancelled = false;

    actionRequestRef.current += 1;
    scanRequestRef.current += 1;
    setActionBusy(null);
    setScanBusy(false);
    setScanError(null);
    setTarget(null);
    setLoadedScope(null);
    setFailedScope(null);
    setChallenge(null);
    setCheckResult(null);
    setError(null);
    setActionError(null);
    setCopyError(null);
    setCopiedName(false);
    setCopiedValue(false);

    if (orgLoading) {
      setLoading(true);
      return;
    }

    if (!session?.access_token || !currentOrg || !targetId) {
      setLoading(false);
      return;
    }

    async function loadTarget() {
      setLoading(true);
      setError(null);
      try {
        const api = createWorkspaceApi(async () => session!.access_token);
        const fetched = await api.getTarget(currentOrg!.id, targetId!);
        if (fetched.organizationId !== currentOrg!.id || fetched.id !== targetId) {
          throw new Error('Target API returned an unexpected organization or target ID.');
        }
        if (!cancelled) {
          setTarget(fetched);
          setLoadedScope(scopeKey);
        }
      } catch (err) {
        if (!cancelled) {
          setFailedScope(scopeKey);
          setError(err instanceof Error ? err.message : 'Failed to load target.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTarget();

    return () => {
      cancelled = true;
    };
  }, [session, currentOrg, targetId, orgLoading, scopeKey, loadRetry]);

  const isAdmin = currentOrg?.role === 'owner' || currentOrg?.role === 'admin';
  const canRunScans = currentOrg?.role === 'owner' || currentOrg?.role === 'admin' || currentOrg?.role === 'member';

  function createActionGuard(activeScope: string) {
    const requestId = ++actionRequestRef.current;
    return () =>
      actionRequestRef.current === requestId &&
      contextRef.current.scopeKey === activeScope &&
      (contextRef.current.role === 'owner' || contextRef.current.role === 'admin');
  }

  async function handleStartVerification() {
    if (!currentOrg || !session || !target || !scopeKey || !hasCurrentData || !isAdmin || actionBusy) return;

    const organizationId = currentOrg.id;
    const targetIdValue = target.id;
    const isCurrentAction = createActionGuard(scopeKey);

    setActionBusy('start');
    setActionError(null);
    setCopyError(null);
    setCheckResult(null);

    try {
      const api = createWorkspaceApi(async () => session.access_token);
      const res = await api.startTargetVerification(organizationId, targetIdValue);

      if (!isCurrentAction()) return;

      setTarget(prev => prev ? { ...prev, verificationState: 'pending' } : null);
      setChallenge({
        dnsRecordName: res.dnsRecordName,
        dnsRecordValue: res.dnsRecordValue,
        expiresAt: res.expiresAt,
      });
    } catch (err) {
      if (isCurrentAction()) {
        setActionError(verificationErrorMessage(err, 'Failed to start verification.'));
      }
    } finally {
      if (isCurrentAction()) {
        setActionBusy(null);
      }
    }
  }

  async function handleCheckVerification() {
    if (!currentOrg || !session || !target || !scopeKey || !hasCurrentData || !isAdmin || actionBusy) return;

    const organizationId = currentOrg.id;
    const targetIdValue = target.id;
    const isCurrentAction = createActionGuard(scopeKey);

    setActionBusy('check');
    setActionError(null);

    try {
      const api = createWorkspaceApi(async () => session.access_token);
      const res = await api.checkTargetVerification(organizationId, targetIdValue);

      if (!isCurrentAction()) return;

      setCheckResult({
        status: res.status,
        verified: res.verified,
        attemptCount: res.attemptCount,
        expiresAt: res.expiresAt,
        lastCheckedAt: res.lastCheckedAt,
      });

      const terminal = res.verified || res.status === 'failed' || res.status === 'expired';
      if (terminal) {
        const refreshed = await api.getTarget(organizationId, targetIdValue);
        if (!isCurrentAction()) return;
        if (refreshed.organizationId !== organizationId || refreshed.id !== targetIdValue) {
          throw new Error('Verification returned an unexpected target identity.');
        }

        setTarget(refreshed);
        setChallenge(null);

        if (res.verified) {
          setCheckResult(null);
        } else if (res.status === 'expired') {
          setActionError('This DNS challenge expired. Start a new challenge before checking again.');
        }
      }
    } catch (err) {
      if (isCurrentAction()) {
        setActionError(verificationErrorMessage(err, 'Failed to check DNS verification.'));
      }
    } finally {
      if (isCurrentAction()) {
        setActionBusy(null);
      }
    }
  }

  async function handleRunSecurityScan() {
    if (!currentOrg || !session || !target || !scopeKey || !hasCurrentData ||
        target.verificationState !== 'verified' || !canRunScans || scanBusy || actionBusy) return;

    const organizationId = currentOrg.id;
    const targetIdValue = target.id;
    const requestId = ++scanRequestRef.current;
    const isCurrentScanRequest = () =>
      scanRequestRef.current === requestId &&
      contextRef.current.scopeKey === scopeKey &&
      (contextRef.current.role === 'owner' || contextRef.current.role === 'admin' || contextRef.current.role === 'member');

    setScanBusy(true);
    setScanError(null);

    try {
      const api = createWorkspaceApi(async () => session.access_token);
      const submission = await api.submitScan(
        organizationId,
        targetIdValue,
        ['security'],
        createScanIdempotencyKey(),
      );

      if (isCurrentScanRequest()) {
        navigate(`/app/scans/${submission.scan.id}`);
      }
    } catch (err) {
      if (!isCurrentScanRequest()) return;

      if (err instanceof GuardApiError) {
        setScanError(
          err.status === 429
            ? 'Too many scan requests. Wait a moment before starting another scan.'
            : `${err.message} (${err.code})`,
        );
      } else {
        setScanError(err instanceof Error ? err.message : 'Failed to start technical scan.');
      }
    } finally {
      if (isCurrentScanRequest()) {
        setScanBusy(false);
      }
    }
  }

  async function copyToClipboard(text: string, type: 'name' | 'value') {
    if (!hasCurrentData || !scopeKey || !challenge) return;
    const requestId = ++copyRequestRef.current;
    const isCurrentCopy = () => copyRequestRef.current === requestId && contextRef.current.scopeKey === scopeKey;
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(text);
      if (!isCurrentCopy()) return;
      if (type === 'name') {
        setCopiedName(true);
        window.setTimeout(() => { if (isCurrentCopy()) setCopiedName(false); }, 2000);
      } else {
        setCopiedValue(true);
        window.setTimeout(() => { if (isCurrentCopy()) setCopiedValue(false); }, 2000);
      }
    } catch {
      if (isCurrentCopy()) setCopyError('Failed to copy to clipboard. Please select and copy manually.');
    }
  }

  if (loading || orgLoading || (scopeKey && !hasCurrentData && !initialFailed)) {
    return <div role="status" className="animate-pulse flex items-center justify-center p-12 text-slate-400">Loading target details...</div>;
  }

  if (orgError) {
    return <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-300">Workspace access could not be verified: {orgError}</div>;
  }

  if (!scopeKey) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
        Select a workspace and target before viewing ownership verification.
        <button type="button" onClick={() => navigate('/app/targets')} className="ml-3 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800">Back to targets</button>
      </div>
    );
  }

  if (!target || !hasCurrentData) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <button onClick={() => navigate('/app/targets')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Targets
        </button>
        <div role="alert" className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center flex flex-col items-center gap-4">
          <ShieldAlert className="w-8 h-8" />
          <div>
            <h2 className="text-lg font-semibold text-rose-500">Error</h2>
            <p>{error || 'Target not found or unavailable to this workspace.'}</p>
            <button type="button" onClick={() => setLoadRetry(value => value + 1)} className="mt-3 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800">Retry target request</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <button onClick={() => navigate('/app/targets')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Targets
      </button>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 sm:p-8 border-b border-slate-800/60 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">{target.displayName}</h1>
            <p className="text-slate-400 font-mono mt-1 break-all">{target.canonicalUrl}</p>
          </div>
          <div className="flex-shrink-0">
            {target.verificationState === 'verified' && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-500 border border-emerald-500/20"><CheckCircle2 className="w-4 h-4" /> Domain ownership verified</span>
            )}
            {target.verificationState === 'pending' && (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-500 border border-amber-500/20"><Clock className="w-4 h-4" /> Verification Pending</span>
            )}
            {target.verificationState === 'failed' && (
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-500 border border-rose-500/20"><XCircle className="w-4 h-4" /> Verification Failed</span>
            )}
            {target.verificationState === 'unverified' && (
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-500/10 px-3 py-1.5 text-sm font-medium text-slate-400 border border-slate-500/20">Unverified</span>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8 grid sm:grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-slate-500 mb-1">Target Type</div>
            <div className="text-slate-200 uppercase tracking-wider text-xs font-semibold">{target.type}</div>
          </div>
          <div>
            <div className="text-slate-500 mb-1">Created At</div>
            <div className="text-slate-200">{formatDate(target.createdAt)}</div>
          </div>
          <div>
            <div className="text-slate-500 mb-1">Last Updated</div>
            <div className="text-slate-200">{formatDate(target.updatedAt)}</div>
          </div>
        </div>
      </div>

      {actionError && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          {actionError}
        </div>
      )}

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-medium text-slate-200">DNS Ownership Verification</h2>

        {target.verificationState === 'verified' ? (
          <div className="text-sm text-slate-400">
            <p>GuardAI has successfully verified domain control. The target is now ready for technical scanning.</p>
            <p className="mt-2 text-xs italic opacity-80">This proves ownership only. It does not certify the website as secure or legally compliant.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Prove domain control by publishing a DNS TXT record. This is required before running technical scans.
            </p>

            {target.verificationState === 'pending' && !challenge && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-500/90">
                A verification challenge is pending, but its one-time DNS value is no longer available in this browser session. Start a new challenge to receive a new value.
              </div>
            )}

            {challenge && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="text-sm font-medium text-slate-200">Publish this TXT Record</div>

                {copyError && (
                  <div className="text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2 rounded-md">
                    {copyError}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Record Name</label>
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                      <code className="flex-1 text-slate-300 text-xs overflow-x-auto">{challenge.dnsRecordName}</code>
                      <button
                        onClick={() => copyToClipboard(challenge.dnsRecordName, 'name')}
                        className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                        aria-label="Copy record name"
                      >
                        {copiedName ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Record Value</label>
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                      <code className="flex-1 text-slate-300 text-xs overflow-x-auto">{challenge.dnsRecordValue}</code>
                      <button
                        onClick={() => copyToClipboard(challenge.dnsRecordValue, 'value')}
                        className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                        aria-label="Copy record value"
                      >
                        {copiedValue ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Expires at: {formatDate(challenge.expiresAt)}.<br />
                  <span className="text-amber-500/80">Keep this tab open. For security reasons, the record value cannot be retrieved again if you leave this page.</span>
                </p>
              </div>
            )}

            {checkResult && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mt-4 text-sm text-slate-300">
                <div className="font-medium mb-2 text-slate-200">Check Results</div>
                <div className="space-y-1">
                  <div><span className="text-slate-500">Status:</span> {checkResult.status}</div>
                  {checkResult.attemptCount !== undefined && (
                    <div><span className="text-slate-500">Attempts:</span> {checkResult.attemptCount}</div>
                  )}
                  {checkResult.lastCheckedAt && (
                    <div><span className="text-slate-500">Last checked:</span> {formatDate(checkResult.lastCheckedAt)}</div>
                  )}
                  {checkResult.expiresAt && (
                    <div><span className="text-slate-500">Challenge expires:</span> {formatDate(checkResult.expiresAt)}</div>
                  )}
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="flex flex-wrap gap-3 pt-2">
                {(target.verificationState === 'unverified' || target.verificationState === 'failed' || (target.verificationState === 'pending' && !challenge)) && (
                  <button
                    onClick={handleStartVerification}
                    disabled={actionBusy !== null || scanBusy}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700 disabled:opacity-50"
                  >
                    {actionBusy === 'start' ? 'Starting...' : target.verificationState === 'unverified' ? 'Start Verification' : 'Start New Challenge'}
                  </button>
                )}

                {target.verificationState === 'pending' && (
                  <button
                    onClick={handleCheckVerification}
                    disabled={actionBusy !== null || scanBusy}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {actionBusy === 'check' ? 'Checking DNS...' : 'Check DNS Verification'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {target.verificationState === 'verified' && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Available scanner</div>
            <h2 className="mt-2 text-lg font-medium text-slate-200">Website security baseline</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Run the persistent security worker against this verified website. GuardAI stores the execution, detector provenance,
              evidence and resulting findings. This is a bounded automated technical screening, not a penetration test or compliance certification.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
            <div><span className="text-slate-500">Module:</span> security</div>
            <div className="mt-1"><span className="text-slate-500">Current scope:</span> observed HTTP response, security headers and supported document-level checks.</div>
          </div>

          {scanError && (
            <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
              {scanError}
            </div>
          )}

          {canRunScans ? (
            <button
              onClick={handleRunSecurityScan}
              disabled={scanBusy || actionBusy !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {scanBusy ? 'Starting scan...' : 'Run technical scan'}
            </button>
          ) : (
            <p className="text-sm text-slate-500">Your Viewer role can inspect scan results but cannot start new scans.</p>
          )}
        </section>
      )}
    </div>
  );
}
