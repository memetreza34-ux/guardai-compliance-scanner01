# GuardAI – Abonnements, Monetarisierung, Entitlements und vollständiger Kundenlebenszyklus

**Stand:** 2026-10-09 · **Status:** KONZEPT/Umsetzungsvorgabe – keine freigegebenen Preise oder Quoten, keine Behauptung aktiver Stripe-Zahlungen.  
**Quellen im Repo:** `src/pages/public/PricingPage.tsx`, `src/pages/app/BillingPage.tsx`, `server/services/billingService.js`, `server/domain/entitlements.js`, `database/006_*`, `016_*`, `017_*` und `docs/adr/0003-*`. Abweichungen zwischen Marketing und Autorisierung sind aktuell möglich und müssen vor öffentlichem Verkauf beseitigt werden.

## 1. Wer soll bezahlen und für was?

**Zahlungsbereitschaftshypothese:** ein einzelner Betreiber bezahlt wenig oder nichts für gelegentliche Security-Checks; eine Agentur/ein SaaS-Team bezahlt für **mehr Assets, Automatisierung, Historie, Kollaboration, Reports, Monitoring und risikobegrenzte Integrationen**, nicht für ein bloßes KI-Label.

**Prinzipien:**
1. Free ist ein tatsächlich nützlicher Einstieg, keine Attrappe: 1 verifiziertes Website Target und realer begrenzter Security-Scan-Pfad **erst, wenn diese Limits im Backend wirklich durchgesetzt werden**.
2. Paid monetarisiert klare Kosten-/Arbeitsersparnis; Gate ist serverseitig, browserbasierter „Premium“-State wertlos.
3. Limits nach **Workspace/Organisation**, nicht zufällig pro Login, und eindeutig bei Seats, Targets, Scans/Monat, Schedules, Report-/Retention-Budgets, integrationsspezifischen Kosten und Support.
4. Keine unbegrenzten teuren Browser- oder KI-Scans ohne Kostenbudget, Abuse-Control, Rate Limits und Worker-Concurrency.
5. Kunden müssen **vor** Zahlung sehen, was freigeschaltet wird, was bei Downgrade geschieht und wie Kündigung/Retention funktionieren.
6. Keine erzwungene Testphase, Lock-in oder Dark Patterns. Paid Checkout erst wenn Vertrags-/Steuer-/Widerrufs- und Supportbedingungen geklärt sind.

## 2. Vorschlag für 4 Pakete (keine erfundenen Preise)

| Merkmal | Free | Starter | Growth | Business |
|---|---|---|---|---|
| Zielnutzer | Einzelperson, erste echte Prüfung | kleine SaaS-/Web-Teams | Agenturen, aktive GRC-/Security-Teams | anspruchsvollere Unternehmen |
| Website Targets | 1 vorgeschlagen | moderat mehr | viele im Plan-Limit | verhandelte/konfigurierte Grenze |
| Scans/Monat | kleiner fairer Pool | größerer Pool | planbarer hoher Pool | Vertragskontingent |
| Security Baseline | ja, freigeschaltet und nachweisbar | ja | ja | ja |
| Remediation/Re-Test | Basiskern verfügbar | ja | ja | ja |
| Evidence + Historie | Basis | mehr Retention | ausführlich | vereinbarte Retention |
| Monitoring/Alert | optional stark limitiert oder nicht | begrenzt | mehrere Monitore/Targets | mehrere Teamkonfigurationen |
| Team Seats | 1 | mehrere | mehr, rollenbasiert | vertraglich/SSO später |
| Reports/Trust | begrenzt oder Vorschau | technische Reports | Share/Trust & bessere Retention | Auditor-/Exportfeatures später |
| Controls/Risk | interne Baseline lesen | Basis | Risk Workflows | kontrolliertes Audit/Access später |
| GitHub App | spätere freigegebene Basis | optional, nach Staging | enthalten nach Feature-Gate | größere Budgets/Support |
| AI Governance | Lesestufe/kein Paid-Urteil | Human Review optional | Human Review Workflows | juristisch reviewte Enterprise-Funktionen später |
| Support | self-service | Standard | bevorzugt (nach Betriebsfähigkeit) | SLA nur wenn real vertraglich erfüllbar |
| Preis | 0 € | vom Betreiber festzulegen | vom Betreiber festzulegen | individuell |

