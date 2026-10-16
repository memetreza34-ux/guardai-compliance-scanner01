import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

const betaFeatures = [
  'Eigene Website registrieren und Domain-Kontrolle per DNS nachweisen',
  'Ausgewählte technische HTTP-Sicherheitsprüfungen ausführen',
  'Findings mit zugehörigen technischen Nachweisen ansehen',
  'Änderungen durch einen gezielten Re-Test überprüfen',
  'Nachvollziehbare technische Berichte einsehen',
];

export default function PricingPage() {
  return (
    <main>
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Preise & Beta</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Zuerst eine zuverlässige Website-Sicherheitsprüfung.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-400">
              GuardAI konzentriert sich zunächst auf eine begrenzte technische Security-Basis.
              Bezahlte Abonnements sind noch nicht freigeschaltet. Preise, Kontingente und
              zusätzliche Funktionen werden erst veröffentlicht, wenn sie technisch geprüft sind.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-indigo-400/20 bg-slate-900 p-7 sm:p-10">
          <div className="flex items-center gap-3 text-indigo-300">
            <ShieldCheck className="h-6 w-6" />
            <span className="text-sm font-semibold">V1 – Beta-Funktionsumfang</span>
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-white">Was die erste Version bieten soll</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            Die Funktionen werden vor der öffentlichen Freigabe mit echten Testdaten geprüft.
            Es gibt derzeit kein verbindliches öffentliches Scan- oder Website-Kontingent.
          </p>
          <ul className="mt-7 space-y-3">
            {betaFeatures.map(feature => (
              <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200">
              Account erstellen <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/contact" className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5">
              Frage zur Beta stellen
            </Link>
          </div>
        </div>
        <p className="mt-6 text-sm leading-7 text-slate-500">
          GuardAI ist kein Penetrationstest und keine rechtsverbindliche Compliance-Prüfung.
          Ein Scan belegt nur die tatsächlich ausgeführten technischen Checks.
        </p>
      </section>
    </main>
  );
}
