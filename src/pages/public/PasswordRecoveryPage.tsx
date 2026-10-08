import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import AuthLayout from '../../components/AuthLayout';

const inputStyle = 'w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-3 text-slate-100 outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/15';

export default function PasswordRecoveryPage({ mode }: { mode: 'request' | 'update' }) {
  const { session, supabase, isLoading, error: configurationError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: new URL('/auth/reset-password', window.location.origin).toString(),
      });
      if (result.error) setError(result.error.message);
      else setDone(true);
    } catch {
      setError('Die Anfrage konnte nicht abgeschlossen werden. Bitte später erneut versuchen.');
    } finally { setBusy(false); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session || busy) return;
    setError(null);
    if (password.length < 12 || password.length > 128) {
      setError('Das Passwort muss zwischen 12 und 128 Zeichen lang sein.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Die beiden Passwörter stimmen nicht überein.');
      return;
    }
    setBusy(true);
    try {
      const result = await supabase.auth.updateUser({ password });
      if (result.error) setError(result.error.message);
      else {
        setPassword('');
        setConfirmPassword('');
        setDone(true);
      }
    } catch {
      setError('Das Passwort konnte nicht geändert werden. Bitte erneut versuchen.');
    } finally { setBusy(false); }
  }

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Sitzung wird geladen…</div>;
  if (mode === 'request' && session) return <Navigate to="/app" replace />;

  return <AuthLayout eyebrow="Account-Sicherheit" title={mode === 'request' ? 'Passwort zurücksetzen' : 'Neues Passwort festlegen'}
    description={mode === 'request' ? 'Gib deine E-Mail-Adresse ein. Wenn ein Account existiert und der Versand eingerichtet ist, erhältst du eine E-Mail zum Zurücksetzen.' : 'Verwende den Link aus deiner Passwort-Zurücksetzen-E-Mail. Nach erfolgreicher Authentifizierung kannst du ein neues Passwort setzen.'}>
    {configurationError ? <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">Authentifizierung ist noch nicht konfiguriert.</div>
      : done ? <div role="status" className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6">
        <CheckCircle2 className="h-6 w-6 text-emerald-300" />
        <h2 className="mt-3 font-semibold text-white">{mode === 'request' ? 'Anfrage verarbeitet' : 'Passwort geändert'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">{mode === 'request'
          ? 'Falls für diese Adresse ein Account existiert, erhältst du Anweisungen per E-Mail. Prüfe gegebenenfalls auch den Spam-Ordner.'
          : 'Dein neues Passwort wurde vom Auth-Dienst angenommen.'}</p>
        <button onClick={() => navigate(mode === 'request' ? '/login' : '/app', { replace: true })}
          className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950">{mode === 'request' ? 'Zur Anmeldung' : 'Zum Workspace'}</button>
      </div>
      : <>
        {error && <div role="alert" className="mb-5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>}
        {mode === 'update' && !session ? <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
          Der Bestätigungslink ist abgelaufen oder die Rücksetzung wurde nicht authentifiziert. <Link to="/forgot-password" className="underline">Neuen Link anfordern</Link>.
        </div>
        : mode === 'request' ? <form onSubmit={requestReset} className="space-y-5">
          <label className="block space-y-2"><span className="text-sm font-medium text-slate-300">E-Mail-Adresse</span>
            <input type="email" required autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)}
              className={inputStyle} disabled={busy} /></label>
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">
            {busy ? 'Anfrage läuft…' : 'Link zum Zurücksetzen anfordern'}
          </button>
        </form> : <form onSubmit={changePassword} className="space-y-5">
          <label className="block space-y-2"><span className="text-sm font-medium text-slate-300">Neues Passwort</span>
            <input type="password" required autoComplete="new-password" minLength={12} maxLength={128}
              value={password} onChange={e => setPassword(e.target.value)} className={inputStyle} disabled={busy} /></label>
          <label className="block space-y-2"><span className="text-sm font-medium text-slate-300">Neues Passwort wiederholen</span>
            <input type="password" required autoComplete="new-password" minLength={12} maxLength={128}
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputStyle} disabled={busy} /></label>
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">
            {busy ? 'Wird gespeichert…' : 'Passwort ändern'}
          </button>
        </form>}
        <p className="mt-7 text-center text-sm text-slate-400"><Link to="/login" className="font-semibold text-indigo-300 hover:text-indigo-200">Zur Anmeldung</Link></p>
      </>}
  </AuthLayout>;
}
