# GuardAI – Customer-First Product Experience Specification

**Stand:** 2026-10-09 · **Zweck:** Konkrete Produkt- und UI-Anforderungen aus Nutzerperspektive, keine Behauptung des aktuellen Implementierungsstands.  
**Gültigkeit:** Für jede neue/überarbeitete Oberfläche im GuardAI SaaS. Ist-Stand bleibt `CURRENT_STATE.md`, Reihenfolge bleibt `docs/V1_EXECUTION_BOARD.md`, Basistokens bleiben `docs/V1_DESIGN_SYSTEM.md`.

> **Designprinzip:** Ein Kunde muss innerhalb kurzer Zeit verstehen **was GuardAI kann, was GuardAI geprüft hat, was noch offen ist und was er konkret als Nächstes tun sollte**. Mehr Funktionen bedeuten nicht automatisch mehr Nutzen.

## 1. Kundensegmente – Ziel, Unsicherheit, Success Moment

| Persona und Kaufmotiv | Erstes Anliegen | Was Vertrauen zerstört | Was sie als Erfolg erlebt |
|---|---|---|---|
| SaaS-Founder / CTO | „Ist unsere öffentliche Website technisch solide, und wie beweise ich das?“ | „100% sicher“, Fantasie-Score, 20 Schritte vor erstem Scan | Domain verifiziert, ein echter Scan mit erklärbaren Findings/Fixes |
| Web-Agentur | „Ich betreue mehrere Kundensites; wer muss was beheben?“ | Vermischte Mandantendaten, unklare Ownership, Einzelziel-UI | saubere Workspaces/Targets, Status je Ziel, konkrete Export-/Share-Option |
| Developer / Security Engineer | „Was ist wirklich falsch, wo und wie teste ich den Fix?“ | generische KI-Texte ohne Rule, Source, Scan/Version, False Positive | Detector + Version + Evidence + Reproduction + Verifying Scan ID |
| Technischer Datenschutz/GRC Lead | „Was ist geprüft, welcher Requirement/Owner/Risk betrifft es?“ | rechtliche Automatikaussagen, fehlende Reviewhistorie | transparentes Mapping, Human Review, Risk Treatment, Report |
| Auditor/Kunde als Betrachter | „Welche Aussage ist zum Zeitpunkt des Reports belegbar?“ | Live-Daten als historischer Snapshot, zu breite öffentliche Daten | timestamped/hashed scope-bound Report, kontrollierter Trust Link |
| Small business ohne Technikteam | „Was kann ich tun, ohne komplizierte Securitysprache?“ | unübersetzte Fachbegriffe, hektische Warnungen und tote Buttons | klare Erklärung, Prioritäten, Aufwand/Wirkung und Hilfe beim nächsten Schritt |

### Drei Klick-Tests pro Route

1. **Where am I?** Aktiver Workspace, Page Title, Datenquelle/Freshness erkennbar.
2. **Why should I care?** Ein Satz in Alltagssprache, was dieses Objekt bedeutet.
3. **What next?** Eine sinnvolle primäre Aktion mit nur den Berechtigungen, die ich wirklich habe.

Nutzer dürfen „noch nichts geprüft“ nicht mit „alles grün“ verwechseln. Keine Seite darf einen CTA anzeigen, dessen Ziel nicht existiert oder wegen deaktivierter Funktion unbrauchbar ist.

## 2. Produktarchitektur aus Sicht des Nutzers

```text
Public site (Value / Product / Security / Pricing / About / Contact / Legal)
  ↳ Signup / Confirm / Login / Recovery / Invite
  ↳ First-run wizard (Organization → Target → DNS challenge → First Security Scan)
  ↳ Dashboard (real posture, next safe action, recent provenance)
  ├─ Assess: Targets → Scan Detail → Findings → Evidence → Fix → Re-Test
  ├─ Govern: Controls → Framework Requirements → Risks → AI Governance
  ├─ Monitor: Schedules → Run History → Drift → Notifications
  ├─ Assure: Immutable Reports → Scoped Public Trust
  ├─ Connect: GitHub App (verified authorized repositories; scanner gated)
  └─ Organization: Team, Audit, Billing, Settings/Account [Settings partly planned]
```