**Dieser Tabelle darf keine öffentlich verkaufbare Price/Limit-Kombination entnommen werden, bevor die Zahlen ausdrücklich beschlossen und technisch serverseitig konfiguriert/getestet sind.** Beschränkungen sind **Entscheidungen**, keine abgeleiteten Eigenschaften des aktuellen Codes. Während des Pre-Launch Paid-Pläne als geplant/Interesse markieren.

### Vorschlag für die Preisentscheidung

**Keine konkreten Eurobeträge ohne Kosten- und Marktanalyse.** Bewertungsmodell:
- Bruttokosten pro GuardAI Workspace: Auth/DB, API/Worker, DNS, Storage/Evidence, Report, GitHub Provider, Monitoring, Email, Abuse, Payment Fees, Support und zukünftige Browser-/AI-Calls.
- Grenzkosten pro Website-Scan und Monitoringmonat real messen, bevor ein Scanlimit final wird.
- Preispositionierung nicht aus beliebigen Wettbewerberlisten raten; differenzieren über belegbaren Developer-first Nutzen.
- Private SaaS Zielgruppe vs gewerbliche B2B Zielgruppe und EU Rechnungs-/Umsatzsteuerkonsequenzen klären.
- Kein „unlimited“ ohne Budget-/FUP-Definition und technisch testbare Rate-Ceiling.
- Preisschwellen, Trial-Länge, annual discount, VAT display, Seat-Modell, fair-use und Mindestpreis sind **Owner-Entscheidungen** vor Launch, keine technischen Defaults.

## 3. Metriken und Entitlement-Keys – serverseitige Wahrheit

**Aktuelle Code-Fakten:** `server/domain/entitlements.js` mappt für künftige Module `browser_scan`, `ai_screening`, `repository_scan`, `ai_document_screening`. `security` liefert derzeit `null` bei `capabilityForModule()`: **keine automatische Security-Scan-Quota-Prüfung aus diesem Capability-Mapping ableiten**.

**Bevor Paid/Free als vertragsrelevante Grenzen veröffentlicht wird:** prüfen, ob die folgenden realen Quoten existieren; sonst neues validiertes Capability- und Usage-Modell mit migration, RBAC und concurrency Tests schaffen.

| Mess-/Limit-Dimension | Kanonische Semantik | Zählmoment / Ausnahme |
|---|---|---|
| `website_targets` | autorisierte Website Targets pro Org | Create/Delete und rein technisch vorhandene Targets eindeutig; Archivierung/Exhaustion explizit |
| `seats` | aktive Memberships pro Org | Einladung ≠ aktiver Seat; akzeptierte Membership transaktional prüfen |
| `security_scan` | tatsächlich eingereichte persistente Security-Scan-Anforderungen | reserve bei Submission, consume nach terminal completed; failed/cancelled release nach Vertrag; Retest Counting schriftlich definieren |
| `monitor_schedules` | aktive Monitor Jobs per Org | pausiert vs aktiv, quota race und Admin kontrollieren |
| `browser_scan` | kostenintensiver Privacy-/Accessibility-Auftrag | ein Paket kann mehrere Module im selben Worker enthalten; klarer Unit-Vertrag, kein Doppelrechnen ohne Offenlegung |
| `repository_scan` | autorisiertes Repo Scan Job | nur bei aktivierter GitHub Worker Gate |
| `ai_screening` | aktiv genutzte teure AI-Einheit, niemals Human Review pauschal als LLM-Kosten verkaufen | Modell-/Tokenbudgets getrennt; Product Claims |
| `ai_document_screening` | sichere Asset-/AI Dokumentprüfung | Malware/Parser Gate zuerst |
| `report_retention` | Aufbewahrungslänge, nicht plötzlich Daten löschen ohne klare Policy | Datenschutz-/Billing Vertrags- und Exportregeln |
| `exports` / `publications` | Report Export/öffentliche Veröffentlichungen | Public-Tokens und Privacy Rule unabhängig von Tier validieren |

**Keine Klientensicht als Authority:** API liefert usageLimit/consumed/reserved/periodStart/periodEnd/plan/status/provisioned + timestamp, nicht bloß Marketingbezeichnung. Wenn Autorität fehlt: `unknown`, kein null-used Fake. API 403/429/payment required strikt unterscheiden.

