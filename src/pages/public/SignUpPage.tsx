import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import AuthLayout from '../../components/AuthLayout';

const inputStyle = 'w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-3 text-slate-100 outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/15';

export default function SignUpPage() {
  const { session, isLoading, error: configurationError, supabase } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    setError(null);
    if (password.length < 12 || password.length > 128) {
      setError('Das Passwort muss zwischen 12 und 128 Zeichen lang sein.');
      return;
    }
    if (password !== confirmation) {
      setError('Die beiden Passwörter stimmen nicht überein.');
      return;
    }
    setBusy(true);
    try {
      const result = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: new URL('/login?confirmed=1', window.location.origin).toString() },
      });
      if (result.error) {
        setError(result.error.message);
      } else if (result.data.session) {
        navigate('/app', { replace: true });
      } else {
        setSubmitted(true);
        setPassword('');
        setConfirmation('');
      }
    } catch {
      setError('Registrierung derzeit nicht erreichbar. Bitte erneut versuchen.');
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Sitzung wird geladen…</div>;
  if (session) return <Navigate to="/app" replace />;

  return <AuthLayout eyebrow="Kostenlos starten" title="GuardAI Account erstellen"
    description="Erstelle deinen Account und lege anschließend deinen ersten Workspace an. Für den Einstieg ist kein Sales-Gespräch erforderlich.">
    {configurationError ? <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
      Die Registrierung ist noch nicht konfiguriert. GuardAI benötigt eine eigene Supabase-Auth-Umgebung.
    </div> : submitted ? <div role="status" className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6">
      <CheckCircle2 className="h-6 w-6 text-emerald-300" />
      <h2 className="mt-3 text-lg font-semibold text-slate-100">Registrierung angenommen</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        Falls eine Bestätigung nötig ist, erhältst du eine E-Mail. Öffne den Bestätigungslink und melde dich anschließend an. Die Zustellung hängt von der eingerichteten Auth-E-Mail-Konfiguration ab.
      </p>
      <Link to="/login" className="mt-5 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950">Zur Anmeldung</Link>
    </div> : <>
      {error && <div role="alert" className="mb-5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>}
      <form onSubmit={createAccount} className="space-y-5">
        <label className="block space-y-2"><span className="text-sm font-medium text-slate-300">Geschäftliche E-Mail</span>
          <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}
            placeholder="name@unternehmen.de" className={inputStyle} disabled={busy} /></label>
        <label className="block space-y-2"><span className="text-sm font-medium text-slate-300">Passwort</span>
          <input type="password" autoComplete="new-password" required minLength={12} maxLength={128}
            value={password} onChange={e => setPassword(e.target.value)} className={inputStyle} disabled={busy} />
          <span className="block text-xs text-slate-500">Mindestens 12 Zeichen. Verwende ein einzigartiges Passwort.</span></label>
        <label className="block space-y-2"><span className="text-sm font-medium text-slate-300">Passwort wiederholen</span>
          <input type="password" autoComplete="new-password" required minLength={12} maxLength={128}
            value={confirmation} onChange={e => setConfirmation(e.target.value)} className={inputStyle} disabled={busy} /></label>
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:opacity-50">
          {busy ? 'Account wird erstellt…' : 'Kostenlosen Account erstellen'}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-400">Bereits registriert? <Link to="/login" className="font-semibold text-indigo-300 hover:text-indigo-200">Anmelden</Link></p>
    </>}
  </AuthLayout>;
}
