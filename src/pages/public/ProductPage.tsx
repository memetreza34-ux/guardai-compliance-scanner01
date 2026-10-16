import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileCheck2, RefreshCw, ScanSearch, ShieldCheck, Target } from 'lucide-react';

const steps = [
  { icon: Target, title: '1. Website hinterlegen', text: 'Eigene Website eintragen und die Domain-Kontrolle per DNS bestätigen.' },
  { icon: ScanSearch, title: '2. Technisch prüfen', text: 'Ausgewählte HTTP-Sicherheitskonfigurationen werden mit klar abgegrenzten Checks untersucht.' },
  { icon: ShieldCheck, title: '3. Findings verstehen', text: 'Ergebnis, Ursache, Schweregrad und technische Nachweise bleiben nachvollziehbar.' },
  { icon: RefreshCw, title: '4. Korrigieren & erneut prüfen', text: 'Änderungen gezielt testen; manuell als behoben markiert ist nicht automatisch verifiziert.' },
  { icon: FileCheck2, title: '5. Ergebnis dokumentieren', text: 'Der technische Bericht zeigt Zeitpunkt, geprüften Umfang und relevante Nachweise.' },
];

export default function ProductPage() {
  return (
    <main>
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">GuardAI V1</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Website-Sicherheitsprobleme erkennen, verstehen und erneut prüfen.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-400">
              Keine undurchsichtige Compliance-Ampel: GuardAI zeigt, was technisch geprüft
              wurde, welche Findings daraus entstanden sind und wie sich Verbesserungen nachweisen lassen.
            </p>
            <Link to="/signup" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200">
              Account erstellen <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-white">Ein Ablauf, fünf verständliche Schritte</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-slate-900 p-6">
              <Icon className="h-6 w-6 text-indigo-300" />
              <h3 className="mt-5 text-base font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-300">
            <CheckCircle2 className="h-5 w-5" /> Ehrlicher Funktionsumfang
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">Eine technische Baseline statt einer All-in-one-Zertifizierung</h2>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Der erste Release konzentriert sich auf eine begrenzte HTTP-Sicherheitsprüfung.
            Repository-Scans, Datenschutz-Browser-Checks, AI Governance, erweiterte
            Compliance-Frameworks und Enterprise-Funktionen gehören nicht zur V1.
            Die Kernfunktionen werden vor der öffentlichen Freigabe in einer eigenen
            Testumgebung verifiziert.
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Kein Finding bedeutet nicht automatisch keine Sicherheitslücke.
            GuardAI ist weder eine Zertifizierungsstelle noch ein Ersatz für einen Penetrationstest.
          </p>
        </div>
      </section>
    </main>
  );
}
