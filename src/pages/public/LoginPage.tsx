import { useEffect, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/button';

export function LoginPage() {
  const { session, isLoading, error: configError, supabase } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (session) navigate('/app', { replace: true });
  }, [session, navigate]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Session wird geladen…</div>;
  }

  if (session) return <Navigate to="/app" replace />;

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setIsSigningIn(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    else navigate('/app', { replace: true });
    setIsSigningIn(false);
  }

  async function handleSignUp() {
    if (!supabase) return;
    setIsSigningIn(true);
    setAuthError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setAuthError(error.message);
    else setAuthError('Prüfe dein E-Mail-Postfach und bestätige die Registrierung.');
    setIsSigningIn(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300">
              <ArrowLeft className="h-4 w-4" /> Zur Website
            </Link>

            <Link to="/" className="mt-8 flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/10">
                <ShieldCheck className="h-5 w-5 text-indigo-300" />
              </span>
              <span className="text-lg font-semibold text-white">GuardAI</span>
            </Link>

            <h1 className="mt-8 text-3xl font-semibold tracking-tight text-white">Workspace öffnen</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Anmelden oder einen neuen GuardAI-Account erstellen.</p>

            {configError ? (
              <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-300">
                <p className="font-semibold">Authentication ist nicht konfiguriert</p>
                <p className="mt-2 text-sm text-rose-300/80">Die erforderlichen Supabase-Umgebungsvariablen fehlen.</p>
              </div>
            ) : (
              <form className="mt-8 space-y-4" onSubmit={handleSignIn}>
                {authError && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                    {authError}
                  </div>
                )}
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-300">E-Mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-3 text-slate-100 outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/15"
                    placeholder="name@unternehmen.de"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-300">Passwort</span>
                  <input
                    type="password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-3 text-slate-100 outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/15"
                    placeholder="••••••••"
                  />
                </label>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-white text-slate-950 hover:bg-slate-200"
                  disabled={isSigningIn}
                >
                  {isSigningIn ? 'Wird geladen…' : 'Anmelden'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-xl border-white/10 bg-transparent text-slate-300 hover:bg-white/[0.05] hover:text-white"
                  onClick={handleSignUp}
                  disabled={isSigningIn}
                >
                  Kostenlosen Account erstellen
                </Button>
              </form>
            )}
          </div>
        </section>

        <aside className="relative hidden overflow-hidden border-l border-white/10 bg-slate-900 lg:flex lg:items-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_45%)]" />
          <div className="relative mx-auto max-w-xl px-12">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Evidence-first workflow</div>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">Technische Ergebnisse, deren Herkunft sichtbar bleibt.</h2>
            <div className="mt-8 space-y-4">
              {[
                'Verified targets statt ungeprüfter Scanner-Ziele',
                'Persistente Scan-History und Worker-Status',
                'Evidence mit Detector- und Versionsbezug',
                'Findings mit Source Scan und Remediation',
              ].map(item => (
                <div key={item} className="flex items-start gap-3 text-sm text-slate-400">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