**Navigation:** modulare Seiten statt 40 Top-Level Links; Sidebar nach Aufgabe; kontextbezogene sekundäre Tabs innerhalb eines Assets/Findings/Reports. Rollenblenden nur UI Convenience – API muss Permissions unabhängig prüfen. Kleine Teams sehen nicht alle Enterprise-Flächen, wenn deaktiviert. Navigation und Strings gehören später in eine einheitliche i18n-Schicht; **V1 Deutsch als primäre UI-Sprache empfohlen**, Englisch danach vollständig als Alternative; endgültige Entscheidung dokumentieren.

### Erster kundenseitiger Erfolg (Must-have)

- Landing/Preis: „Kostenlos starten“ führt zu **Signup**, nicht Login. Auth-Confirmation ohne falsches Zustellversprechen.
- Leerer Workspace: **ein** Onboarding-Einstieg auf jeder `/app/*`-Route, kein doppelter Wizard/Dead End.
- Org + Target: nur Owner/Admin legen Websites an, Nutzer sieht DNS-TXT Name/Value, Ablauf und fehlgeschlagene Verifikation.
- Nur DNS-verifizierter Target bekommt aktiven Security-Scan-CTA, nur Member+ startet Job; ein Viewer sieht Erklärung.
- Scan: queued/running/failed/completed plus Job/Detector Coverage. Keine erfundene ETA.
- Finding: technisches Problem in einem Satz, Bedeutung, Evidenz, Severity/Confidence, betroffene Quelle, **konkrete** Remediation, letzter Scan und „als gefixt markiert“ vs „verifiziert gelöst“.
- Report: exakter eingefrorener Scope mit Regel/Detector/Hash/Zeit, sinnvolle Einschränkungen. Teilen nur mit bewusster Sichtbarkeit und revoke.

## 3. Jede Seite – sichtbarer Nutzen, Aktion, leere/negative Zustände

Legende **CORE** = notwendiger Kundenweg, **V1+** = sichtbarer Quellpfad mit externer Staging-Gate, **LATER** = erst spezifizieren/umsetzen; daraus entsteht **kein** sofortiger Launch-Claim.

