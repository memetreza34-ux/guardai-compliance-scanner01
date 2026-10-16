import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock3,
  Plus, AktualisierenCw, ShieldAlert, ShieldCheck, Target,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import { createWorkspaceApi } from '../../api/workspaceApi';
import { createFindingApi } from '../../api/findingApi';
import type { PersistentScan, WorkspaceTarget } from '../../types/workspace';
import type { WorkspaceFindingSummary } from '../../types/findingLifecycle';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Anfrage fehlgeschlagen.';
}

function displayDate(value?: string | null): string {
  if (!value) return 'Nicht verfügbar';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Nicht verfügbar' : date.toLocaleString('de-DE');
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
          : state === 'current' ? <span className="rounded-full bg-indigo-500/15 px-2 py-1 text-xs text-indigo-300">Jetzt</span>
          : <span className="text-xs text-slate-600">{state === 'unknown' ? 'Unbekannt' : 'Später'}</span>}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-xs leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading, error: orgError } = useWorkspace();
  const navigate = useNavigate();

  const [targets, setTargets] = useState<WorkspaceTarget[]>([]);
  const [findings, setFindings] = useState<WorkspaceFindingSummary[]>([]);
  const [scans, setScans] = useState<PersistentScan[]>([]);
  const [hasJetztFindings, setHasJetztFindings] = useState(false);
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
    setHasJetztFindings(false);
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
      if (targetResult.status === 'fulfilled') {
        if (targetResult.value.every(target => target.organizationId === orgId)) {
          setTargets(targetResult.value);
        } else {
          setTargetsError('Die Website-Antwort enthält Daten eines anderen Workspaces.');
        }
      } else setTargetsError(errorText(targetResult.reason));

      if (findingResult.status === 'fulfilled') {
        if (findingResult.value.findings.every(finding => finding.organizationId === orgId)) {
          setFindings(findingResult.value.findings);
          setHasJetztFindings(!!findingResult.value.nextCursor);
        } else {
          setFindingsError('Die Findings-Antwort enthält Daten eines anderen Workspaces.');
        }
      } else setFindingsError(errorText(findingResult.reason));

      if (scanResult.status === 'fulfilled') {
        if (scanResult.value.scans.every(scan => scan.organizationId === orgId)) {
          setScans(scanResult.value.scans);
        } else {
          setScansError('Die Scan-Antwort enthält Daten eines anderen Workspaces.');
        }
      } else setScansError(errorText(scanResult.reason));

      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading, retry]);

  if (orgLoading || loading) {
    return <div role="status" className="flex items-center justify-center p-12 text-slate-400">Sicherheitsübersicht wird geladen…</div>;
  }

  if (orgError) {
    return <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-300">
      Workspace-Berechtigungen konnten nicht geprüft werden: {orgError}
    </div>;
  }

  // The route-level AppWorkspaceGate handles organization creation and auth failures.
  if (!currentOrg) return null;

  const websites = targets.filter(target => target.type === 'website');
  const verifiedWebsites = websites.filter(target => target.verificationState === 'verified');
  const needsVerification = websites.find(target => target.verificationState !== 'verified');
  const canCreateTarget = currentOrg.role === 'owner' || currentOrg.role === 'admin';
  const canScan = canCreateTarget || currentOrg.role === 'member';
  const reviewedScan = scans.find(scan => scan.status === 'completed' &&
    scan.requestedModules.includes('security') &&
    verifiedWebsites.some(target => target.id === scan.targetId));
  const criticalCount = findings.filter(finding => finding.severity === 'critical').length;
  const currentStep = targetsError ? 'unavailable'
    : websites.length === 0 ? 'add'
    : verifiedWebsites.length === 0 ? 'verify'
    : 'scan';
  const actionTarget = verifiedWebsites[0] ?? needsVerification;
  const actionPath = currentStep === 'add' ? '/app/targets'
    : currentStep === 'scan' && reviewedScan ? `/app/scans/${reviewedScan.id}`
    : actionTarget ? `/app/targets/${actionTarget.id}` : '/app/targets';
  const actionLabel = currentStep === 'add' ? 'Website hinzufügen'
    : currentStep === 'verify' ? 'Domain-Kontrolle bestätigen'
    : reviewedScan ? 'Security-Scan ansehen' : 'Verifizierte Website öffnen';

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">Übersicht</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-100">Website-Sicherheit</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Technische Übersicht für {currentOrg.name}. Unbekannt or incomplete evidence is never a pass.
          </p>
        </div>
        <button type="button" onClick={() => setRetry(value => value + 1)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
          <RefreshCw className="h-4 w-4" /> Aktualisieren
        </button>
      </header>

      {targetsError && <section role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5">
        <div className="flex items-start gap-3 text-sm text-rose-300">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h2 className="font-semibold">Websites konnten nicht geladen werden</h2>
            <p className="mt-2 text-rose-200/80">{targetsError}</p>
            <p className="mt-2 text-xs">Website-Zähler und Fortschritt sind nicht verfügbar und werden nicht als null ausgegeben.</p>
          </div>
        </div>
      </section>}

      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-400"><Target className="h-4 w-4" /> Verifizierte Websites</div>
          <div className="mt-4 text-3xl font-semibold tabular-nums text-slate-100">{targetsError ? 'Unbekannt' : verifiedWebsites.length}</div>
          <p className="mt-2 text-xs text-slate-600">{targetsError ? 'Website-Daten nicht verfügbar' : `From ${websites.length} website target(s). DNS ownership only.`}</p>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-400"><ShieldCheck className="h-4 w-4" /> Offene Findings</div>
          <div className="mt-4 text-3xl font-semibold tabular-nums text-slate-100">{findingsError ? 'Unbekannt' : `${findings.length}${hasJetztFindings ? '+' : ''}`}</div>
          <p className="mt-2 text-xs text-slate-600">{findingsError ? 'Findings nicht verfügbar' : hasJetztFindings ? 'Weitere Seiten vorhanden; die Zahl ist eine Untergrenze.' : 'Gespeicherte Beobachtungen, keine Sicherheitsgarantie.'}</p>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-400"><AlertTriangle className="h-4 w-4" /> Kritische Findings</div>
          <div className="mt-4 text-3xl font-semibold tabular-nums text-slate-100">{findingsError ? 'Unbekannt' : `${criticalCount}${hasJetztFindings ? '+' : ''}`}</div>
          <p className="mt-2 text-xs text-slate-600">{findingsError ? 'Schweregrade nicht verfügbar' : hasJetztFindings ? 'Mindestens so viele unter den geladenen Einträgen.' : 'Nur aus gespeicherten Schweregraden berechnet.'}</p>
        </section>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Dein Weg zum ersten Security-Scan</h2>
          <p className="mt-1 text-sm text-slate-500">Diese Schritte beruhen auf gespeicherten Daten, nicht auf Demo-Fortschritten.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Step number={1} title="Website hinzufügen" description="Hinterlege deine eigene Website."
            state={targetsError ? 'unknown' : websites.length ? 'complete' : 'current'} />
          <Step number={2} title="Domain verifizieren" description="Bestätige die Domain-Kontrolle mit einem DNS-TXT-Eintrag."
            state={targetsError ? 'unknown' : verifiedWebsites.length ? 'complete' : websites.length ? 'current' : 'pending'} />
          <Step number={3} title="Sicherheit prüfen" description="Starte die technischen Prüfungen für eine verifizierte Website."
            state={targetsError || scansError ? 'unknown'
              : verifiedWebsites.length === 0 ? 'pending'
              : reviewedScan ? 'complete' : 'current'} />
        </div>

        {!targetsError && <div className="flex flex-col justify-between gap-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.05] p-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold text-slate-100">
              {currentStep === 'add' ? 'Beginne mit deiner eigenen Website.'
                : currentStep === 'verify' ? 'Deine Website muss noch verifiziert werden.'
                : reviewedScan ? 'Sieh dir die technischen Nachweise an.'
                : 'Deine Website ist verifiziert und kann geprüft werden.'}
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-400">
              {currentStep === 'add' ? 'Admins und Eigentümer können eine Website hinzufügen.'
                : currentStep === 'verify' ? 'Nur verifizierte Websites dürfen gescannt werden. Die Verifizierung belegt keine Sicherheit.'
                : 'Öffne eine verifizierte Website und prüfe die Nachweise und Findings nach dem Scan.'}
            </p>
          </div>
          {((currentStep === 'add' && canCreateTarget) || (currentStep === 'verify' && canCreateTarget)
            || (currentStep === 'scan' && canScan)) ? <button type="button" onClick={() => navigate(actionPath)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400">
              {currentStep === 'add' && <Plus className="h-4 w-4" />}
              {actionLabel} <ArrowRight className="h-4 w-4" />
            </button> : <span className="text-xs text-slate-500">Für diesen Schritt brauchst du die Berechtigung eines Admins oder Eigentümers.</span>}
        </div>}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2 font-semibold text-slate-200"><Activity className="h-4 w-4 text-indigo-300" /> Letzte Scans</div>
            <button onClick={() => navigate('/app/scans')} className="text-xs text-indigo-300 hover:text-indigo-200">Alle ansehen</button>
          </div>
          {scansError ? <div role="alert" className="p-5 text-sm text-amber-300">Scan-Historie nicht verfügbar: {scansError}</div>
            : scans.length === 0 ? <div className="p-6 text-sm leading-6 text-slate-500">
              Keine Scans geladen. Daraus lässt sich keine Sicherheitsbewertung ableiten.
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
            <div className="flex items-center gap-2 font-semibold text-slate-200"><ShieldAlert className="h-4 w-4 text-indigo-300" /> Offene Findings</div>
            <button onClick={() => navigate('/app/findings')} className="text-xs text-indigo-300 hover:text-indigo-200">Alle ansehen</button>
          </div>
          {findingsError ? <div role="alert" className="p-5 text-sm text-amber-300">
            Findings sind nicht verfügbar: {findingsError}
          </div> : findings.length === 0 ? <div className="p-6 text-sm leading-6 text-slate-500">
            Keine offenen Findings geladen. Prüfe trotzdem den erfassten Prüfumfang und die Nachweise.
          </div> : <div className="divide-y divide-slate-800">
            {findings.slice(0, 4).map(finding => <div key={finding.id} className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-200">{finding.ruleTitle || finding.ruleId || 'Technisches Finding'}</div>
                <div className="mt-1 text-xs text-slate-500">{finding.status.replaceAll('_', ' ')} · {displayDate(finding.lastSeenAt)}</div>
              </div>
              <span className="shrink-0 rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400">{finding.severity || 'unknown'}</span>
            </div>)}
          </div>}
        </section>
      </div>

      <p className="text-xs leading-5 text-slate-600">
        Eine bestätigte DNS-Domain belegt nur die Domain-Kontrolle. Ein abgeschlossener Scan belegt ausschließlich die ausgeführten Prüfungen.
        GuardAI leitet aus fehlenden Daten keine vollständige Sicherheit, Compliance oder Schwachstellenfreiheit ab.
      </p>
    </div>
  );
}
