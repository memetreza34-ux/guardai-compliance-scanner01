import { Link } from 'react-router-dom';
import { ArrowRight, Layers3, ShieldCheck, Waypoints } from 'lucide-react';

export default function AboutPage() {
  return (
    <main>
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Über GuardAI</div>
            <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-white">GRC soll näher an der technischen Realität liegen.</h1>
            <p className="mt-6 text-lg leading-8 text-slate-400">
              GuardAI wird als Technical-GRC-Plattform gebaut: zuerst echte Beobachtungen und Evidence, danach Findings, Remediation, Controls, Risk und Assurance.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [ShieldCheck, 'Evidence vor Behauptung', 'Nur tatsächlich gemessene oder dokumentierte Zustände dürfen als Evidence erscheinen.'],
            [Layers3, 'Eine gemeinsame Datenbasis', 'Scanner, Governance und Assurance sollen dieselben kanonischen Objekte nutzen.'],
            [Waypoints, 'Human review bleibt sichtbar', 'Rechtliche, organisatorische und auditorische Entscheidungen werden nicht als reine Scanner-Ausgabe verkauft.'],
          ].map(([Icon, title, text]) => {
            const IconComponent = Icon as typeof ShieldCheck;
            return (
              <div key={String(title)} className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <IconComponent className="h-6 w-6 text-indigo-300" />
                <h2 className="mt-5 font-semibold text-white">{String(title)}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{String(text)}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-3xl border border-white/10 bg-slate-900 p-8 sm:p-10">
          <h2 className="text-3xl font-semibold text-white">Aktueller Fokus</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
            Der V1-Core wird entlang des realen Workflows fertiggestellt: Targets → Scans → Evidence → Findings → Remediation/Re-Test → Controls → Risk → Monitoring. Breitere Enterprise-Funktionen werden danach auf diese Basis gesetzt.
          </p>
          <Link to="/product" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 hover:text-indigo-200">
            Produktstruktur ansehen <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
