import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Globe2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { createReportApi } from '../../api/reportApi';
import { createTrustApi } from '../../api/trustApi';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { TechnicalReportRecord } from '../../types/report';
import type { TrustPublicationRecord } from '../../types/trust';

function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString();
}

export default function TrustCenterPage() {
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();
  const [reports, setReports] = useState<TechnicalReportRecord[]>([]);
  const [publications, setPublications] = useState<TrustPublicationRecord[]>([]);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const canManage = currentOrg?.role === 'owner' || currentOrg?.role === 'admin';

  useEffect(() => {
    let cancelled = false;
    setReports([]);
    setPublications([]);
    setSelectedReportId('');
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
        const reportApi = createReportApi(async () => session!.access_token);
        const trustApi = createTrustApi(async () => session!.access_token);
        const [reportPage, publicationPage] = await Promise.all([
          reportApi.listReports(currentOrg!.id, { limit: 100 }),
          trustApi.list(currentOrg!.id, { limit: 100 }),
        ]);
        if (cancelled) return;
        setReports(reportPage.reports);
        setPublications(publicationPage.publications);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load Trust Center.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, orgLoading, retry]);

  const activeReportIds = useMemo(
    () => new Set(publications.filter(item => item.status === 'published').map(item => item.reportSnapshotId)),
    [publications],
  );
  const publishableReports = reports.filter(report => !activeReportIds.has(report.id));

  async function publish() {
    if (!session?.access_token || !currentOrg || !selectedReportId || !canManage) return;
    setBusyId(selectedReportId);
    setError(null);
    try {
      const api = createTrustApi(async () => session.access_token);
      const result = await api.publish(currentOrg.id, selectedReportId);
      setPublications(current => [
        result.publication,
        ...current.filter(item => item.id !== result.publication.id),
      ]);
      setSelectedReportId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish report.');
    } finally {
      setBusyId(null);
    }
  }

  async function revoke(publicationId: string) {
    if (!session?.access_token || !currentOrg || !canManage) return;
    setBusyId(publicationId);
    setError(null);
    try {
      const api = createTrustApi(async () => session.access_token);
      const updated = await api.revoke(currentOrg.id, publicationId);
      setPublications(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke publication.');
    } finally {
      setBusyId(null);
    }
  }

  async function copyPublicUrl(slug: string) {
    const url = `${window.location.origin}/trust/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(slug);
      window.setTimeout(() => setCopied(current => current === slug ? null : current), 1800);
    } catch {
      setError('The public Trust URL could not be copied to the clipboard.');
    }
  }

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading Trust Center...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 animate-in fade-in duration-500">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Assure</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">Trust Center</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Publish a curated public verification page from an immutable technical report snapshot. Internal finding details are not exposed by the public Trust projection.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>{error}</span>
          <button onClick={() => setRetry(value => value + 1)} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-rose-500/10">
            <RefreshCw className="h-4 w-4" /> Reload
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-indigo-300" />
          <div>
            <h2 className="font-semibold text-slate-100">Publish an immutable report</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Publishing requires Admin or Owner. Revocation invalidates the public page; it does not delete the underlying report snapshot.
            </p>
          </div>
        </div>

        {canManage ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedReportId}
              onChange={event => setSelectedReportId(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300"
            >
              <option value="">Select report snapshot…</option>
              {publishableReports.map(report => (
                <option key={report.id} value={report.id}>
                  {report.snapshot.target.displayName} · {formatDate(report.createdAt)} · {report.snapshotHash.slice(0, 8)}
                </option>
              ))}
            </select>
            <button
              onClick={publish}
              disabled={!selectedReportId || busyId === selectedReportId}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {busyId === selectedReportId ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
            Your {currentOrg?.role || 'current'} role can view publications but cannot publish or revoke them.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Publications</h2>
            <p className="text-sm text-slate-500">Public links remain bound to one immutable report snapshot.</p>
          </div>
          <span className="text-sm text-slate-600">{publications.length} loaded</span>
        </div>

        {publications.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
            <Globe2 className="mx-auto h-8 w-8 text-slate-600" />
            <h3 className="mt-4 font-medium text-slate-200">Nothing published yet</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Create an immutable report first, then publish only the snapshot you intend to share.</p>
          </div>
        ) : publications.map(publication => {
          const report = reports.find(item => item.id === publication.reportSnapshotId);
          const active = publication.status === 'published';
          const publicUrl = `/trust/${publication.publicSlug}`;
          return (
            <article key={publication.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                      active
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                        : 'border-slate-700 bg-slate-950 text-slate-500'
                    }`}>
                      {active ? <Check className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {publication.status}
                    </span>
                    <span className="text-xs text-slate-600">{formatDate(publication.publishedAt)}</span>
                  </div>
                  <h3 className="mt-3 font-medium text-slate-100">{report?.snapshot.target.displayName || publication.organizationNameSnapshot}</h3>
                  <div className="mt-1 break-all font-mono text-xs text-slate-600">{publicUrl}</div>
                  {report && <div className="mt-2 text-xs text-slate-500">Report {report.snapshotHash.slice(0, 12)}…</div>}
                </div>

                <div className="flex flex-wrap gap-2">
                  {active && (
                    <>
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                      >
                        Open <ExternalLink className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => copyPublicUrl(publication.publicSlug)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                      >
                        {copied === publication.publicSlug ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied === publication.publicSlug ? 'Copied' : 'Copy'}
                      </button>
                      {canManage && (
                        <button
                          onClick={() => revoke(publication.id)}
                          disabled={busyId === publication.id}
                          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/15 disabled:opacity-50"
                        >
                          {busyId === publication.id ? 'Revoking…' : 'Revoke'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
