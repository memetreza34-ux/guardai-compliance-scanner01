import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleDot, FileCheck2, Radar, ScanSearch, ShieldCheck, Target, Waypoints } from 'lucide-react';

const live = [
  ['Targets', 'Website-Targets mit serverseitiger Workspace-Zuordnung und DNS-Ownership-Verifizierung.'],
  ['Scans', 'Persistente Security-Scans über Queue/Worker statt lang laufender Browser-Requests.'],
  ['Evidence', 'Detector-, Versions-, Source-, Hash- und Zeitbezug für technische Beobachtungen.'],
  ['Findings', 'Lifecycle-Objekte mit Rule-Bezug, Severity, Remediation und Quelle im Scan.'],
];

const next = [
  ['Verified Remediation', 'Fix markieren reicht nicht: Re-Test und technische Verifikation werden ein eigener Workflow.'],
  ['Controls', 'Evidence und Tests werden auf kanonische Controls und versionierte Framework Requirements gemappt.'],
  ['Risk', 'Findings werden nicht mit Risiken gleichgesetzt, sondern gezielt mit Risk Records verbunden.'],
  ['Monitoring', 'Neue Scan-Zustände werden gegen frühere Zustände verglichen, damit Drift sichtbar wird.'],
];

export default function ProductPage() {
  return (
    <main>
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Produkt</div>
            <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-white">Ein technischer Evidence-Graph für Security und GRC.</h1>
            <p className="mt-6 text-lg leading-8 text-slate-400">
              GuardAI ist so aufgebaut, dass Scanner-Ergebnisse nicht in isolierten Reports verschwinden. Targets, Scans, Evidence, Findings und spätere Governance-Objekte bleiben miteinander verknüpft.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-5">
          {[
            [Target, 'Target'],
            [ScanSearch, 'Scan'],
            [FileCheck2, 'Evidence'],
            [CircleDot, 'Finding'],
            [Waypoints, 'Control / Risk'],
          ].map(([Icon, label], index) => {
            const IconComponent = Icon as typeof Target;
            return (
              <div key={String(label)} className="relative rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <IconComponent className="h-5 w-5 text-indigo-300" />
                <div className="mt-4 font-semibold text-white">{String(label)}</div>
                {index < 4 && <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-slate-700 lg:block" />}
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Bereits im Core
              </div>
              <div className="mt-6 space-y-4">
                {live.map(([title, text]) => (
                  <div key={title} className="rounded-xl border border-white/10 bg-slate-950 p-5">
                    <div className="font-semibold text-white">{title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-500">{text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
                <Radar className="h-4 w-4" /> Nächster Ausbau
              </div>
              <div className="mt-6 space-y-4">
                {next.map(([title, text]) => (
                  <div key={title} className="rounded-xl border border-indigo-400/10 bg-indigo-500/[0.04] p-5">
                    <div className="font-semibold text-white">{title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-500">{text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 sm:p-10">
          <ShieldCheck className="h-7 w-7 text-indigo-300" />
          <h2 className="mt-5 text-3xl font-semibold text-white">Produktwahrheit vor Feature-Anzahl.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
            Neue Module werden erst als aktiv dargestellt, wenn Datenmodell, Autorisierung, Persistenz, Fehlerzustände und Tests vorhanden sind. „Unknown“, „not assessed“ und „collection error“ dürfen nicht als grüne Ergebnisse erscheinen.
          </p>
          <Link to="/login" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200">
            Core ausprobieren <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
