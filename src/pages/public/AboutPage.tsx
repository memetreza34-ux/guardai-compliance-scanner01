import { Link } from 'react-router-dom';
import { ArrowRight, Layers3, ShieldCheck, Waypoints } from 'lucide-react';

export default function AboutPage() {
  return (
    <main>
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Über GuardAI</div>
            <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-white">Technische Website-Sicherheit soll verständlicher werden.</h1>
            <p className="mt-6 text-lg leading-8 text-slate-400">
              GuardAI konzentriert sich zunächst auf eine einfache Aufgabe: Website-Sicherheitsprüfungen nachvollziehbar machen und bei der Behebung erkannter Probleme helfen.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [ShieldCheck, 'Evidence vor Behauptung', 'Nur tatsächlich gemessene oder dokumentierte Zustände dürfen als Evidence erscheinen.'],
            [Layers3, 'Ein nachvollziehbarer Prüfpfad', 'Website, Scan, Beobachtung, Finding und Re-Test müssen klar verbunden und überprüfbar sein.'],
            [Waypoints, 'Technische Grenzen bleiben sichtbar', 'Ein technischer Scan bedeutet keine Zertifizierung, rechtliche Freigabe oder garantierte Sicherheit.'],
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
            Für V1 gilt: Website registrieren → Domain verifizieren → technischen Security-Scan ausführen → Findings verstehen → beheben und erneut prüfen → technischen Bericht lesen. Erweiterte Module bleiben für später vorgesehen.
          </p>
          <Link to="/product" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 hover:text-indigo-200">
            Produktstruktur ansehen <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
