import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import { createWorkspaceApi } from '../../api/workspaceApi';
import type { WorkspaceTarget, TargetVerificationChallenge } from '../../types/workspace';
import { GuardApiError } from '../../api/apiClient';
import { ShieldAlert, CheckCircle2, Clock, XCircle, ArrowLeft, Copy, Check } from 'lucide-react';

function formatDate(dateString: string) {
  const d = new Date(dateString);
  return Number.isNaN(d.getTime()) ? dateString : d.toLocaleString();
}

export default function TargetDetailPage() {
  const { targetId } = useParams<{ targetId: string }>();
  const { session } = useAuth();
  const { currentOrg } = useWorkspace();
  const navigate = useNavigate();

  const [target, setTarget] = useState<WorkspaceTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [challenge, setChallenge] = useState<TargetVerificationChallenge | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedName, setCopiedName] = useState(false);
  const [copiedValue, setCopiedValue] = useState(false);

  useEffect(() => {
    let cancelled = false;
    
    if (!session?.access_token || !currentOrg || !targetId) {
      setLoading(false);
      return;
    }

    async function loadTarget() {
      setLoading(true);
      setError(null);
      setChallenge(null);
      try {
        const api = createWorkspaceApi(async () => session!.access_token);
        const data = await api.getTarget(currentOrg!.id, targetId!);
        if (!cancelled) setTarget(data);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof GuardApiError && err.status === 404) {
            setError('Target not found or access denied.');
          } else {
            setError(err instanceof Error ? err.message : 'Error loading target details.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTarget();

    return () => {
      cancelled = true;
    };
  }, [session, currentOrg, targetId]);

  const isAdmin = currentOrg?.role === 'owner' || currentOrg?.role === 'admin';

  async function handleStartVerification() {
    if (!currentOrg || !targetId || !session) return;
    
    setActionBusy('start');
    setActionError(null);
    try {
      const api = createWorkspaceApi(async () => session.access_token);
      const newChallenge = await api.startTargetVerification(currentOrg.id, targetId);
      setChallenge(newChallenge);
      
      const refreshedTarget = await api.getTarget(currentOrg.id, targetId);
      setTarget(refreshedTarget);
    } catch (err) {
      if (err instanceof GuardApiError) {
        if (err.status === 429) {
          setActionError('Verification checks are temporarily rate limited. Please wait.');
        } else {
          setActionError(`${err.message} (${err.code})`);
        }
      } else {
        setActionError(err instanceof Error ? err.message : 'Failed to start verification.');
      }
    } finally {
      setActionBusy(null);
    }
  }

  async function handleCheckVerification() {
    if (!currentOrg || !targetId || !session) return;
    
    setActionBusy('check');
    setActionError(null);
    try {
      const api = createWorkspaceApi(async () => session.access_token);
      await api.checkTargetVerification(currentOrg.id, targetId);
      
      const refreshedTarget = await api.getTarget(currentOrg.id, targetId);
      setTarget(refreshedTarget);
    } catch (err) {
      if (err instanceof GuardApiError) {
        if (err.status === 429) {
          setActionError('Verification checks are temporarily rate limited. Please wait.');
        } else {
          setActionError(`${err.message} (${err.code})`);
        }
      } else {
        setActionError(err instanceof Error ? err.message : 'Failed to check verification.');
      }
    } finally {
      setActionBusy(null);
    }
  }

  const copyToClipboard = async (text: string, type: 'name' | 'value') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'name') {
        setCopiedName(true);
        setTimeout(() => setCopiedName(false), 2000);
      } else {
        setCopiedValue(true);
        setTimeout(() => setCopiedValue(false), 2000);
      }
    } catch {
      // Ignore
    }
  };

  if (loading) {
    return <div className="animate-pulse flex items-center justify-center p-12 text-slate-400">Loading target details...</div>;
  }

  if (error || !target) {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
        <button onClick={() => navigate('/app/targets')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Targets
        </button>
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-6 rounded-xl flex items-center gap-4">
          <ShieldAlert className="w-8 h-8" />
          <div>
            <h2 className="text-lg font-semibold text-rose-500">Error</h2>
            <p>{error || 'Target not found'}</p>
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

      {/* Verification Actions */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-medium text-slate-200">DNS Ownership Verification</h2>
        
        {target.verificationState === 'verified' ? (
          <div className="text-sm text-slate-400">
            <p>GuardAI has successfully verified domain control. The target is now ready for technical scanning.</p>
            <p className="mt-2 text-xs italic opacity-80">Note: This only proves ownership. It does not certify the website as secure or legally compliant.</p>
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
                  Expires at: {formatDate(challenge.expiresAt)}.<br/>
                  <span className="text-amber-500/80">Keep this tab open. For security reasons, the record value cannot be retrieved again if you leave this page.</span>
                </p>
              </div>
            )}

            {isAdmin && (
              <div className="flex flex-wrap gap-3 pt-2">
                {(target.verificationState === 'unverified' || target.verificationState === 'failed' || (target.verificationState === 'pending' && !challenge)) && (
                  <button
                    onClick={handleStartVerification}
                    disabled={actionBusy !== null}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700 disabled:opacity-50"
                  >
                    {actionBusy === 'start' ? 'Starting...' : target.verificationState === 'unverified' ? 'Start Verification' : 'Start New Challenge'}
                  </button>
                )}
                
                {target.verificationState === 'pending' && (
                  <button
                    onClick={handleCheckVerification}
                    disabled={actionBusy !== null}
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
    </div>
  );
}