| Seite / Scope | Was der Kunde sieht | Hauptaktion | Kein Daten-/Error-/Role-Verhalten | Ziel |
|---|---|---|---|---|
| **Home (CORE)** | glaubwürdiges Produktversprechen, echter Ablauf, verständliche UI-Beispiele gekennzeichnet | Kostenlos anmelden | keine fingierten Testimonials, Ergebnisse, Logos | Signup |
| **Product (CORE)** | Live-Fähigkeiten getrennt von „in Entwicklung“ und streng gegateten Modulen | Produktpfad verstehen | Browser-/AI-/Repository-Scanner nicht als live verkaufen | Signup/Product |
| **Pricing (CORE)** | saubere Tier-Vergleichsmatrix, Usage-Maße, „was kostet danach“ sobald entschieden | Free anmelden / Sales-Interesse | Paid nicht kaufbar ohne Stripe+Entitlements | Signup/Contact |
| **Security/Trust Marketing (CORE)** | Auth/Tenant/Scanner-Scope, Hosting-/Subprocessor-Status nur verifiziert | Vertrauen/Details | keine ISO-/SOC-Zertifikate ohne echte Nachweise | Signup |
| **About/Contact/Legal (CORE)** | Betreiber/Ansprechpartner, Impressum/Datenschutz/AGB nach Freigabe | Kontakt senden | Form nur bei Privacy+Retention Gate, keine Fake-Mail | Contact |
| **Signup/Login/Recovery (CORE)** | fokussiertes Formular, passendes Busy/Error, Auth-Konfigklarheit | anmelden | Recovery nur via echtes Auth Recovery Event; Email confirmation ehrlich | /app |
| **Invite Join (CORE)** | Empfängerstatus, Role, explizites Accept, Account Switch | Team beitreten | expired/revoked/wrong verified email/used token | /app |
| **First-run Wizard (CORE)** | Fortschritt aus DB, nicht Cosmetic, drei Schritte | Org → Website → DNS → Scan | fehlende Permission, DNS failure, API 429, offline | Dashboard |
| **Dashboard (CORE)** | verifizierte Assets, laufende/recent Scans, offene Findings, Coverage, Next Step | zum nächsten relevanten Objekt | API partial, unknown, page-limited count, never fake 0 | jeweiliges Detail |
| **Targets Liste (CORE)** | Zielname, Typ, Ownership State, letzte Aktivität als **bekannt/unknown** | Target anlegen | unverified vs expired vs 403; keine leere „grüne“ Liste | Target Detail |
| **Target Detail (CORE)** | DNS Challenge, latest scan, Target-Identität, Provider/Ownership | verifizieren/scannen | DNS retry/expiration, forbidden network, provider revoked | Scan Detail |
| **Scans (CORE)** | Queue-Liste: requested modules, status, started/finished/failed, scope | Scan öffnen | noch keine Scans = nicht geprüft; no fake queue metrics | Scan Detail |
| **Scan Detail (CORE)** | Job-Status, Detector-Version, errors, Coverage, Finding/Evidence | Finding/Evidence öffnen | pending/failure/not assessed ≠ pass, no fake ETA | Finding |
| **Findings Liste (CORE)** | Severity, Status, Target, Rule, Last Seen, Quelle, owner falls vorhanden | priorisieren | Filter/Count paginated, mark fixed not verified | Finding Detail |
| **Finding Detail (CORE)** | Why/Impact/Evidence/Recommendation, Timeline, re-test/provenance | Fix markieren/Re-Test | user marked fixed vs matching detector Verified Resolved; stale/failed retest | source scan |
| **Evidence Library (CORE)** | Target, Detector, timestamp, hash/version/source scan, Collection health | Quelle prüfen | superseded/failed/not-assessed, no raw secrets | Evidence/Scan |
| **Controls/Frameworks (V1+)** | Versioned internal baseline Requirement → Rule/Findings/Coverage | Requirement öffnen | externes Framework kein auto compliant; N/A/unknown | Risk/Report |
| **Risks (V1+)** | Risk title, related Finding/Target/Control, likelihood/impact, owner/treatment/date | Risk behandeln | Migration missing, accepted risk requires admin+ and reason | Risk Detail |
| **AI Governance (V1+)** | AI inventory and declaration snapshot, source-versioned human review | AI-System dokumentieren/prüfen | applicability/role disputed -> human; no automatic AI Act verdict | Review Detail |
| **Monitoring (V1+)** | Schedules, current baseline, last run/error, verified Website Scope | Monitor anlegen/pausieren | no scheduler → disabled, no cleared risk by absence only | Drift |
| **Drift/Notifications (V1+)** | true changes linked to Monitor runs, read/unread | neue Erkenntnis prüfen | first run baseline ≠ drift; no cleared without matched run | Scan/Finding |
| **Reports (CORE after scanning)** | immutable snapshot list with type/date/source scan | Report generieren | completed-Scan only, no report claim for unassessed modules | Report Detail |
| **Report Detail (CORE)** | Scope, immutable snapshot, Rule/Score/Evidence/Limitations/Hash | lesen/printen/teilen falls erlaubt | hash failure/tamper invalidates trust | Trust |
| **Trust Center (V1+)** | ausdrücklich ausgewählter kuratierter öffentlicher Nachweis | publish/revoke | 410 revoked, no private findings/PII | Public Trust |
| **Integrations (V1+)** | GitHub App auth & authorized repository list | connect/sync | revoked/suspended, no fake „repo scanned“ | Targets |
| **Team (V1+)** | memberships/roles, invites, pending/expired | einladen/rollen ändern | no Owner removal, wrong email, duplicate; invite schema gate | Team |
| **Audit Log (V1+)** | actor, action, target, timestamp, continuation cursor | Ereignis prüfen | no raw sensitive metadata, loaded-only search | Detail |
| **Billing (V1+)** | plan, measured usage, entitlement, renewal/cancel, invoices when provider supports | plan wählen/portal | provider disabled: explicit gate; redirect doesn't activate plan | Stripe |
| **Organization Settings (LATER)** | Name/region/locale/notification preference, workspace governance | edit/save | server-side validation/audit/permissions before UI | Org |
| **Account/Security (LATER)** | account email/auth method/sessions/MFA where supported | recover / sign out | never show fake session revocation; sensitive changes reauth | Auth |

