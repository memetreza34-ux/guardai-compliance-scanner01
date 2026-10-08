import { useEffect, useMemo, useState } from 'react';
import { Clock3, FileClock, RefreshCw, Search } from 'lucide-react';
import { createWorkspaceApi } from '../../api/workspaceApi';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { WorkspaceAuditEvent } from '../../types/workspace';

function displayDate(input: string) {
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString();
}

function AuditEvents({ organizationId }: { organizationId: string }) {
  const { session } = useAuth();
  const [events, setEvents] = useState<WorkspaceAuditEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setEvents([]);
    setCursor(null);
    setError(null);
    if (!session?.access_token) { setLoading(false); return; }
    async function load() {
      setLoading(true);
      try {
        const api = createWorkspaceApi(async () => session!.access_token);
        const page = await api.listAuditEvents(organizationId, { limit: 50 });
        if (!cancelled) { setEvents(page.events); setCursor(page.nextCursor); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Audit history unavailable.');
      } finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [organizationId, session, revision]);

  async function older() {
    if (!cursor || !session?.access_token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const api = createWorkspaceApi(async () => session.access_token);
      const page = await api.listAuditEvents(organizationId, { cursor, limit: 50 });
      setEvents(previous => {
        const ids = new Set(previous.map(event => event.id));
        return [...previous, ...page.events.filter(event => !ids.has(event.id))];
      });
      setCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Older events unavailable.');
    } finally { setBusy(false); }
  }

  const visible = useMemo(() => {
    const search = term.trim().toLowerCase();
    return search ? events.filter(event =>
      [event.action, event.actorId, event.targetId, event.targetType, event.id]
        .some(value => (value || '').toLowerCase().includes(search))
    ) : events;
  }, [events, term]);

  if (loading) return <div className="p-12 text-sm text-slate-400">Loading audit history...</div>;

  return <div className="mx-auto max-w-6xl space-y-7">
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Organization</div>
      <h1 className="mt-2 text-2xl font-semibold text-slate-100">Audit Log</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
        Tenant-scoped recorded backend events. Only Admins and Owners may view the history.
        Event metadata is intentionally not shown without an explicit field-level review.
      </p>
    </div>
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-500">
      This history covers only events emitted by supported GuardAI workflows. It is not a claim of complete
      infrastructure coverage or tamper-proof archival.
    </div>
    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
      {error}
      <button onClick={() => setRevision(value => value + 1)} className="inline-flex items-center gap-2">
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500">{events.length} events loaded. Search covers loaded pages only.</p>
      <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
        <Search className="h-4 w-4 text-slate-500" />
        <input aria-label="Filter loaded audit events" placeholder="Action, actor, object..." value={term}
          onChange={event => setTerm(event.target.value)}
          className="min-w-0 bg-transparent text-sm text-slate-200 outline-none" />
      </label>
    </div>
    {events.length === 0 && !error ? <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
      <FileClock className="mx-auto h-8 w-8 text-slate-600" />
      <h2 className="mt-3 font-medium text-slate-200">No stored events returned</h2>
      <p className="mt-2 text-sm text-slate-500">This does not prove that no activity occurred.</p>
    </div> : visible.length === 0 ? <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-500">
      No matching entries in the currently loaded pages.
    </div> : <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      {visible.map(event => <article key={event.id}
        className="grid gap-4 border-b border-slate-800 p-5 last:border-0 md:grid-cols-[1.3fr_1fr_auto]">
        <div className="min-w-0">
          <h2 className="break-all font-medium text-slate-200">{event.action.replaceAll('.', ' / ').replaceAll('_', ' ')}</h2>
          <div className="mt-1 break-all font-mono text-xs text-slate-600">{event.action}</div>
          <div className="mt-3 break-all text-xs text-slate-500">{event.targetType || 'No object type'} / {event.targetId || 'No object ID'}</div>
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-600">Actor</div>
          <div className="mt-1 break-all font-mono text-xs text-slate-400">{event.actorId || 'System / unavailable'}</div>
          <div className="mt-3 break-all font-mono text-xs text-slate-600">{event.id}</div>
        </div>
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <Clock3 className="h-4 w-4 shrink-0" />
          <time dateTime={event.createdAt}>{displayDate(event.createdAt)}</time>
        </div>
      </article>)}
    </div>}
    {cursor && <div className="flex justify-center">
      <button disabled={busy} onClick={() => void older()}
        className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 disabled:opacity-50">
        {busy ? 'Loading...' : 'Load older events'}
      </button>
    </div>}
  </div>;
}

export default function AuditLogPage() {
  const { currentOrg, isLoading } = useWorkspace();
  if (isLoading) return <div className="p-12 text-sm text-slate-400">Loading workspace...</div>;
  if (!currentOrg) return <div className="text-sm text-slate-500">Select an organization first.</div>;
  if (currentOrg.role !== 'owner' && currentOrg.role !== 'admin') {
    return <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-sm text-slate-400">
      Audit Log requires an Organization Admin or Owner.
    </div>;
  }
  return <AuditEvents key={currentOrg.id} organizationId={currentOrg.id} />;
}
