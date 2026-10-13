const CATALOG_VERSION = '1.0.0';

const PLAN_CATALOG = Object.freeze({
  free: Object.freeze({
    code: 'free',
    name: 'Free',
    price: '0 €',
    billingPeriod: 'forever',
    caption: 'Für den Einstieg',
    highlight: false,
    ctaText: 'Kostenlos starten',
    ctaLink: '/signup',
    quotas: Object.freeze({
      website_targets: 1,
      seats: 1,
      security_scan: 50,
      monitor_schedules: 0,
    }),
    features: Object.freeze([
      '1 Workspace',
      '1 verifiziertes Website Target',
      'Monatlich 50 manuelle Security-Scans',
      'Scan History & Evidence Provenance',
      'Findings & Remediation-Anleitungen',
    ]),
    capabilities: Object.freeze(['security']),
  }),
  starter: Object.freeze({
    code: 'starter',
    name: 'Starter',
    price: 'Launch-Preis folgt',
    billingPeriod: 'month',
    caption: 'Für kleine Teams',
    highlight: true,
    ctaText: 'Interesse vormerken',
    ctaLink: '/contact',
    quotas: Object.freeze({
      website_targets: 5,
      seats: 5,
      security_scan: 500,
      monitor_schedules: 3,
    }),
    features: Object.freeze([
      'Bis zu 5 Website Targets',
      'Bis zu 5 Team Seats',
      'Monatlich 500 Security-Scans',
      '3 aktive Monitoring-Schedules',
      'Unveränderliche Report-Snapshots',
    ]),
    capabilities: Object.freeze(['security']),
  }),
  growth: Object.freeze({
    code: 'growth',
    name: 'Growth',
    price: 'Launch-Preis folgt',
    billingPeriod: 'month',
    caption: 'Für wachsende Security/GRC-Teams',
    highlight: false,
    ctaText: 'Interesse vormerken',
    ctaLink: '/contact',
    quotas: Object.freeze({
      website_targets: 25,
      seats: 15,
      security_scan: 2500,
      monitor_schedules: 15,
    }),
    features: Object.freeze([
      'Bis zu 25 Website Targets',
      'Bis zu 15 Team Seats',
      'Monatlich 2.500 Security-Scans',
      '15 aktive Monitoring-Schedules',
      'Drift Detection & Trust Center Publikationen',
    ]),
    capabilities: Object.freeze(['security', 'repository']),
  }),
  business: Object.freeze({
    code: 'business',
    name: 'Business',
    price: 'Individuell',
    billingPeriod: 'custom',
    caption: 'Für komplexere Organisationen',
    highlight: false,
    ctaText: 'Kontakt aufnehmen',
    ctaLink: '/contact',
    quotas: Object.freeze({
      website_targets: null,
      seats: null,
      security_scan: null,
      monitor_schedules: null,
    }),
    features: Object.freeze([
      'Individuelle Target- & Scan-Kontingente',
      'Granulare Rollen & Audit Log Workspace',
      'Advanced AI Governance Guided Review',
      'Dedizierter Support & Custom SLAs',
      'API- & Webhook-Zugriff',
    ]),
    capabilities: Object.freeze(['security', 'repository', 'privacy', 'accessibility', 'ai-governance']),
  }),
});

function getPlan(planCode) {
  if (!planCode || typeof planCode !== 'string') return null;
  return PLAN_CATALOG[planCode.toLowerCase()] || null;
}

function getPublicPlans() {
  return Object.values(PLAN_CATALOG).map((plan) => ({
    code: plan.code,
    name: plan.name,
    price: plan.price,
    billingPeriod: plan.billingPeriod,
    caption: plan.caption,
    highlight: plan.highlight,
    features: [...plan.features],
    ctaText: plan.ctaText,
    ctaLink: plan.ctaLink,
    quotas: { ...plan.quotas },
  }));
}

module.exports = {
  CATALOG_VERSION,
  PLAN_CATALOG,
  getPlan,
  getPublicPlans,
};
