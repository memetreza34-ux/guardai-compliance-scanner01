import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { fetchPublicPlans, type PublicPlan } from '../../api/billingApi';

const defaultPlans: PublicPlan[] = [
  {
    code: 'free',
    name: 'Free',
    price: '0 €',
    caption: 'Für den Einstieg',
    highlight: false,
    ctaText: 'Kostenlos starten',
    ctaLink: '/signup',
    features: ['1 Workspace', '1 verifiziertes Website Target', 'Monatlich 50 manuelle Security-Scans', 'Scan History & Evidence Provenance', 'Findings & Remediation-Anleitungen'],
  },
  {
    code: 'starter',
    name: 'Starter',
    price: 'Launch-Preis folgt',
    caption: 'Für kleine Teams',
    highlight: true,
    ctaText: 'Interesse vormerken',
    ctaLink: '/contact',
    features: ['Bis zu 5 Website Targets', 'Bis zu 5 Team Seats', 'Monatlich 500 Security-Scans', '3 aktive Monitoring-Schedules', 'Unveränderliche Report-Snapshots'],
  },
  {
    code: 'growth',
    name: 'Growth',
    price: 'Launch-Preis folgt',
    caption: 'Für wachsende Security/GRC-Teams',
    highlight: false,
    ctaText: 'Interesse vormerken',
    ctaLink: '/contact',
    features: ['Bis zu 25 Website Targets', 'Bis zu 15 Team Seats', 'Monatlich 2.500 Security-Scans', '15 aktive Monitoring-Schedules', 'Drift Detection & Trust Center Publikationen'],
  },
  {
    code: 'business',
    name: 'Business',
    price: 'Individuell',
    caption: 'Für komplexere Organisationen',
    highlight: false,
    ctaText: 'Kontakt aufnehmen',
    ctaLink: '/contact',
    features: ['Individuelle Target- & Scan-Kontingente', 'Granulare Rollen & Audit Log Workspace', 'Advanced AI Governance Guided Review', 'Dedizierter Support & Custom SLAs', 'API- & Webhook-Zugriff'],
  },
];

export default function PricingPage() {
  const [plans, setPlans] = useState<PublicPlan[]>(defaultPlans);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicPlans().then((serverPlans) => {
      if (!cancelled && serverPlans.length > 0) {
        setPlans(serverPlans);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <main>
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Pricing</div>
            <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-white">Ein kostenloser Einstieg. Bezahlt wird später für Skalierung und Automatisierung.</h1>
            <p className="mt-6 text-lg leading-8 text-slate-400">
              Das öffentliche Billing ist noch nicht freigeschaltet. Die Packaging-Struktur ist vorbereitet; bezahlte Pläne werden erst veröffentlicht, wenn Preis, Entitlements und Checkout gemeinsam produktionsreif sind.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-4">
          {plans.map(plan => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 ${
                plan.highlight
                  ? 'border-indigo-400/30 bg-indigo-500/[0.07]'
                  : 'border-white/10 bg-white/[0.025]'
              }`}
            >
              <div className="text-sm font-semibold text-white">{plan.name}</div>
              <div className="mt-1 text-xs text-slate-500">{plan.caption}</div>
              <div className="mt-6 min-h-14 text-2xl font-semibold tracking-tight text-white">{plan.price}</div>
              <div className="mt-6 space-y-3">
                {plan.features.map(feature => (
                  <div key={feature} className="flex items-start gap-2 text-sm text-slate-400">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
                    {feature}
                  </div>
                ))}
              </div>
              <Link
                to={plan.ctaLink || (plan.name === 'Free' ? '/signup' : '/contact')}
                className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                  plan.highlight
                    ? 'bg-white text-slate-950 hover:bg-slate-200'
                    : 'border border-white/10 text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {plan.ctaText || (plan.name === 'Free' ? 'Kostenlos starten' : 'Interesse vormerken')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-6 text-sm leading-7 text-slate-400">
          Kritische technische Findings sollen nicht künstlich hinter einem Paywall verschwinden. Die spätere Monetarisierung konzentriert sich auf Volumen, Automatisierung, Kollaboration, Integrationen und Enterprise-Governance.
        </div>
      </section>
    </main>
  );
}