## 4. Kompletter Paid Lifecycle (User, State, Backend, Fallback)

| Übergang | Kunden-Erlebnis | Serverseitige Wahrheit | Fehlerfall |
|---|---|---|---|
| Signup → Free | klare kostenfreie Onboarding-Option | Org + Subscription/Entitlement aus echter DB Transaktion | fehlende DB: onboarding blockiert, kein Fake-Free |
| Planvergleich | Vergleich Features/aktueller Nutzung, optional annual | server-authoritatives PlanCatalog + veröffentlichte Preise | Konfiguration fehlt → Paid CTA gated |
| Checkout Start | Plan, Zeitraum, Preis, Rechnungsangaben vor Redirect | Owner/Admin Authorization, GuardAI plan code → Stripe Price ID server only | duplicate checkout / stale plan → safe retry |
| Checkout Return | „Zahlung wird bestätigt“, nicht Premium freigeschaltet | Stripe signierter Webhook, fetch current subscription, idempotent reconcile | Webhook delayed → pending + refresh |
| Active/Trial | Plan, usage, next period, invoices/portal wenn vorhanden | Provider+GuardAI DB synchron, reconcile repair | mismatch: explicit stale, no invented quota |
| Upgrade | Mehr Capabilities erst nach verified subscription transition | Stripe proration/price/entitlement mapping | payment incomplete/3DS → no entitlement grant |
| Downgrade | Zeigt Wirkung auf Targets/Seats/Monitors und effective date | scheduled transition with deterministic policy | over-limit: read-only retain data, no silent deletion |
| Cancel | sichtbares „zum Periodenende“ / sofort wie Vertrag | Customer Portal oder geprüfte API, webhook synchron | cancelled at period end ≠ sofort gelöscht |
| Payment failure | diskrete Warnung, grace policy, Link zur Zahlungsaktualisierung | `past_due`/unpaid consistent entitlements | kein öffentliches Leaken von Rechnungs-PII |
| Reconciliation | UI kann bewusst neu laden | server fetch Stripe truth, dedupe signed events | dropped webhook alerts + repair job |
| Refund/Dispute/Chargeback | transparenter Vertragssupport | Stripe events and accounting/audit handling | keine automatischen ausgedachten „credits“ |
| Tax/Invoice | sichtbare Währung/inkl/exkl VAT, legal entity, Rechnungsnummer | Stripe Tax/Invoice Setup je Unternehmen | keine Aussage steuerkonform ohne Review |
| Seat/Target Limit | genau an betroffener Aktion, nicht random pop-up | transactional limit check under concurrent requests | graceful 403/409/429/402 states |
| Data export after cancel | angemessener/exportierbarer Zeitraum nach Policy | RBAC/retention/deletion scheduler + backup policy | kein Leak auf public Trust after revoked |
| Plan deleted/reconfigured | historische Preis-/Subscription-Auswirkungen nachweisbar | immutable plan/version mapping; no retroactive mispricing | unknown/missing plan → fail closed |

### Konkrete schwierige Fälle für Tests

1. Zwei Browser klicken doppelt Checkout – nur ein aktiver Request/Provider Session.
2. Zwei Teammitglieder erreichen gleichzeitig Target-/Seat-Quota; keine oversubscription.
3. Webhook kommt doppelt, out of order, mit falscher Signature oder Test/Live-Konflikt.
4. Stripe Checkout successful Browser-Redirect, aber Webhook fehlt – **kein Freischalten**.
5. Subscription downgraded während Worker Job reserviert – definierte Release/Consume-Semantik.
6. Payment failure nach Renewal; gezielte grace/capability rules ohne heimlichen Datenverlust.
7. Trial ends ohne Zahlungsmittel; autoritatives Readonly/Budget Verhalten.
8. Invoice-VAT, Rechnungsempfänger, Preis-/Währungswechsel und Proration korrekt.
9. Owner/Admin darf abrechnen; Member/Viewer sieht keine sensiblen Billing-Details.
10. Benutzer wird aus Org entfernt; früheren Rechnungs-/Customer-IDs kein Zugriff mehr.

## 5. Exakte Pricing-Seiten UX

