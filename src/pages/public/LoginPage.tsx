import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import AuthLayout from '../../components/AuthLayout';

export function LoginPage() {
  const { session, isLoading, error: configurationError, supabase } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) setError(result.error.message);
      else navigate('/app', { replace: true });
    } catch {
      setError('Die Anmeldung ist derzeit nicht erreichbar. Bitte erneut versuchen.');
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Sitzung wird geladen…</div>;
  if (session) return <Navigate to="/app" replace />;

  return <AuthLayout eyebrow="Willkommen zurück" title="Bei GuardAI anmelden"
    description="Öffne deinen Workspace und arbeite mit echten technischen Scans, Evidence und Findings.">
    {configurationError ? <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
      Die Anmeldung ist noch nicht konfiguriert. Eine eigene GuardAI-Supabase-Umgebung ist erforderlich.
    </div> : <>
      {search.get('confirmed') === '1' && <div role="status"
        className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> E-Mail-Link geöffnet. Wenn die Bestätigung erfolgreich war, kannst du dich jetzt anmelden.
      </div>}
      {error && <div role="alert" className="mb-5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>}
      <form onSubmit={signIn} className="space-y-5">
        <label className="block space-y-2"><span className="text-sm font-medium text-slate-300">E-Mail-Adresse</span>
          <input type="email" required autoComplete="email" maxLength={254} value={email}
            onChange={e => setEmail(e.target.value)} disabled={busy} placeholder="name@unternehmen.de"
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-3 text-slate-100 outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/15" />
        </label>
        <label className="block space-y-2"><span className="flex items-center justify-between text-sm font-medium text-slate-300">
          Passwort <Link to="/forgot-password" className="font-normal text-indigo-300 hover:text-indigo-200">Vergessen?</Link>
        </span>
          <input type="password" required autoComplete="current-password" value={password}
            onChange={e => setPassword(e.target.value)} disabled={busy}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-3 text-slate-100 outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/15" />
        </label>
        <button disabled={busy} type="submit" className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-200 disabled:opacity-50">
          {busy ? 'Anmeldung läuft…' : 'Anmelden'}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-400">
        Noch keinen GuardAI-Account? <Link to="/signup" className="font-semibold text-indigo-300 hover:text-indigo-200">Kostenlos registrieren</Link>
      </p>
    </>}
  </AuthLayout>;
}
