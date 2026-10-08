import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, Users } from 'lucide-react';
import { createTeamApi } from '../../api/teamApi';
import { useAuth } from '../../auth/AuthProvider';

function readInviteToken() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  return new URLSearchParams(hash).get('token');
}

export default function JoinTeamPage() {
  const { session, supabase, isLoading } = useAuth();
  const navigate = useNavigate();
  const [token] = useState(readInviteToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  // The fragment is never sent to the server as an HTTP path, and is removed
  // from browser history immediately after React captures the one-time token.
  useEffect(() => { window.history.replaceState(null, '', '/join'); }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase) { setError('Authentication is not configured.'); return; }
    setBusy(true); setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
    } catch (err) { setError(err instanceof Error ? err.message : 'Sign-in failed.'); }
    finally { setBusy(false); }
  }

  async function accept() {
    if (!session?.access_token || !token || busy) return;
    setBusy(true); setError(null);
    try {
      const api = createTeamApi(async () => session.access_token);
      await api.acceptInvitation(token);
      setAccepted(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Invitation could not be accepted.'); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
    <section className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
        <Users className="h-6 w-6 text-indigo-300" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold">Join a GuardAI organization</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        An invitation is valid only for the matching confirmed email account. Acceptance creates organization membership; it does not grant any role beyond the invitation.
      </p>

      {error && <div role="alert" className="mt-5 flex gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
        <ShieldAlert className="h-5 w-5 shrink-0" /> {error}
      </div>}

      {accepted ? <div className="mt-6">
        <div className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Invitation accepted</div>
        <button onClick={() => navigate('/app')} className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white">Open workspace</button>
      </div> : !token ? <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
        No invitation secret is available on this page. Reopen the original invitation link.
      </div> : isLoading ? <div className="mt-6 text-sm text-slate-500">Loading account…</div> : session ? <>
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
          Signed in as <span className="text-slate-200">{session.user.email}</span>
        </div>
        <button onClick={() => void accept()} disabled={busy}
          className="mt-5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {busy ? 'Accepting…' : 'Accept invitation'}
        </button>
      </> : <>
        <p className="mt-5 text-sm text-slate-400">Sign in with the invited email address. If you do not have a confirmed GuardAI account, create and confirm one first, then reopen the original invitation link.</p>
        <form onSubmit={signIn} className="mt-5 space-y-3">
          <input aria-label="Email" type="email" required autoComplete="email" placeholder="Email" value={email}
            onChange={event => setEmail(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200" />
          <input aria-label="Password" type="password" required autoComplete="current-password" placeholder="Password" value={password}
            onChange={event => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200" />
          <button type="submit" disabled={busy}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </>}
      <Link to="/" className="mt-8 inline-block text-sm text-slate-500 hover:text-slate-200">Return to GuardAI</Link>
    </section>
  </main>;
}
