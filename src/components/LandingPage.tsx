import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Fingerprint,
  Radar,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';

const currentCapabilities = [
  {
    icon: Fingerprint,
    title: 'Verified Targets',
    text: 'Domain-Ownership per DNS-TXT, bevor technische Website-Scans gestartet werden.',
  },
  {
    icon: ScanSearch,
    title: 'Persistent Security Scans',
    text: 'Worker-basierte Security-Checks mit gespeichertem Ausführungsstatus statt flüchtiger Demo-Resultate.',
  },
  {
    icon: FileCheck2,
    title: 'Evidence & Findings',
    text: 'Detector, Version, Quelle, Hash, Zeitpunkt und daraus abgeleitete Findings bleiben nachvollziehbar verknüpft.',
  },
];

const nextCapabilities = [
  'Remediation → Re-Test → Verified Resolved',
  'Controls & Framework Requirements',
  'Risk Register & Ownership',
  'Continuous Monitoring & Drift',
];

export function LandingPage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-18rem] h-[36rem] w-[56rem] -translate-x-1/2 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="absolute right-[-12rem] top-40 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/8 px-3 py-1.5 text-xs font-semibold text-indigo-200">
              <Sparkles className="h-3.5 w-3.5" />
              Evidence-first Technical GRC
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
              Aus technischen Checks wird belastbare Evidence.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              GuardAI verbindet verifizierte Targets, persistente Scans, technische Evidence und Findings in einem nachvollziehbaren Workflow — ohne aus fehlenden Daten automatisch „bestanden“ zu machen.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-200"
              >
                Kostenlos starten <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/product"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/[0.06]"
              >
                Produkt ansehen
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Kein Sales-Call für den Einstieg nötig</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Tenant-scoped Datenmodell</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Evidence-Provenienz</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-indigo-500/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">GuardAI Workspace</div>
                  <div className="mt-1 font-semibold text-white">Technical posture</div>
                </div>
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                  Target verified
                </div>
              </div>

              <div className="grid gap-3 p-5 sm:grid-cols-3">
                {[
                  ['Scans', '12', 'Persistent runs'],
                  ['Findings', '4', 'Open technical'],
                  ['Evidence', '37', 'Stored records'],
                ].map(([label, value, sub]) => (
                  <div key={label} className="rounded-xl border border-white/8 bg-slate-950/70 p-4">
                    <div className="text-xs text-slate-500">{label}</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
                    <div className="mt-1 text-[11px] text-slate-600">{sub}</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-200">Recent technical findings</div>
                  <div className="text-xs text-slate-600">Evidence linked</div>
                </div>
                <div className="space-y-2">
                  {[
                    ['warning', 'HSTS header not observed', 'security.hsts@3'],
                    ['warning', 'CSP policy missing', 'security.csp@2'],
                    ['info', 'Server header exposed', 'security.server-header@1'],
                  ].map(([severity, title, rule]) => (
                    <div key={rule} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-slate-300">{title}</div>
                        <div className="mt-0.5 font-mono text-[10px] text-slate-600">{rule}</div>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                        severity === 'warning'
                          ? 'bg-amber-500/10 text-amber-300'
                          : 'bg-sky-500/10 text-sky-300'
                      }`}>
                        {severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/10 bg-slate-950/50 px-5 py-3 text-[11px] text-slate-600">
                UI preview uses illustrative counts. Product results are always derived from the active workspace.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Heute im Produkt</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Der Kern ist nicht mehr nur eine Demo.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-400">
            Der aktuelle GuardAI-Core arbeitet bereits mit echten Workspace-Daten, serverseitiger Autorisierung und persistierten Scan-Ergebnissen.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {currentCapabilities.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10">
                <Icon className="h-5 w-5 text-indigo-300" />
              </div>
              <h3 className="mt-5 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Ein Datenmodell statt Inseln</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Von der technischen Realität bis zur Assurance.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              GuardAI wird entlang eines einzigen Evidence-Graphs ausgebaut. Neue Module sollen dieselben Targets, Evidence, Findings, Controls und Risiken nutzen — nicht separate Wahrheitssysteme erzeugen.
            </p>
            <Link to="/product" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 hover:text-indigo-200">
              Architektur ansehen <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['1', 'Target / Asset', 'Was wird geprüft und wem gehört es?'],
              ['2', 'Scan / Observation', 'Was wurde tatsächlich ausgeführt und beobachtet?'],
              ['3', 'Evidence / Finding', 'Welche Evidence stützt welches technische Finding?'],
              ['4', 'Control / Risk', 'Welche Governance-Relevanz folgt daraus?'],
            ].map(([step, title, text]) => (
              <div key={step} className="rounded-xl border border-white/10 bg-slate-950 p-5">
                <div className="text-xs font-semibold text-indigo-300">0{step}</div>
                <div className="mt-3 font-semibold text-white">{title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-500">{text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-slate-950 p-8 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
              <Radar className="h-4 w-4" /> Als Nächstes
            </div>
            <h2 className="mt-3 text-3xl font-semibold text-white">Der Core wird bis zum echten GRC-Workflow erweitert.</h2>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {nextCapabilities.map(item => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-400">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <Link to="/product" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200">
            Roadmap verstehen <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 flex gap-3 rounded-2xl border border-amber-500/15 bg-amber-500/[0.06] p-5">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <p className="text-sm leading-6 text-slate-400">
            GuardAI trennt technische Evidence von rechtlicher oder auditorischer Bewertung. Ein erfolgreicher Scan ist keine Zertifizierung, keine Rechtsberatung und keine Garantie, dass keine weiteren Risiken existieren.
          </p>
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <ShieldCheck className="mx-auto h-8 w-8 text-indigo-300" />
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white">Baue technische Trust-Evidence auf, die man nachvollziehen kann.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400">
            Starte mit einem Workspace, verifiziere dein erstes Target und führe den verfügbaren Security-Scan aus.
          </p>
          <Link to="/login" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200">
            GuardAI öffnen <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