**Public `/pricing`**: Tiers mit „für wen“, echten statt vermuteten Limitwerten; optional Monat/Jahr erst wenn beide echte konfigurierte Preise haben; pro Spalte 1 CTA. Kernunterschied in 5–8 Begriffen erklären. FAQ über Fair-Use, Retests, Monitoring, kündigen, gespeicherte Daten, Steuern. Vor Stripe-Freigabe Paid CTA **Interessieren lassen**, nicht „Jetzt zahlen“.

**`/app/billing`**: aktueller Plan, autoritatives Billing Status Label, nächste Zahlung/Period End, Token-schonender Usage-Meter, Quoten pro Modul; Beleg-/Portalzugriff nur wenn Backend erlaubt. Kein Mock „Premium aktiviert“. Plan-Upgrade als transparenter Flow inkl. Wechselwirkung mit Limits, nicht hinter Marketingverläufen.

**Upgrade Prompt**: erscheint **nur** an realen serverseitigen Quota- oder Capability-Fehlern, zeigt Ursache, benötigte Funktion und Plandifferenz; kein blindes Pop-up direkt nach der Registrierung.

**Conversion Event** (nur mit Datenschutzfreigabe): `signup_started`, `workspace_created`, `first_verified_target`, `first_scan_completed`, `limit_reached`, `checkout_started`, `subscription_activated`. Nur aggregierter/zugangsgeschützter Content ohne Kunden-URLs/PII/Secrets.

## 6. Backend-Korrektheit / Architekturvertrag

- `plan_catalog` server-source and versioned; Stripe Price IDs nur Server Secrets/Config; Product UI rendert Plan-Limits **nur** aus kontrolliertem serverseitigem Catalog – Marketing-Pricing und Billing-App dürfen nicht auseinanderlaufen.
- `plan_entitlements` und Usage Counters per Org/Capability/Period mit eindeutigem idempotency/reservation key und row locking.
- Subscriptions: provider+mode+customer+price+effectivePeriod+cancel flag+status auditiert; webhook signature raw body, dedupe/event order und fetch current state.
- Coupons, taxes, annual billing, proration, credits/trials nur nach echten Provider-/Policy-Tests.
- Kein Zugriff auf Stripe secret keys, invoice sensitive fields, customer IDs in Vite `VITE_*` oder Public-DTO.
- Free/Starter/Growth/Business sind **Packaging-Vorschläge**. Keine 1-Target-/Unlimited-/Scanquota-Marketinggarantie, bevor backend enforcement belegt ist.

## 7. Umsetzung in Tickets

**Muss vor Paid Launch:**
- BILL-01 `CODE_AUDIT`: Marketing-Pricing vs tatsächliche serverseitige Entitlements durchgehen (aktuell Free feature suggestions ≠ enforced limits).
- BILL-02 `OWNER_DECISION`: Preis je Tier, Monat/Jahr, Seats, Targets, Scans/Monat, Retests, Retention, Monitoring, Hosting/VAT-Markt, Trial/Cancellation bestimmen.
- BILL-03 `BACKEND`: versioned server PlanCatalog + concrete membership/website/security quota enforcement + atomic concurrency, APIs/typed DTO.
- BILL-04 `DB/STAGING`: Drafts 006, 016, 017 staging migrations/RLS/provider tests.
- BILL-05 `PROVIDER`: Stripe TEST prices/checkout/webhook/portal/tax/invoice and failure/replay test.
- BILL-06 `UI`: public Pricing + in-app Billing same authoritative package; every state/accessibility.
- BILL-07 `LEGAL/OPS`: tax/invoicing, cancellation/renewal policy, transaction mail, subscription event observability, support/data retention.
- BILL-08 `RELEASE`: E2E double checkout, webhook delay, payment fail, downgrade/cancel, expired trial, data privacy, upgrade prompt.

**Schneller Weg zur ersten zuverlässigen Free V1:** echte 1-Website/low-scan limit nur nach Serverimplementation + DB gates. Wenn Provider/Entitlements nicht bereit, als private Testumgebung statt „öffentlich kaufbare SaaS“ bereitstellen.

**Owner-Abnahme:** kommerzielle Beträge/Terms und Launchdatum. Entwickler kann alle technischen Grundlagen dafür selbst erarbeiten, aber keine Preise/Geschäftszusagen eigenmächtig veröffentlichen.
