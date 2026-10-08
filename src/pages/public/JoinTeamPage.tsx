import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, Users } from 'lucide-react';
import { createTeamApi } from '../../api/teamApi';
import { useAuth } from '../../auth/AuthProvider';

type AuthMode = 'signin' | 'signup';

function readInviteToken() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  return new URLSearchParams(hash).get('token');
}

const fieldStyle = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500';

export default function JoinTeamPage() {
  const { session, supabase, isLoading } = useAuth();
  const navigate = useNavigate();
  const [token] = useState(readInviteToken);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Invitation tokens are kept only in component memory. Removing the hash
  // prevents accidental copying, external referrers or history persistence.
  // Confirmation-required signups must reopen the original private invite.
  useEffect(() => { window.history.replaceState(null, '', '/join'); }, []);

  async function authorize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !token || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') {
        if (password.length < 12 || password.length > 128) {
          setError('Das Passwort muss zwischen 12 und 128 Zeichen lang sein.');
          return;
        }
        if (password !== passwordConfirmation) {
          setError('Die Passwörter stimmen nicht überein.');
          return;
        }
        const result = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: new URL('/login?confirmed=1', window.location.origin).toString() },
        });
        if (result.error) setError(result.error.message);
        else if (!result.data.session) {
          setConfirmationPending(true);
          setPassword('');
          setPasswordConfirmation('');
        }
        // With an immediately authenticated session, onAuthStateChange
        // exposes the acceptance action without losing the invite secret.
      } else {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) setError(result.error.message);
      }
    } catch {
      setError('Der Auth-Dienst ist derzeit nicht erreichbar. Bitte erneut versuchen.');
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    if (!session?.access_token || !token || busy) return;
    setBusy(true); setError(null);
    try {
      await createTeamApi(async () => session.access_token).acceptInvitation(token);
      setAccepted(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Einladung konnte nicht angenommen werden.');
    } finally {
      setBusy(false);
    }
  }

  async function switchAccount() {
    if (!supabase || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await supabase.auth.signOut();
      if (result.error) setError(result.error.message);
    } catch {
      setError('Abmelden derzeit nicht möglich.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:py-20">
    <section className="mx-auto max-w-lg space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black/20 sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
        <Users className="h-6 w-6 text-indigo-300" />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-300">GuardAI Team</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Organisation beitreten</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Die Einladung funktioniert nur mit dem GuardAI-Konto der eingeladenen, bestätigten E-Mail-Adresse.
          Dein Zugang richtet sich nach der Rolle in der Einladung.
        </p>
      </div>
      {error && <div role="alert" className="flex gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
        <ShieldAlert className="h-5 w-5 shrink-0" /> {error}
      </div>}
      {accepted ? <div role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">
        <div className="flex items-center gap-2 font-semibold text-emerald-300"><CheckCircle2 className="h-5 w-5" /> Einladung angenommen</div>
        <p className="mt-2 text-sm text-slate-300">Du bist jetzt Mitglied der Organisation.</p>
        <button onClick={() => navigate('/app', { replace: true })}
          className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950">Workspace öffnen</button>
      </div> : !token ? <div role="alert" className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
        Kein gültiger Einladungslink geöffnet. Bitte öffne den ursprünglichen privaten Link erneut.
      </div> : isLoading ? <div className="text-sm text-slate-500">Konto wird geladen…</div> : session ? <>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
          Angemeldet als <span className="font-medium text-slate-200">{session.user.email}</span>
          <p className="mt-2 text-xs text-slate-500">Ist das nicht die eingeladene E-Mail-Adresse? Wechsle das Konto, bevor du fortfährst.</p>
        </div>
        <button onClick={() => void accept()} disabled={busy}
          className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">
          {busy ? 'Einladung wird geprüft…' : 'Einladung annehmen'}
        </button>
        <button onClick={() => void switchAccount()} disabled={busy}
          className="w-full rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 disabled:opacity-50">
          Anderes Konto verwenden
        </button>
      </> : confirmationPending ? <div role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">
        <CheckCircle2 className="h-6 w-6 text-emerald-300" />
        <h2 className="mt-3 font-semibold text-slate-100">Registrierung angenommen</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Falls E-Mail-Bestätigung aktiviert ist, bestätige dein Konto. Öffne anschließend den <strong>ursprünglichen Einladungslink</strong> erneut – der geheime Token wird absichtlich nicht im Browser gespeichert.
        </p>
      </div> : <>
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
          <button type="button" onClick={() => { setMode('signin'); setError(null); }}
            aria-pressed={mode === 'signin'} className={`rounded-lg px-3 py-2.5 text-sm font-medium ${mode === 'signin' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>
            Anmelden
          </button>
          <button type="button" onClick={() => { setMode('signup'); setError(null); }}
            aria-pressed={mode === 'signup'} className={`rounded-lg px-3 py-2.5 text-sm font-medium ${mode === 'signup' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>
            Neu registrieren
          </button>
        </div>
        <form onSubmit={authorize} className="space-y-4">
          <label className="block space-y-2"><span className="text-sm font-medium text-slate-300">E-Mail-Adresse der Einladung</span>
            <input type="email" aria-label="E-Mail-Adresse" required autoComplete="email" maxLength={254}
              placeholder="name@unternehmen.de" value={email} onChange={event => setEmail(event.target.value)}
              disabled={busy} className={fieldStyle} /></label>
          <label className="block space-y-2"><span className="text-sm font-medium text-slate-300">Passwort</span>
            <input type="password" aria-label="Passwort" required
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={mode === 'signup' ? 12 : undefined} maxLength={128}
              value={password} onChange={event => setPassword(event.target.value)}
              disabled={busy} className={fieldStyle} /></label>
          {mode === 'signup' && <label className="block space-y-2"><span className="text-sm font-medium text-slate-300">Passwort bestätigen</span>
            <input type="password" aria-label="Passwort bestätigen" required autoComplete="new-password"
              minLength={12} maxLength={128} value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)}
              disabled={busy} className={fieldStyle} /></label>}
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">
            {busy ? 'Bitte warten…' : mode === 'signup' ? 'Konto für Einladung erstellen' : 'Anmelden und fortfahren'}
          </button>
        </form>
        {mode === 'signup' ? <p className="text-xs leading-5 text-slate-500">Mindestens 12 Zeichen. Bei notwendiger E-Mail-Bestätigung muss der Original-Einladungslink anschließend erneut geöffnet werden.</p>
          : <p className="text-xs text-slate-500">Passwort vergessen? <Link to="/forgot-password" className="text-indigo-300 hover:underline">Zurücksetzen</Link>. Danach die ursprüngliche Einladung erneut öffnen.</p>}
      </>}
      <Link to="/" className="inline-block text-sm text-slate-500 hover:text-slate-200">Zur GuardAI Website</Link>
    </section>
  </main>;
}
