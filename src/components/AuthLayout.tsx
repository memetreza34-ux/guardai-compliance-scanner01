import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

const steps = [
  ['01', 'Workspace erstellen', 'Mit einer Organisation beginnen.'],
  ['02', 'Target verifizieren', 'Domainbesitz über DNS nachweisen.'],
  ['03', 'Echte Ergebnisse prüfen', 'Scans, Evidence und Findings nachvollziehen.'],
];

export default function AuthLayout({ eyebrow, title, description, children }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="flex min-w-0 flex-col px-5 py-8 sm:px-10 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-200">
              <ArrowLeft className="h-4 w-4" /> Zur Website
            </Link>
            <Link to="/" className="mt-10 flex items-center gap-2.5" aria-label="GuardAI Startseite">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/10">
                <ShieldCheck className="h-5 w-5 text-indigo-300" />
              </span>
              <span className="text-lg font-semibold text-white">GuardAI</span>
            </Link>
            <div className="mt-12 text-xs font-semibold uppercase tracking-[0.19em] text-indigo-300">{eyebrow}</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
            <div className="mt-8">{children}</div>
            <p className="mt-10 border-t border-white/10 pt-6 text-xs leading-5 text-slate-600">
              GuardAI automatisiert begrenzte technische Prüfungen. Ergebnisse sind keine Sicherheitsgarantie, Zertifizierung oder Rechtsberatung.
            </p>
          </div>
        </section>
        <aside className="relative hidden min-h-screen overflow-hidden border-l border-white/10 bg-slate-900 lg:flex lg:items-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,rgba(99,102,241,0.18),transparent_45%)]" />
          <div className="relative mx-auto w-full max-w-lg px-12 py-20">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Evidence-first Technical GRC</div>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white">
              Wissen, was technisch wirklich geprüft wurde.
            </h2>
            <p className="mt-5 text-sm leading-7 text-slate-400">
              GuardAI verbindet autorisierte Targets mit nachvollziehbaren Security-Checks,
              gespeicherter Evidence und konkreten nächsten Schritten.
            </p>
            <div className="mt-10 space-y-3">
              {steps.map(([number, label, detail]) => (
                <div key={number} className="flex items-start gap-4 rounded-xl border border-white/8 bg-slate-950/60 p-4">
                  <span className="font-mono text-xs font-semibold text-indigo-300">{number}</span>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" /> {label}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
