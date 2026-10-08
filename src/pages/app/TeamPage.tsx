import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, MailPlus, RefreshCw, ShieldAlert, Trash2, Users, X } from 'lucide-react';
import { GuardApiError } from '../../api/apiClient';
import { createTeamApi } from '../../api/teamApi';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import type { TeamInvitation, TeamMember } from '../../types/team';
import type { OrganizationRole } from '../../types/workspace';

const roles = ['admin', 'member', 'viewer'] as const;
type InviteRole = typeof roles[number];

function formatDate(raw?: string | null) {
  if (!raw) return 'Unavailable';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString();
}
function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Team request failed.';
}
function mayManage(actor: OrganizationRole, target: OrganizationRole) {
  return actor === 'owner'
    ? target !== 'owner'
    : actor === 'admin' && (target === 'member' || target === 'viewer');
}

function TeamWorkspace({ organizationId, actorRole, actorUserId }: {
  organizationId: string;
  actorRole: OrganizationRole;
  actorUserId: string;
}) {
  const { session } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [storageReady, setStorageReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('viewer');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const manager = actorRole === 'owner' || actorRole === 'admin';

  useEffect(() => {
    let cancelled = false;
    setMembers([]);
    setInvitations([]);
    setInviteLink(null);
    setError(null);
    setStorageReady(true);
    if (!session?.access_token) { setLoading(false); return; }

    async function load() {
      setLoading(true);
      const api = createTeamApi(async () => session!.access_token);
      try {
        const nextMembers = await api.listMembers(organizationId);
        if (cancelled) return;
        setMembers(nextMembers);
        if (manager) {
          try {
            const nextInvites = await api.listInvitations(organizationId);
            if (!cancelled) setInvitations(nextInvites);
          } catch (loadError) {
            if (loadError instanceof GuardApiError && loadError.code === 'TEAM_STORAGE_NOT_READY') {
              if (!cancelled) setStorageReady(false);
            } else {
              throw loadError;
            }
          }
        }
      } catch (loadError) {
        if (!cancelled) setError(errorText(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [session, organizationId, manager, retry]);

  function api() {
    return createTeamApi(async () => session?.access_token || null);
  }

  async function issueInvitation(event: FormEvent) {
    event.preventDefault();
    if (!manager || busy || !storageReady) return;
    setBusy('invite'); setError(null); setInviteLink(null);
    try {
      const created = await api().createInvitation(organizationId, email, role);
      setInvitations(current => [created.invitation, ...current.filter(item =>
        item.email.toLowerCase() !== created.invitation.email.toLowerCase() || item.status !== 'pending'
      ).concat(current.filter(item =>
        item.email.toLowerCase() === created.invitation.email.toLowerCase() && item.status === 'pending'
      ).map(item => ({ ...item, status: 'revoked' as const })))]);
      setInviteLink(`${window.location.origin}/join#token=${encodeURIComponent(created.token)}`);
      setEmail('');
    } catch (err) {
      if (err instanceof GuardApiError && err.code === 'TEAM_STORAGE_NOT_READY') setStorageReady(false);
      else setError(errorText(err));
    } finally { setBusy(null); }
  }

  async function copyLink() {
    if (!inviteLink) return;
    try { await navigator.clipboard.writeText(inviteLink); setCopied(true); }
    catch { setError('Clipboard access failed. Copy the one-time link manually.'); }
  }

  async function revoke(invitation: TeamInvitation) {
    if (!window.confirm(`Revoke the invitation for ${invitation.email}?`)) return;
    setBusy(invitation.id); setError(null);
    try {
      const changed = await api().revokeInvitation(organizationId, invitation.id);
      setInvitations(current => current.map(item => item.id === changed.id ? changed : item));
    } catch (err) { setError(errorText(err)); }
    finally { setBusy(null); }
  }

  async function updateRole(member: TeamMember, nextRole: InviteRole) {
    if (member.role === nextRole) return;
    if (!window.confirm(`Change this member's role to ${nextRole}?`)) return;
    setBusy(member.userId); setError(null);
    try {
      const changed = await api().updateMember(organizationId, member.userId, nextRole);
      setMembers(current => current.map(item => item.userId === changed.userId ? { ...item, role: changed.role } : item));
    } catch (err) { setError(errorText(err)); }
    finally { setBusy(null); }
  }

  async function removeMember(member: TeamMember) {
    if (!window.confirm('Remove this user from the organization? Their access will be revoked.')) return;
    setBusy(member.userId); setError(null);
    try {
      await api().removeMember(organizationId, member.userId);
      setMembers(current => current.filter(item => item.userId !== member.userId));
    } catch (err) { setError(errorText(err)); }
    finally { setBusy(null); }
  }

  if (loading) return <div className="p-12 text-slate-400">Loading Team…</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-7 animate-in fade-in duration-500">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Organization</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">Team</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Invite collaborators, review organization membership and manage access by role. The Owner account cannot be changed or removed from this V1 workflow.
        </p>
      </div>

      {error && <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
        <span>{error}</span>
        <button onClick={() => setRetry(value => value + 1)} className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Reload</button>
      </div>}

      {manager && !storageReady && <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-5">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div>
          <h2 className="font-semibold text-slate-200">Team invitations are not provisioned</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Current membership remains readable. Invitation workflows are blocked until the dedicated Team SQL draft is safely migrated to the GuardAI database.
          </p>
        </div>
      </div>}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100"><Users className="h-5 w-5 text-indigo-300" /> Members</h2>
          <span className="text-sm text-slate-600">{members.length} loaded</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          {members.length === 0 ? <div className="p-8 text-sm text-slate-500">No organization members returned.</div>
            : members.map(member => {
              const editable = manager && member.userId !== actorUserId && mayManage(actorRole, member.role);
              return <article key={member.userId} className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-5 last:border-0">
                <div className="min-w-0">
                  <div className="font-medium text-slate-200">{member.displayName || `Member ${member.userId.slice(0, 8)}`}</div>
                  <div className="mt-1 break-all font-mono text-xs text-slate-600">{member.userId}</div>
                  <div className="mt-1 text-xs text-slate-600">Joined {formatDate(member.joinedAt)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {editable ? <>
                    <select
                      aria-label="Member role"
                      value={member.role}
                      disabled={busy !== null}
                      onChange={event => void updateRole(member, event.target.value as InviteRole)}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300"
                    >
                      {roles.filter(option => mayManage(actorRole, option)).map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <button aria-label="Remove member" disabled={busy !== null} onClick={() => void removeMember(member)}
                      className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-rose-300 disabled:opacity-40">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </> : <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-400">{member.role}</span>}
                </div>
              </article>;
            })}
        </div>
      </section>

      {manager && storageReady && <>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="flex items-center gap-2 font-semibold text-slate-100"><MailPlus className="h-5 w-5 text-indigo-300" /> Invite teammate</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Invite links expire in 7 days, work only for the matching verified account email and are displayed once. GuardAI does not send invitation emails automatically.
          </p>
          <form onSubmit={issueInvitation} className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
            <input type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)}
              placeholder="colleague@example.com" aria-label="Invitation email"
              className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200" />
            <select aria-label="Invitation role" value={role} onChange={event => setRole(event.target.value as InviteRole)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
              {roles.filter(option => mayManage(actorRole, option)).map(option => <option value={option} key={option}>{option}</option>)}
            </select>
            <button disabled={busy !== null} type="submit"
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {busy === 'invite' ? 'Creating…' : 'Create invite'}
            </button>
          </form>
          {inviteLink && <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="mb-2 flex justify-between gap-3 text-sm font-medium text-emerald-300">
              <span>One-time invitation link</span>
              <button onClick={() => { setInviteLink(null); setCopied(false); }} aria-label="Dismiss invitation"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input aria-label="Invitation link" readOnly value={inviteLink} onFocus={event => event.target.select()}
                className="min-w-0 flex-1 rounded-lg border border-emerald-500/20 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-300" />
              <button onClick={() => void copyLink()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/20 px-3 py-2 text-sm text-emerald-200">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Share securely with the intended email recipient. The secret is not recoverable from invitation history.</p>
          </div>}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-100">Invitations</h2>
          {invitations.length === 0
            ? <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-500">No invitation history.</div>
            : invitations.map(invitation => {
              const expired = invitation.status === 'pending' && new Date(invitation.expiresAt).getTime() <= Date.now();
              return <article key={invitation.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="min-w-0">
                  <div className="break-all font-medium text-slate-200">{invitation.email}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    {invitation.role} · {expired ? 'expired' : invitation.status} · Expires {formatDate(invitation.expiresAt)}
                  </div>
                </div>
                {invitation.status === 'pending' && !expired && mayManage(actorRole, invitation.role) && <button
                  disabled={busy !== null} onClick={() => void revoke(invitation)}
                  className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 disabled:opacity-40"
                >Revoke</button>}
              </article>;
            })}
        </section>
      </>}
    </div>
  );
}

export default function TeamPage() {
  const { currentOrg, isLoading } = useWorkspace();
  const { session } = useAuth();
  if (isLoading) return <div className="p-10 text-slate-400">Loading workspace…</div>;
  if (!currentOrg || !session) return <div className="text-slate-500">Select a workspace to view Team.</div>;
  return <TeamWorkspace key={currentOrg.id} organizationId={currentOrg.id} actorRole={currentOrg.role}
    actorUserId={session.user.id} />;
}
