import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock3,
  Plus, RefreshCw, ShieldAlert, ShieldCheck, Target,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import { createWorkspaceApi } from '../../api/workspaceApi';
import { createFindingApi } from '../../api/findingApi';
import type { PersistentScan, WorkspaceTarget } from '../../types/workspace';
import type { WorkspaceFindingSummary } from '../../types/findingLifecycle';
import WorkspaceOnboarding from '../../components/WorkspaceOnboarding';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Request failed.';
}

function displayDate(value?: string | null): string {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString();
}

function Step({ number, title, description, state }: {
  number: number;
  title: string;
  description: string;
  state: 'complete' | 'current' | 'pending' | 'unknown';
}) {
  const border = state === 'current' ? 'border-indigo-500/30 bg-indigo-500/[0.07]' : 'border-slate-800 bg-slate-900';
  return (
    <div className={`rounded-2xl border p-5 ${border}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-semibold text-indigo-300">0{number}</span>
        {state === 'complete' ? <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          : state === 'current' ? <span className="rounded-full bg-indigo-500/15 px-2 py-1 text-xs text-indigo-300">Next</span>
          : <span className="text-xs text-slate-600">{state === 'unknown' ? 'Unknown' : 'Later'}</span>}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-xs leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { session } = useAuth();
  const { organizations, currentOrg, isLoading: orgLoading, error: orgError } = useWorkspace();
  const navigate = useNavigate();

  const [targets, setTargets] = useState<WorkspaceTarget[]>([]);
  const [findings, setFindings] = useState<WorkspaceFindingSummary[]>([]);
  const [scans, setScans] = useState<PersistentScan[]>([]);
  const [hasNextFindings, setHasNextFindings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [targetsError, setTargetsError] = useState<string | null>(null);
  const [findingsError, setFindingsError] = useState<string | null>(null);
  const [scansError, setScansError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setTargets([]);
    setFindings([]);
    setScans([]);
    setHasNextFindings(false);
    setTargetsError(null);
    setFindingsError(null);
    setScansError(null);

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
      const token = session!.access_token;
      const orgId = currentOrg!.id;
      const workspaceApi = createWorkspaceApi(async () => token);
      const findingApi = createFindingApi(async () => token);
      const [targetResult, findingResult, scanResult] = await Promise.allSettled([
        workspaceApi.listTargets(orgId),
        findingApi.listFindings(orgId, { limit: 50, status: 'open' }),
        workspaceApi.listScans(orgId, 25),
      ]);
      if (cancelled) return;
      if (targetResult.status === 'fulfilled') setTargets(targetResult.value);
      else setTargetsError(errorText(targetResult.reason));

      if (findingResult.status === 'fulfilled') {
        setFindings(findingResult.value.findings);
        setHasNextFindings(!!findingResult.value.nextCursor);
      } else setFindingsError(errorText(findingResult.reason));

      if (scanResult.status === 'fulfilled') setScans(scanResult.value.scans);
      else setScansError(errorText(scanResult.reason));

      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading, retry]);

  if (orgLoading || loading) {
    return <div role="status" className="flex items-center justify-center p-12 text-slate-400">Loading technical posture...</div>;
  }

  if (orgError) {
    return <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-300">
      Workspace access cannot be verified: {orgError}
    </div>;
  }

  if (!currentOrg || organizations.length === 0) {
    return <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">Getting started</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">Welcome to GuardAI</h1>
        <p className="mt-2 text-sm text-slate-400">Create your organization before adding an authorized target.</p>
      </div>
      {session?.access_token && <WorkspaceOnboarding api={createWorkspaceApi(async () => session.access_token)} />}
    </div>;
  }

  const websites = targets.filter(target => target.type === 'website');
  const verifiedWebsites = websites.filter(target => target.verificationState === 'verified');
  const needsVerification = websites.find(target => target.verificationState !== 'verified');
  const canCreateTarget = currentOrg.role === 'owner' || currentOrg.role === 'admin';
  const canScan = canCreateTarget || currentOrg.role === 'member';
  const reviewedScan = scans.find(scan => scan.status === 'completed');
  const recentScan = scans[0];
  const criticalCount = findings.filter(finding => finding.severity === 'critical').length;
  const currentStep = targetsError ? 'unavailable'
    : websites.length === 0 ? 'add'
    : verifiedWebsites.length === 0 ? 'verify'
    : 'scan';
  const actionTarget = verifiedWebsites[0] ?? needsVerification;
  const actionPath = currentStep === 'add' ? '/app/targets'
    : actionTarget ? `/app/targets/${actionTarget.id}` : '/app/targets';
  const actionLabel = currentStep === 'add' ? 'Add website target'
    : currentStep === 'verify' ? 'Verify domain ownership'
    : 'Open verified target';

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">Overview</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-100">Technical Posture</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Evidence-first overview for {currentOrg.name}. Unknown or incomplete evidence is never a pass.
          </p>
        </div>
        <button type="button" onClick={() => setRetry(value => value + 1)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </header>

      {targetsError && <section role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5">
        <div className="flex items-start gap-3 text-sm text-rose-300">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h2 className="font-semibold">Targets could not be loaded</h2>
            <p className="mt-2 text-rose-200/80">{targetsError}</p>
            <p className="mt-2 text-xs">Target counts and onboarding status are unavailable; GuardAI will not display them as zero.</p>
          </div>
        </div>
      </section>}

      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-400"><Target className="h-4 w-4" /> Verified websites</div>
          <div className="mt-4 text-3xl font-semibold tabular-nums text-slate-100">{targetsError ? 'Unknown' : verifiedWebsites.length}</div>
          <p className="mt-2 text-xs text-slate-600">{targetsError ? 'Target data unavailable' : `From ${websites.length} website target(s). DNS ownership only.`}</p>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-400"><ShieldCheck className="h-4 w-4" /> Open finding records</div>
          <div className="mt-4 text-3xl font-semibold tabular-nums text-slate-100">{findingsError ? 'Unknown' : `${findings.length}${hasNextFindings ? '+' : ''}`}</div>
          <p className="mt-2 text-xs text-slate-600">{findingsError ? 'Finding API unavailable' : hasNextFindings ? 'More pages exist; shown count is a lower bound.' : 'Persisted records, not a security guarantee.'}</p>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-400"><AlertTriangle className="h-4 w-4" /> Critical records</div>
          <div className="mt-4 text-3xl font-semibold tabular-nums text-slate-100">{findingsError ? 'Unknown' : `${criticalCount}${hasNextFindings ? '+' : ''}`}</div>
          <p className="mt-2 text-xs text-slate-600">{findingsError ? 'Severity data unavailable' : hasNextFindings ? 'At least this many among loaded records.' : 'Derived only from recorded finding severities.'}</p>
        </section>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Your technical security workflow</h2>
          <p className="mt-1 text-sm text-slate-500">Steps reflect actual GuardAI records, not simulated progress.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Step number={1} title="Add website" description="Register a website target in your workspace."
            state={targetsError ? 'unknown' : websites.length ? 'complete' : 'current'} />
          <Step number={2} title="Prove domain control" description="Verify ownership through a DNS TXT challenge."
            state={targetsError ? 'unknown' : verifiedWebsites.length ? 'complete' : websites.length ? 'current' : 'pending'} />
          <Step number={3} title="Execute a security scan" description="Open a verified website and submit real technical checks."
            state={targetsError || scansError ? 'unknown'
              : verifiedWebsites.length === 0 ? 'pending'
              : reviewedScan ? 'complete' : 'current'} />
        </div>

        {!targetsError && <div className="flex flex-col justify-between gap-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.05] p-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold text-slate-100">
              {currentStep === 'add' ? 'Start with a website you control.'
                : currentStep === 'verify' ? 'Your website needs ownership verification.'
                : reviewedScan ? 'Continue with verified technical evidence.'
                : 'Your website is verified and ready for scanning.'}
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-400">
              {currentStep === 'add' ? 'Admin or Owner can register a website before any automated scan.'
                : currentStep === 'verify' ? 'Only verified website targets can be scanned. Verification is not proof of security.'
                : 'Open a verified target to run a security scan, then review its stored evidence and findings.'}
            </p>
          </div>
          {((currentStep === 'add' && canCreateTarget) || (currentStep === 'verify' && canCreateTarget)
            || (currentStep === 'scan' && canScan)) ? <button type="button" onClick={() => navigate(actionPath)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400">
              {currentStep === 'add' && <Plus className="h-4 w-4" />}
              {actionLabel} <ArrowRight className="h-4 w-4" />
            </button> : <span className="text-xs text-slate-500">Your role cannot perform this step. Ask an Organization Admin or Owner.</span>}
        </div>}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2 font-semibold text-slate-200"><Activity className="h-4 w-4 text-indigo-300" /> Recent scans</div>
            <button onClick={() => navigate('/app/scans')} className="text-xs text-indigo-300 hover:text-indigo-200">View all</button>
          </div>
          {scansError ? <div role="alert" className="p-5 text-sm text-amber-300">Scan history is unavailable: {scansError}</div>
            : scans.length === 0 ? <div className="p-6 text-sm leading-6 text-slate-500">
              No scan executions returned. This is not a security result.
            </div> : <div className="divide-y divide-slate-800">
              {scans.slice(0, 4).map(scan => <button key={scan.id} onClick={() => navigate(`/app/scans/${scan.id}`)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-slate-800/40">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-200">{scan.targetSnapshot?.displayName || scan.targetId}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" /> {displayDate(scan.createdAt)}</div>
                </div>
                <span className="shrink-0 rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400">{scan.status}</span>
              </button>)}
            </div>}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2 font-semibold text-slate-200"><ShieldAlert className="h-4 w-4 text-indigo-300" /> Open findings</div>
            <button onClick={() => navigate('/app/findings')} className="text-xs text-indigo-300 hover:text-indigo-200">View all</button>
          </div>
          {findingsError ? <div role="alert" className="p-5 text-sm text-amber-300">
            Finding records are unavailable: {findingsError}
          </div> : findings.length === 0 ? <div className="p-6 text-sm leading-6 text-slate-500">
            No open finding records returned. Missing findings do not establish a secure target; check scan coverage and evidence.
          </div> : <div className="divide-y divide-slate-800">
            {findings.slice(0, 4).map(finding => <div key={finding.id} className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-200">{finding.ruleTitle || finding.ruleId || 'Technical finding'}</div>
                <div className="mt-1 text-xs text-slate-500">{finding.status.replaceAll('_', ' ')} · {displayDate(finding.lastSeenAt)}</div>
              </div>
              <span className="shrink-0 rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400">{finding.severity || 'unknown'}</span>
            </div>)}
          </div>}
        </section>
      </div>

      <p className="text-xs leading-5 text-slate-600">
        A verified DNS target only proves control. A completed scan only proves that the requested checks executed.
        GuardAI does not infer full security, compliance or zero vulnerabilities from missing data.
      </p>
    </div>
  );
}