**Wichtig:** `V1+` heißt weder „derzeit funktionsfähig“ noch „automatisch vor Public V1“. Es muss per Plan/Board/Status geprüft werden.

## 4. Screen-Komposition – keine AI-Slop-Optik

**Desktop Security Workspace:**
- 256px Sidebar mit Workspace Name/Role oben, Gruppen darunter, Account unten. Content min/max width ca. 1152px, echte Breadcrumbs/Section.
- PageHeader: Kontext/Subline, 1 Primary Action rechts; daneben Search/Filter und Zustand „zuletzt aktualisiert“.
- Hauptinformation **vor** KPI-Gitter. Erste Zeile 2–3 KPIs mit Quelle. Danach **zwei lebendige echte Datenbereiche**, nicht 12 gleichförmige Karten.
- Detailseiten bekommen links Status/Next Step und rechts verlinkte Timeline/Evidence, auf Mobile gestapelt.
- Tabelleneinträge: Title + Secondary Metadata + Zustand + Next Action, nie nur bunte Chips.
- Rechtsvermerk auf Evidence/AI-Karte nur dort, wo semantisch relevant (kein überall identischer Disclaimer).

**First-Run Hero:** „Deine erste verifizierte Prüfung“; organisiere Schritt-für-Schritt ohne endlose Wizard-Pages. Klare Kosten/Scanning-Scope Info; kein „Scan starten“ bevor Besitz verifiziert.

**Finding-Detail:** Oben Problem und targetbezogene Auswirkung, daneben realer Status; darunter „Warum gefunden?“, „Wie behebe ich es?“, „Was wurde geprüft?“ mit verlinkten Observations; Fix/Retest CTA plus Verification History. Ein Nutzer kann ohne Fachwörter den nächsten Schritt finden.

**AI Governance:** Links AI Systems list with human owner, rechts Declaration/Use Case, Source and Applicable/Unknown/Review; **AI Vorschlag** visuell getrennt von **Reviewer decision**. Keine „High Risk“ Ampel ohne rechtlich begründeten Human-Review.

**Billing:** neutraler Planstatus oben, darunter **belegte** Usage vs Limit, verfügbare Upgrade/Downgrade-Aktionen, Rechnungen/Portal nur bei realem Provider. Quoten-Probleme freundlich erklären; bei pausiertem Plan Datenzugriff nicht heimlich löschen.

**Visual QA:** kein Random-Gradient/Glow-Muster, keine erfundenen Logos/Personen, konsistente Glyphen, Typo/Spacing, State-Semantik, kein automatischer Chart ohne aussagekräftige Quelle. Screenshots manuell prüfen; ein Komponenten-PR muss nicht visuell 20 Routen „verbessern“, nur seine belegten Verbraucher.

## 5. UX-Lifecycle + Reibungsstellen

### A. Nutzer zum ersten echten Nutzen

```text
Wertversprechen → Signup → Confirmation → Org setup
→ Website + DNS verification → Security scan → Result
→ 1 actionable finding → Fix / Retest → share evidence
```

Zu jedem Schritt messen wir **nur nach Opt-in und Privacy/Retention Review** datensparsam: Funnel Step, Technical Error, Duration, No-Result. Events dürfen keine URL, kein DNS Token, keinen Finding Body, keine Email oder Secret enthalten.

**Abbruchanalyse:** User versteht TXT nicht → Hilfetext + Copy; DNS braucht Zeit → „pending, retry“; Scan fail → job reason + retry; 0 Findings → Coverage statt pass; unauthorised → richtige Rolle/wer kann helfen.

### B. Repeated Weekly Value

Monitor Schedule → baseline, change → Notification → Finding → Fix → Retest → Report. Jeder neue Alert muss zur Original-Evidence zurückverlinken. Ziel: Nutzer öffnet eine Veränderung, nicht „neues Dashboard weil KI“.

### C. Conversion ohne Dark Patterns

Free → belegter Wert → sinnvoller Limit-Hinweis an betroffener Aktion → Vergleich Funktionen/Usage → bewusstes Upgrade → Stripe Checkout → verified webhook → server refreshed entitlements. Ein Close/Cancel ist leicht möglich; keine vorangekreuzten Add-ons oder künstliche Fristen. Keine Aussage „automatisch verlängert“ ohne klare Konditionen.

