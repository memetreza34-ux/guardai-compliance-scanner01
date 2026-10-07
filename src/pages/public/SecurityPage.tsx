import { Link } from 'react-router-dom';
import { ArrowRight, Database, Fingerprint, LockKeyhole, Network, ShieldCheck, TriangleAlert } from 'lucide-react';

const principles = [
  {
    icon: Fingerprint,
    title: 'Verified ownership',
    text: 'Website-Scans setzen verifizierte Domain-Kontrolle voraus. Ownership wird nicht mit Security gleichgesetzt.',
  },
  {
    icon: Database,
    title: 'Tenant-scoped data',
    text: 'Organisation und Benutzerrolle werden serverseitig geprüft. Frontend-Zustand ist niemals die Autoritätsquelle.',
  },
  {
    icon: Network,
    title: 'Bounded scanner behavior',
    text: 'Technische Fetch- und Worker-Pipelines werden als sicherheitskritische Boundary behandelt und sollen fail-closed arbeiten.',
  },
  {
    icon: LockKeyhole,
    title: 'Evidence provenance',
    text: 'Detector, Version, Zeit, Quelle und Hash helfen zu erklären, woher ein technisches Ergebnis stammt.',
  },
];

export default function SecurityPage() {
  return (
    <main>
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Security & Trust</div>
            <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-white">Security-Aussagen müssen genauso überprüfbar sein wie Scan-Ergebnisse.</h1>
            <p className="mt-6 text-lg leading-8 text-slate-400">
              GuardAI wird nach dem Prinzip gebaut, dass technische Grenzen, Fehlerzustände und Provenienz sichtbar bleiben. Eine hübsche grüne Ampel ersetzt keine Evidence.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          {principles.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10">
                <Icon className="h-5 w-5 text-indigo-300" />
              </div>
              <h2 className="mt-5 font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <ShieldCheck className="h-7 w-7 text-emerald-300" />
            <h2 className="mt-5 text-3xl font-semibold text-white">Was GuardAI bewusst unterscheidet</h2>
            <div className="mt-6 space-y-3 text-sm text-slate-400">
              {[
                'Domain verified ≠ secure',
                'Scan completed ≠ compliant',
                'No findings ≠ no vulnerabilities',
                'Evidence ≠ auditor opinion',
                'Manual resolved ≠ verified resolved',
                'AI assessment ≠ legal determination',
              ].map(item => (
                <div key={item} className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-xs">{item}</div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.05] p-6">
            <TriangleAlert className="h-6 w-6 text-amber-300" />
            <h2 className="mt-4 text-xl font-semibold text-white">Kein Zertifizierungsversprechen</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              GuardAI ist kein Certification Body, keine Rechtskanzlei und kein vollständiger Pentest-Ersatz. Der Wert liegt in reproduzierbarer technischer Evidence, klaren Grenzen und nachvollziehbarer Weiterverarbeitung.
            </p>
            <Link to="/contact" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-200 hover:text-amber-100">
              Security-Frage stellen <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
