import { useEffect, useState } from 'react';
import { ArrowLeft, FileCheck2, Hash, ShieldAlert } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { createReportApi } from '../../api/reportApi';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { TechnicalReportRecord } from '../../types/report';

function formatDate(value?: string | null) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString();
}

export default function ReportDetailPage() {
  const { reportId } = useParams();
  const { session } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useWorkspace();
  const navigate = useNavigate();
  const [report, setReport] = useState<TechnicalReportRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReport(null);
    setError(null);

    if (orgLoading) {
      setLoading(true);
      return;
    }
    if (!session?.access_token || !currentOrg || !reportId) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const api = createReportApi(async () => session!.access_token);
        const next = await api.getReport(currentOrg!.id, reportId!);
        if (!cancelled) setReport(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load report.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [session, currentOrg, reportId, orgLoading]);

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Loading report...</div>;
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <button onClick={() => navigate('/app/reports')} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Back to reports
        </button>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-rose-300">
          <div className="flex gap-3"><ShieldAlert className="h-5 w-5" /><span>{error || 'Report unavailable.'}</span></div>
        </div>
      </div>
    );
  }

  const snapshot = report.snapshot;

  return (
    <div className="mx-auto max-w-6xl space-y-7 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate('/app/reports')} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Back to reports
        </button>
        <button
          onClick={() => navigate('/app/trust-center')}
          className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/15"
        >
          Manage Trust publication
        </button>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Immutable technical report</div>
        <h1 className="mt-3 text-2xl font-semibold text-slate-100">{snapshot.target.displayName}</h1>
        <div className="mt-2 break-all text-sm text-slate-500">{snapshot.target.canonicalUrl || snapshot.target.id}</div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div><div className="text-xs text-slate-600">Created</div><div className="mt-1 text-sm text-slate-300">{formatDate(report.createdAt)}</div></div>
          <div><div className="text-xs text-slate-600">Scan completed</div><div className="mt-1 text-sm text-slate-300">{formatDate(snapshot.scan.completedAt)}</div></div>
          <div><div className="text-xs text-slate-600">Scanner</div><div className="mt-1 text-sm text-slate-300">{snapshot.scan.scannerVersion}</div></div>
          <div><div className="text-xs text-slate-600">Schema</div><div className="mt-1 text-sm text-slate-300">v{report.schemaVersion}</div></div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Hash className="h-3.5 w-3.5" /> Snapshot SHA-256</div>
          <div className="mt-2 break-all font-mono text-xs text-slate-400">{report.snapshotHash}</div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><div className="text-xs text-slate-600">Evidence</div><div className="mt-2 text-2xl font-semibold text-slate-100">{snapshot.evidence.length}</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><div className="text-xs text-slate-600">Findings</div><div className="mt-2 text-2xl font-semibold text-slate-100">{snapshot.findings.length}</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><div className="text-xs text-slate-600">Modules</div><div className="mt-2 text-2xl font-semibold text-slate-100">{snapshot.modules.length}</div></div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100">Frozen findings</h2>
        {snapshot.findings.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-500">
            No findings are contained in this snapshot. This is not proof that no vulnerabilities or compliance issues existed.
          </div>
        ) : snapshot.findings.map(finding => (
          <article key={finding.findingId} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-300">{finding.severity}</span>
              {finding.ruleId && <span className="font-mono text-xs text-slate-500">{finding.ruleId}{finding.ruleVersion ? `@${finding.ruleVersion}` : ''}</span>}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-200">{finding.message}</p>
            {finding.remediation && <p className="mt-3 text-sm leading-6 text-slate-500">{finding.remediation}</p>}
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100">Evidence provenance</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {snapshot.evidence.map(item => (
            <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-200"><FileCheck2 className="h-4 w-4 text-indigo-300" /> {item.type}</div>
              <div className="mt-2 font-mono text-xs text-slate-500">{item.detectorId}@{item.detectorVersion}</div>
              <div className="mt-2 break-all text-xs text-slate-600">{item.contentHash || 'No content hash recorded'}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.05] p-6">
        <h2 className="font-semibold text-amber-200">Limitations frozen with this report</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-400">
          {snapshot.limitations.map(limit => <li key={limit}>{limit}</li>)}
        </ul>
      </section>
    </div>
  );
}
