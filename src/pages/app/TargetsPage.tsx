import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import { createScanIdempotencyKey, createWorkspaceApi } from '../../api/workspaceApi';
import type { WorkspaceTarget, PersistentScan } from '../../types/workspace';
import {
  Globe2,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  RefreshCw,
  Play,
  FileText,
  Search,
  Plus,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Laptop,
  Server,
  Activity,
} from 'lucide-react';
import { GuardApiError } from '../../api/apiClient';
import { targetListScope, targetsBelongToOrganization } from '../../lib/targetViewScope';

function TargetStatusBadge({ state }: { state: WorkspaceTarget['verificationState'] }) {
  switch (state) {
    case 'verified':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Verifiziert
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
          <Clock className="w-3.5 h-3.5 text-amber-400" /> DNS ausstehend
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400 border border-rose-500/20">
          <XCircle className="w-3.5 h-3.5 text-rose-400" /> Fehlgeschlagen
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-400 border border-slate-500/20">
          <HelpCircle className="w-3.5 h-3.5" /> Nicht verifiziert
        </span>
      );
  }
}

function formatDate(value?: string | null) {
  if (!value) return 'Keine Angabe';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Ungültig' : parsed.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatRelativeTime(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const diffMs = Date.now() - parsed.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 2) return 'Gerade eben';
  if (diffMin < 60) return `Vor ${diffMin} Minuten`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `Vor ${diffHours} Std.`;
  const diffDays = Math.round(diffHours / 24);
  return `Vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
}

function getProductIcon(name: string, url: string | null) {
  const text = `${name} ${url ?? ''}`.toLowerCase();
  if (text.includes('shop') || text.includes('store') || text.includes('commerce') || text.includes('kauf')) {
    return <ShoppingBag className="w-5 h-5 text-indigo-400" />;
  }
  if (text.includes('api') || text.includes('backend') || text.includes('service')) {
    return <Server className="w-5 h-5 text-sky-400" />;
  }
  if (text.includes('app') || text.includes('portal') || text.includes('dashboard') || text.includes('saas')) {
    return <Laptop className="w-5 h-5 text-emerald-400" />;
  }
  return <Globe2 className="w-5 h-5 text-indigo-300" />;
}

export default function TargetsPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();
  const navigate = useNavigate();

  const [targets, setTargets] = useState<WorkspaceTarget[]>([]);
  const [scans, setScans] = useState<PersistentScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanHistoryUnavailable, setScanHistoryUnavailable] = useState(false);

  const [targetUrl, setTargetUrl] = useState('');
  const [targetName, setTargetName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [scanningTargetId, setScanningTargetId] = useState<string | null>(null);
  const [scanActionError, setScanActionError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'tested'>('all');

  const [retryCount, setRetryCount] = useState(0);
  const scopeKey = targetListScope(session?.user.id, currentOrg?.id);
  const activeScopeRef = useRef(scopeKey);
  const activeRoleRef = useRef(currentOrg?.role);
  const activeTokenRef = useRef(session?.access_token ?? null);
  const createRequestRef = useRef(0);
  const scanRequestRef = useRef(0);

  activeScopeRef.current = scopeKey;
  activeRoleRef.current = currentOrg?.role;
  activeTokenRef.current = session?.access_token ?? null;

  useEffect(() => {
    let cancelled = false;

    createRequestRef.current += 1;
    scanRequestRef.current += 1;
    setCreating(false);
    setScanningTargetId(null);
    setTargets([]);
    setScans([]);
    setScanHistoryUnavailable(false);
    setError(null);
    setCreateError(null);
    setScanActionError(null);
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

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const api = createWorkspaceApi(async () => session!.access_token);
        const [targetList, scanHistory] = await Promise.all([
          api.listTargets(currentOrg!.id),
          api.listScans(currentOrg!.id, 100)
            .then(result => ({ ok: true as const, result }))
            .catch(() => ({ ok: false as const })),
        ]);

        if (!targetsBelongToOrganization(targetList, currentOrg!.id)) {
          throw new Error('Website-Antwort gehört nicht vollständig zum aktiven Workspace.');
        }
        const trustedScans = scanHistory.ok
          && scanHistory.result.scans.every(scan => scan.organizationId === currentOrg!.id);
        if (!cancelled) {
          setTargets(targetList);
          setScans(trustedScans ? scanHistory.result.scans : []);
          setScanHistoryUnavailable(!trustedScans);
          if (!trustedScans) setStatusFilter('all');
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Fehler beim Laden der Websites.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [session, currentOrg, orgLoading, retryCount]);

  // Map each target to its most recent scan
  const latestScansByTarget = useMemo(() => {
    const map = new Map<string, PersistentScan>();
    for (const scan of scans) {
      const existing = map.get(scan.targetId);
      if (!existing || new Date(scan.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        map.set(scan.targetId, scan);
      }
    }
    return map;
  }, [scans]);

  const verifiedTargetsCount = useMemo(() => targets.filter(t => t.verificationState === 'verified').length, [targets]);
  const testedTargetsCount = useMemo(() => {
    return targets.filter(t => latestScansByTarget.has(t.id)).length;
  }, [targets, latestScansByTarget]);
  const actionRequiredCount = useMemo(() => {
    return targets.filter(t => t.verificationState !== 'verified').length;
  }, [targets]);

  const filteredTargets = useMemo(() => {
    return targets.filter(target => {
      const name = target.displayName?.toLowerCase() ?? '';
      const url = target.canonicalUrl?.toLowerCase() ?? '';
      const matchesSearch = !searchQuery.trim() || name.includes(searchQuery.toLowerCase()) || url.includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (statusFilter === 'verified') return target.verificationState === 'verified';
      if (statusFilter === 'pending') return target.verificationState === 'pending' || target.verificationState === 'unverified';
      if (statusFilter === 'tested') return latestScansByTarget.has(target.id);
      return true;
    });
  }, [targets, searchQuery, statusFilter, latestScansByTarget]);

  if (orgLoading) {
    return <div className="animate-pulse flex items-center justify-center p-12 text-slate-400">Workspace wird geladen...</div>;
  }

  // The AppWorkspaceGate owns the only organization onboarding screen.
  if (!currentOrg) return null;

  const canCreate = currentOrg.role === 'owner' || currentOrg.role === 'admin';
  const canRunScans = currentOrg.role === 'owner' || currentOrg.role === 'admin' || currentOrg.role === 'member';

  async function handleCreateTarget(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !session || !canCreate || creating) return;

    const activeOrgId = currentOrg.id;
    const issuedToken = session.access_token;
    const requestId = ++createRequestRef.current;
    const isCurrentRequest = () =>
      createRequestRef.current === requestId &&
      activeScopeRef.current === scopeKey &&
      activeTokenRef.current === issuedToken &&
      (activeRoleRef.current === 'owner' || activeRoleRef.current === 'admin');

    setCreating(true);
    setCreateError(null);

    try {
      const api = createWorkspaceApi(async () => session.access_token);
      const newTarget = await api.createWebsiteTarget(activeOrgId, {
        url: targetUrl,
        displayName: targetName || undefined,
      });

      if (isCurrentRequest() && newTarget.organizationId === activeOrgId) {
        navigate(`/app/targets/${newTarget.id}`);
      }
    } catch (err) {
      if (!isCurrentRequest()) return;

      if (err instanceof GuardApiError) {
        setCreateError(
          err.status === 429
            ? 'Zu viele Anfragen. Bitte warte einen Moment.'
            : `${err.message} (${err.code})`,
        );
      } else {
        setCreateError(err instanceof Error ? err.message : 'Fehler beim Anlegen der Website.');
      }
    } finally {
      if (isCurrentRequest()) {
        setCreating(false);
      }
    }
  }

  async function handleQuickScan(targetId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!currentOrg || !session || !canRunScans || scanningTargetId) return;
    if (!targets.some(target => target.id === targetId && target.type === 'website' && target.verificationState === 'verified')) return;

    const issuedToken = session.access_token;
    const issuedOrgId = currentOrg.id;
    const requestId = ++scanRequestRef.current;
    const isCurrentRequest = () =>
      scanRequestRef.current === requestId &&
      activeScopeRef.current === scopeKey &&
      activeTokenRef.current === issuedToken &&
      ['owner', 'admin', 'member'].includes(activeRoleRef.current ?? '');

    setScanningTargetId(targetId);
    setScanActionError(null);

    try {
      const api = createWorkspaceApi(async () => issuedToken);
      const submission = await api.submitScan(
        issuedOrgId,
        targetId,
        ['security'],
        createScanIdempotencyKey(),
      );
      if (isCurrentRequest() && submission.scan.organizationId === issuedOrgId && submission.scan.targetId === targetId) {
        navigate(`/app/scans/${submission.scan.id}`);
      }
    } catch (err) {
      if (!isCurrentRequest()) return;
      if (err instanceof GuardApiError) {
        setScanActionError(
          err.status === 429
            ? 'Anfragenlimit erreicht. Bitte warte vor dem nächsten Versuch.'
            : `${err.message} (${err.code})`,
        );
      } else {
        setScanActionError(err instanceof Error ? err.message : 'Scan konnte nicht gestartet werden.');
      }
    } finally {
      if (isCurrentRequest()) setScanningTargetId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Websites</h1>
          <p className="text-sm text-slate-400 mt-1">
            Verwalte deine eigenen Websites, bestätige die Domain-Kontrolle und starte nachvollziehbare technische Security-Scans.
          </p>
        </div>
      </div>

      {/* KPI Overview Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <Globe2 className="w-3.5 h-3.5 text-indigo-400" />
            Websites gesamt
          </div>
          <div className="text-2xl font-bold text-slate-100">{error ? 'Unbekannt' : targets.length}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Aktiv & verifiziert
          </div>
          <div className="text-2xl font-bold text-emerald-400">{error ? 'Unbekannt' : verifiedTargetsCount}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            Mit Scan-Historie
          </div>
          <div className="text-2xl font-bold text-sky-400">{scanHistoryUnavailable ? "Unbekannt" : testedTargetsCount}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Noch nicht verifiziert
          </div>
          <div className="text-2xl font-bold text-amber-400">{error ? 'Unbekannt' : actionRequiredCount}</div>
        </div>
      </div>

      {/* Add New Online Product Form */}
      {canCreate && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-slate-200">Website hinzufügen</h2>
              <p className="text-xs text-slate-400 mt-0.5">Füge eine eigene Website hinzu. Vor dem ersten Security-Scan musst du die Kontrolle über die Domain per DNS bestätigen.</p>
            </div>
          </div>

          <form onSubmit={handleCreateTarget} className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label htmlFor="target-url" className="sr-only">Webseiten-URL oder Domain</label>
                <input
                  id="target-url"
                  type="text"
                  placeholder="Domain oder URL (z.B. meinedomain.de oder https://shop.meinedomain.de)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  maxLength={2048}
                  required
                  disabled={creating}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="target-name" className="sr-only">Website-Name</label>
                <input
                  id="target-name"
                  type="text"
                  placeholder="Website-Name (z. B. Firmenwebsite)"
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {creating ? 'Wird hinzugefügt...' : 'Website hinzufügen'}
              </button>
            </div>
          </form>

          {createError && <p role="alert" className="text-sm text-rose-500">{createError}</p>}
        </section>
      )}

      {scanActionError && (
        <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300 flex items-center justify-between gap-4">
          <span>{scanActionError}</span>
          <button onClick={() => setScanActionError(null)} className="text-xs text-rose-400 hover:underline">Schließen</button>
        </div>
      )}

      {scanHistoryUnavailable && !loading && !error && (
        <div role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
          Die Scan-Historie konnte nicht geladen werden. Websites bleiben sichtbar, aber Scan-Zähler und Teststatus sind derzeit unbekannt.
          <button type="button" onClick={() => setRetryCount(c => c + 1)} className="ml-3 font-semibold underline underline-offset-2">
            Erneut laden
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Nach Website oder Domain suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${statusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'}`}
          >
            Alle ({targets.length})
          </button>
          <button
            onClick={() => setStatusFilter('verified')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${statusFilter === 'verified' ? 'bg-primary text-primary-foreground' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'}`}
          >
            Verifiziert ({verifiedTargetsCount})
          </button>
          <button
            onClick={() => setStatusFilter('tested')}
            disabled={scanHistoryUnavailable}
            title={scanHistoryUnavailable ? 'Scan-Historie derzeit nicht verfügbar' : undefined}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${statusFilter === 'tested' ? 'bg-primary text-primary-foreground' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'}`}
          >
            Mit Scan ({scanHistoryUnavailable ? '?' : testedTargetsCount})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${statusFilter === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'}`}
          >
            Ausstehend ({actionRequiredCount})
          </button>
        </div>
      </div>

      {/* Main Product Inventory Grid */}
      {loading ? (
        <div className="animate-pulse flex items-center justify-center p-12 text-slate-400">Websites werden geladen...</div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 flex items-center justify-between gap-4">
          <p className="text-sm text-destructive-foreground">{error}</p>
          <button
            onClick={() => setRetryCount(c => c + 1)}
            className="flex items-center gap-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/20 px-3 py-1.5 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Erneut versuchen
          </button>
        </div>
      ) : filteredTargets.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center shadow-sm">
          <Globe2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-medium text-slate-200 mb-1">Keine Websites gefunden</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-4">
            {searchQuery || statusFilter !== 'all'
              ? 'Keine Websites stimmen mit deinen aktuellen Such- oder Filterkriterien überein.'
              : 'Füge oben deine erste eigene Website hinzu, verifiziere sie per DNS und starte eine technische Sicherheitsprüfung.'}
          </p>
          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
              className="text-xs text-sky-400 hover:underline"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTargets.map(target => {
            const latestScan = latestScansByTarget.get(target.id);
            const isVerified = target.verificationState === 'verified';
            const isScanningThis = scanningTargetId === target.id;

            return (
              <div
                key={target.id}
                onClick={() => navigate(`/app/targets/${target.id}`)}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 shadow-sm transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-5 group"
              >
                {/* Left: Product Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-11 h-11 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0 group-hover:border-slate-700 transition-colors">
                    {getProductIcon(target.displayName, target.canonicalUrl)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-semibold text-slate-100 text-base group-hover:text-primary transition-colors">
                        {target.displayName}
                      </h3>
                      <TargetStatusBadge state={target.verificationState} />
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-1 break-all">
                      {target.canonicalUrl}
                    </p>
                    <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-3">
                      <span>Registriert am {formatDate(target.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Center: Latest Test Status ("mit Test und Co") */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 min-w-[240px] md:max-w-xs flex flex-col justify-center">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1 flex items-center justify-between">
                    <span>Technischer Security-Scan</span>
                    {latestScan && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        {formatRelativeTime(latestScan.createdAt)}
                      </span>
                    )}
                  </div>

                  {scanHistoryUnavailable ? (
                    <p className="text-xs text-amber-300">Scan-Status unbekannt – Historie nicht verfügbar.</p>
                  ) : latestScan ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                          {latestScan.status === 'completed' ? (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          ) : latestScan.status === 'failed' ? (
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                          )}
                          {latestScan.status === 'completed'
                            ? 'Test abgeschlossen'
                            : latestScan.status === 'failed'
                            ? 'Test fehlgeschlagen'
                            : 'Test läuft...'}
                        </span>
                        {typeof latestScan.overallScore === 'number' && (
                          <span className="text-xs font-medium text-slate-300 bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-700" title="Technischer Scan-Score für die ausgeführten Prüfungen; keine Sicherheits- oder Compliance-Garantie">
                            Scan-Score {latestScan.overallScore}/100
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/scans/${latestScan.id}`);
                        }}
                        className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1 mt-1 transition-colors"
                      >
                        <FileText className="w-3 h-3" /> Scan-Ergebnis ansehen &rarr;
                      </button>
                    </div>
                  ) : isVerified ? (
                    <div>
                      <p className="text-xs text-slate-400">Noch kein Test durchgeführt.</p>
                      <span className="text-[11px] text-emerald-400/90 font-medium mt-0.5 inline-block">
                        Bereit für Sicherheits-Baseline
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-amber-400/90 font-medium">DNS-Verifizierung erforderlich</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Scans erst nach Domain-Nachweis möglich.</p>
                    </div>
                  )}
                </div>

                {/* Right: Direct Actions */}
                <div className="flex items-center gap-2.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {target.type === 'website' && isVerified && canRunScans && (
                    <button
                      onClick={(e) => handleQuickScan(target.id, e)}
                      disabled={isScanningThis}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-3.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                      title="Technischen Security-Scan jetzt starten"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {isScanningThis ? 'Startet...' : 'Jetzt testen'}
                    </button>
                  )}

                  <button
                    onClick={() => navigate(`/app/targets/${target.id}`)}
                    className="border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    Details
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

