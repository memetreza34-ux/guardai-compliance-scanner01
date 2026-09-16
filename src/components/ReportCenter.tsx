import { useWorkspace } from '../providers/WorkspaceProvider';
import { useEffect, useState, type FormEvent } from 'react';
import { GuardApiError } from '../api/apiClient';
import type { ReportApi } from '../api/reportApi';
import type { WorkspaceApi } from '../api/workspaceApi';
import type { TechnicalReportRecord } from '../types/report';

import ReportSnapshotView from './ReportSnapshotView';

interface ReportCenterProps {
  reportApi: ReportApi;
  workspaceApi: WorkspaceApi;
}

function readableError(error: unknown): string {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'Report-Aktion fehlgeschlagen.';
}


export default function ReportCenter({ reportApi }: ReportCenterProps) {
  const { currentOrg } = useWorkspace();
  const organizationId = currentOrg?.id || '';
  const [scanId, setScanId] = useState('');
  const [reports, setReports] = useState<TechnicalReportRecord[]>([]);
  const [selectedReport, setSelectedReport] = useState<TechnicalReportRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSelectedReport(null);
    if (!organizationId) {
      setReports([]);
      return undefined;
    }
    reportApi.listReports(organizationId, { limit: 25 })
      .then((page) => {
        if (!cancelled) setReports(page.reports);
      })
      .catch((loadError) => {
        if (!cancelled) setError(readableError(loadError));
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, reportApi]);

  async function reloadReports() {
    if (!organizationId) return;
    const page = await reportApi.listReports(organizationId, { limit: 25 });
    setReports(page.reports);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await reportApi.createReport(organizationId, scanId.trim());
      setSelectedReport(result.report);
      setScanId('');
      await reloadReports();
    } catch (createError) {
      setError(readableError(createError));
    } finally {
      setBusy(false);
    }
  }

  async function handleOpen(reportId: string) {
    setBusy(true);
    setError(null);
    try {
      setSelectedReport(await reportApi.getReport(organizationId, reportId));
    } catch (openError) {
      setError(readableError(openError));
    } finally {
      setBusy(false);
    }
  }

  if (selectedReport) {
    return (
      <ReportSnapshotView 
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8">
      <header className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Immutable Reports
        </div>
        <h2 className="text-2xl font-semibold">Technische Report-Snapshots</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Reports können nur aus abgeschlossenen persistenten Scans erzeugt werden. Ein Snapshot wird gehasht und bleibt unveränderlich; er ist keine Zertifizierung.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-2">
        <form className="space-y-2" onSubmit={handleCreate}>
          <label className="block space-y-1 text-sm">
            <span>Abgeschlossene Scan-ID</span>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-xs"
              value={scanId}
              onChange={(e) => setScanId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              pattern="[0-9a-fA-F-]{36}"
              maxLength={36}
              required
            />
          </label>
          <button
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            type="submit"
            disabled={busy || !organizationId}
          >
            {busy ? 'Bitte warten…' : 'Report-Snapshot erzeugen'}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Gespeicherte Reports</h3>
          <button
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
            type="button"
            disabled={busy || !organizationId}
            onClick={() => {
              setBusy(true);
              setError(null);
              reloadReports()
                .catch((reloadError) => setError(readableError(reloadError)))
                .finally(() => setBusy(false));
            }}
          >
            Aktualisieren
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="rounded-2xl border p-5 text-sm text-muted-foreground">
            Für diesen Workspace sind noch keine technischen Report-Snapshots gespeichert.
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <article key={report.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                <div className="min-w-0">
                  <div className="font-medium">Technical Screening · Schema v{report.schemaVersion}</div>
                  <div className="mt-1 max-w-2xl break-all font-mono text-[11px] text-muted-foreground">
                    {report.snapshotHash}
                  </div>
                </div>
                <button
                  className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
                  type="button"
                  disabled={busy}
                  onClick={() => handleOpen(report.id)}
                >
                  Snapshot öffnen
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