### D. Support / Recovery

Fehlgeschlagene Zahlung, zu viele Scans, DNS-Timeout, verlorener Invite, kompromittiertes Token, deaktivierter Target, Provider disconnected, Tenantwechsel, Account Löschung, No-Data Report, Lost Scheduler Lease. Jede dieser Situationen braucht einen datensparsamen Error Code/Request ID und eine konkrete Handlung, nicht nur „Something went wrong“.

## 6. Rollen-/Tenant-Nutzersicht

- **Owner:** Workspace-Hoheit und Billing/Teameinstellungen, aber Owner-Transfer in V1 nicht vortäuschen.
- **Admin:** Asset Management, Teamverwaltung begrenzt, Monitor, Report/Trust; darf Owner nicht downgraden/löschen.
- **Member:** autorisierte Scans, Findings/Fixes, Reviews, Risiken im erlaubten Umfang; kein Payment/Membership-Owner-Zugriff.
- **Viewer:** lesen, Evidence sehen, Export nur wie serverseitig erlaubt; keine Mutationen.
- **Public Trust Besucher:** nur ausdrücklich veröffentlichte, minimal kuratierte Report-Information; kein Zugang zur Org.
- **Externe Dienstkonten (Stripe/GitHub):** niemals Benutzerrolle aus Provider-Payload blind ableiten.
- Alle Listen/Details/Zähler und Links mit Org-ID und Berechtigungen scopen. Organisation A darf weder Daten noch Existenz von Organisation B inferieren.

## 7. Customer Acceptance (auch ohne Entwickler benutzbar)

**C01** Nutzer landet auf Home, versteht Scope und gelangt mit 1 CTA zu Signup (Desktop + Mobile).  
**C02** Auth Confirmation/Recovery richtig; kein falscher E-Mail-Zustellstatus.  
**C03** Neue Org + DNS-TXT + first scan ohne Support; Fehlpfade erklärbar.  
**C04** API partial: Scans laden, auch wenn Findings ausfallen; unknown statt 0.  
**C05** Finding kann von Entwickler reproduziert/repariert werden; Links zu Evidence/Rules.  
**C06** Manual fix reicht nicht zur Scannerverifikation; falsche/fehlende Re-Test Coverage blockiert verified.  
**C07** Report reproduzierbar und Trust Publikation öffentlich datenminimiert/revokierbar.  
**C08** Orgwechsel + Rolewechsel zeigen niemals fremde alte Daten.  
**C09** Billing-Limit bietet klare Upgrade-Begründung/Status; kein erzwungenes Preismodell.  
**C10** Screen/Keyboard/Touch: 320, 390, 768, 1024, 1440px; focus/contrast/aria.  
**C11** Security/Governance juristische Aussagen sind in ihrer Reichweite korrekt; unbestimmte Pflichten werden nicht automatisch entschieden.  
**C12** Ein neuer Benutzer erkennt auf jeder Seite „was ist geprüft?“ und „was mache ich jetzt?“.

**Definition:** `PRODUCT_UX_COMPLETE` erst nach realer Persona-Testjourney in Staging, nicht allein durch Design-Dokument oder Screenshot von Platzhalterdaten.

## 8. Sichtbare offene Punkte und Entscheidungen

1. Eigene GuardAI Supabase project ref für echte Auth/DB-Probe (ohne Secrets).
2. GitHub Actions Runner 0-Step-Problem für Merge/CI.
3. Verifizierte Host-Domain, Mail/Imprint/Privacy/ToS (für echte Public Release).
4. Preis, Quoten und konkrete Feature-Tier Grenzen (vor bezahltem Launch).
5. Betreiberentscheidung Sprache (empfohlen primär Deutsch für Start), Zielmarkt EU-first, explizit englische Version später.
6. User Testing mit mindestens je 1 Founder/Developer, Agentur, technisch orientiertem GRC-Persona; Ergebnis priorisiert echte Pain Points.
7. Support/Incidents, Delete/Export Data, auditierbarer Billing Cancel und Konto-Settings, bevor wir „fertige SaaS“ behaupten.
