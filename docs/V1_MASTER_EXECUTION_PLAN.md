# GuardAI V1 – verbindlicher Produkt- und Ausführungsplan

**Stand:** 2026-10-09 · **Status:** aktive Planung; **nicht** Produktionsfreigabe  
**Ziel:** Eine tatsächlich nutzbare, professionell gestaltete, sichere, mandantenfähige Evidence-first Technical GRC Web-App fertigstellen, nicht möglichst viele isolierte Prototyp-Seiten produzieren.

> **Kurzfassung:** Wir haben genügend Produktinformationen, Architektur und vorhandenen Code, um planbasiert selbstständig weiterzuarbeiten. Es fehlen **nicht** primär weitere Prompts. Es fehlen belegte Laufzeit-/Staging-Tests, Migrationen, Provider-Konfiguration und einheitliche End-to-End-Qualität. Für konkrete externe Zugänge und kommerzielle Entscheidungen fragen wir gezielt nach; wir erfinden sie nicht.

## 0. Quellenhierarchie – keine widersprüchlichen Pläne mehr

1. **`CURRENT_STATE.md` = IST-Zustand**. Was Code/Tests wirklich belegen, inkl. BLOCKED. Bei Widerspruch zu diesem Plan gewinnt geprüfter Quellcode + Runtime-Evidence.
2. **Dieses Dokument = freigegebene V1-Ziele, Reihenfolge und Abnahmekriterien**; **`docs/V1_EXECUTION_BOARD.md` = jeweils nächste ausführbare Arbeit**.
3. **`docs/V1_DESIGN_SYSTEM.md` = UI-/UX-Vertrag** für alle neuen/überarbeiteten Oberflächen.
   - **`docs/V1_CUSTOMER_EXPERIENCE_BLUEPRINT.md`** = konkrete Jobs-to-be-done, Seitenmatrix, Klickwege und Customer Success/Failure Cases.
   - **`docs/V1_SUBSCRIPTIONS_BUSINESS_MODEL.md`** = kommerzielle Pakethypothesen, echte Entitlements/Quota-Races, kompletter Stripe-/Kündigungs-/Steuerlebenszyklus.
   - **`docs/V1_AI_ACT_PRIVACY_SECURITY_PLAYBOOK.md`** = geltungsstandabhängige EU AI Act Human Reviews, DSGVO, Sicherheit und Release-Kontrollen.
4. **`docs/COMPETITOR_POSITIONING_2026-10.md` = Marktbeobachtung / bewusste Abgrenzung**, nicht Funktionsbeweis oder rechtliche Freigabe.
5. `docs/GUARDAI_MASTER_BUILD_GUIDE.md` + ADRs = technische Tiefenarchitektur; historische Phase-Tracker und `docs/BUILD_PROGRESS_MATRIX.md` sind **nicht** aktuelle Fortschrittsnachweise, wenn sie dem Code widersprechen.
6. `AGENTS.md` = obligatorische Arbeitsroutine vor jeder neuen Änderung im Repo.

Bei jedem Feature-PR: Code, Tests, `CURRENT_STATE.md` und die betroffene Ticketzeile in `V1_EXECUTION_BOARD.md` konsistent aktualisieren. Planung **allein** ändert kein Ticket auf DONE.

## 1. Produkt und Zielkunde

**Positionierung:** Technical Evidence + Remediation + Risiko und nachvollziehbare Assurance für kleine/mittlere SaaS-Teams, Web-Agenturen und interne Tech/Security-Verantwortliche. **Nicht** „automatisch ISO/DSGVO/EU AI Act zertifiziert“. 

**Kernnutzen:** Eine verifizierte Website wird technisch geprüft; Kunden sehen nicht nur einen generischen Score, sondern `Target → Scan → Observation → Evidence/Provenance → Rule/Finding → Fix → Re-Test → Verified Resolved → Control/Requirement → Risk → Monitoring/Drift → Report/Trust`.

**Business-Outcome:** Ein Kunde kann ohne Assistenz von der Website aus (1) Account erstellen, (2) Workspace anlegen, (3) Website anlegen und DNS-Owner nachweisen, (4) echten Security-Scan ausführen, (5) ein Finding/einen Nachweis verstehen, (6) Remediation/re-testen, (7) ein versioniertes Ergebnis ansehen/teilen und (8) optional Monitoring konfigurieren. Jeder Schritt benötigt reale Serverdaten, Berechtigung, Fehler- und Empty-State. 

**Sekundäre Journey:** Admin verbindet GitHub App, sieht nur autorisierte Repositories, legt Repository Target an. **Repository-Code-Scan bleibt gated**, bis Provider-/Worker-/Provenance-Testmatrix bestanden ist.

**Dritte Journey:** Teammitglied per Einladungslink registrieren, bestätigte E-Mail und Membership, Rollenänderung/Audit. Für Agenturen sind mehrere Orgs sinnvoll; echte Mandantenisolation muss nachgewiesen werden.

### Harte Produktwahrheiten

- `PASS != COMPLIANT`, `SCAN COMPLETED != SECURE`, `DOMAIN VERIFIED != SECURE`.
- `NO DATA != PASS`, `UNKNOWN != ZERO`, `COLLECTION ERROR != PASS`.
- `OBSERVATION != FINDING`, `FINDING != RISK`, `EVIDENCE != CONTROL`.
- `USER MARKED FIXED != VERIFIED RESOLVED`; nur echte passende Scanner-/Fingerprint-Coverage darf einen Re-Test bestätigen.
- `CONTROL STATUS != AUDITOR OPINION`; `AI RESULT != LEGAL DETERMINATION`.
- Keine erfundenen Mitglieder, Testresultate, Preistabellen, Provider-Integrationen, Scan-Module oder Audit-Freigaben. Gated und unknown müssen sichtbar bleiben.
- Es werden nur **eigene, autorisierte Targets** geprüft. SSRF-, Egress-, Rate-/Budget-/Consent-Grenzen haben Vorrang vor Funktionsbreite.

## 2. Was „fertig“ bedeutet – drei unterschiedliche Freigaben

**Code-complete:** Implementierung, stabile Typen/Verträge, RBAC, UX-Zustände, Unit-/Integrationstests und Dokumentation sind vorhanden.  
**Staging-verified:** Dedizierte GuardAI Umgebung, angewendete Migrationen, Auth, Worker, echte Testdaten, Provider und Negativfälle erfolgreich geprüft; Screenshots/Logs/PR-Links liegen vor.  
**Production-ready:** Zusätzlich Security-, Datenschutz-, Betriebs-, Billing-, Recovery-/Backup-, Performance- und Legal-/Public-Claim-Gates nachweisbar bestanden; Betreiber hat Release explizit freigegeben.

**Definition of Done je Ticket:**
- [ ] konkrete User Story, Scope und Nicht-Ziele festgehalten
- [ ] echte serverseitige Daten; Tenant/RBAC serverseitig erneut geprüft, kein Browser-only-Schutz
- [ ] Loading/Empty/Error/Retry/Rate limit/Permission/Partial/Unknown korrekt und responsive
- [ ] Audit, Versionierung, Provenance und Indikatoren dort, wo relevant
- [ ] keine Secrets/PII/rohen Fremddaten in Logs oder Trust-Veröffentlichungen
- [ ] Frontend lint+typecheck+build, Backend check+Tests auf **diesem Commit-SHA ausgeführt und grün**
- [ ] falls DB/Provider betroffen: dedizierter Staging-Integrationstest inkl. Negativfall
- [ ] geänderte Route/Funktion mit realistischer Journey manuell oder E2E geprüft
- [ ] Designsystem beachtet; Keyboard-/Kontrast-/Mobile-Prüfung
- [ ] `CURRENT_STATE.md` und Board aktualisiert; PR nach erfolgreicher Prüfung gemergt

Wenn Actions **0 Steps** ausführt: **BLOCKED_INFRA, nicht „Code fail“ oder „grün“**. Keine Code-PR-Merges auf Basis fehlender Tests. Dokumentations-PRs ohne ausführbaren Code sind separat reviewbar.

## 3. Technische Architektur – bestehende Quelle bewahren

- Frontend: React 19 + TypeScript + React Router + Vite 8; App-Shell und shadcn/Base UI/Tailwind v4. Öffentliche und eingeloggte Routes unter `src/AppRoutes.tsx`.
- Auth: dediziertes Supabase Auth, API verifiziert Bearer Identity; kein Vertrauen in Rollen aus dem Browser.
- API: Node 24/Express, `/api/v1`, Zod/typed DTO, strukturierte sichere Fehler, Request IDs.
- DB: native `pg`-Transaktionen, tenant-bound FKs, RLS, append/immutable Evidence, Scans, auditierbare Statusereignisse.
- Prozesse: separates API, Security Worker, Monitor Scheduler, optional klar gated Repository/Browser/Asset Worker.
- Integrationen: GitHub App (keine Produkt-PATs), Stripe serverseitig autoritativ, externe Provider per signiertem Webhook/idempotent.
- Versionierung: `shared/scan-contract.json`, `shared/rules/*`, `shared/scoring/*` und Legal-Registry Source-Version. Keine stillen Contract- oder Severity-Umdeutungen.
- Daten-/UX-Trennung: Keine Browser-Fakes; API-Fehler aus einem Modul dürfen sichere, unabhängige Module nicht blockieren; bei Tenant-/Auth-Unsicherheit fail closed.

**Kein Rewrite**, bevor ein konkretes Problem im bestehenden System belegt ist. Wir ergänzen fehlende Pfade und verbessern den gemeinsamen UI-Baukasten, statt für jede Seite eigene Patterns zu erfinden.

## 4. V1 Information Architecture – tatsächliche und geplante Flächen

**Öffentlich**: Home, Product, Security, Pricing, About, Contact; Sign up, Login, Forgot/Reset, Invite Join; öffentliche, kuratierte Trust-Seite. V1-Exit: keine toten/irreführenden CTAs, rechtlich geprüfte Kontakt-/Datenschutzseiten, Mobil/SEO/Performance.

**Overview**:
- `/app` Dashboard: beendete und laufende echte Scans, Coverage-Zustand, Finding-/Evidence-Kennzahlen als belegte Untergrenze, erste Aktion; globaler No-Org-Gate.

**Assess**:
- `/app/targets`, `/app/targets/:id`: Website + DNS, verifizierter Provider-/Repository-Target Zustand.
- `/app/scans`, `/app/scans/:id`: Status/Jobs/Coverage/Provenance, Retry/Failed/Stale ehrlich, Scannerstatus.
- `/app/findings`, Detail/Journey: Severity/Status/Remediation, letzte Observation, Quellen-Evidence, Owner/Fix/Re-Test/Verified Resolved; kein doppelt erfundener Scan.
- `/app/evidence`: sichere Scopes, Quelle, Hash, Version, Timestamp, Collection health und ursprünglicher Scan.

**Govern**:
- `/app/controls`, `/app/controls/:id`; `/app/frameworks`, `/app/frameworks/:id`: versionierte technische Baseline und explizites Mapping. Externe Normen erst mit geprüftem Requirement-Katalog/licensing/legal Scope.
- `/app/risks`: echte Risk-Register-Workflows, Owner, Treatment, Review, Beziehungen, Audit.
- `/app/ai-governance`, `/app/ai-governance/reviews/:id`: deklariertes AI-Systeminventar, versionierte Rechtsquellen, Human-Review; keine automatische gesetzliche Einstufung.

**Monitor**: `/app/monitoring`, `/app/drift`, `/app/notifications`. Nur aktivierte Checks mit laufendem Scheduler und echter Baseline; Cleared-Drift erst mit Scannerbeweis.

**Assure**: `/app/reports`, `/app/reports/:id`, `/app/trust-center`. Immutable technische Snapshotberichte, sicher kuratierte öffentliche Auszüge, Revoke.

**Connect**: `/app/integrations`. Aktuelle GitHub-App-Installation und ihr autorisierter Repository-Bestand; sonstige Provider nicht als verbunden darstellen.

**Organization**: `/app/team`, `/app/audit-log`, `/app/billing`; Organisationseinstellungen und Account-Security nur mit echten Backend-Contracts. Owner/Admin/Member/Viewer-Regeln und Invite/Email-Gates.

**Geplante spätere Produkterweiterungen** (Architektur/Navigation erst bei Umsetzung sichtbar): echte Privacy-/Consent-Browserbeobachtung, Accessibility/axe, begrenzter Repository-Scan, kontrollierte Asset-Uploads/Parser, Policies/Documents, Vendor Risk, Questionnaires/AI Assist, Access Reviews, custom roles/SSO/SCIM, API keys/SDK, umfangreiche Framework-Lizenzierung. Diese sind **keine V1-Launch-Claims**.

## 5. Verbindliche Baufolge

**Milestone M0 – Wahrheit, Reproduzierbarkeit, kein Plan-Chaos [P0]**
- [ ] `CURRENT_STATE`, Master, Board, ADRs und README entdoppeln und den veralteten Build-Matrix-Status ausdrücklich als historisch markieren.
- [ ] Offene PR #22 (globaler First-Run-Gate) und #23 (Dashboard) einzeln reviewen, vereinheitlichen und nach **ausgeführtem** CI sicher mergen.
- [ ] GitHub Actions 0-Step-Job-Ursache beheben (Repo-Billing/Spending, Runner-/Policy/Actions Settings oder Platform Incident belegen, nicht raten); dann clean installs.
- [ ] `npm ci && npm run lint && npm run typecheck && npm run build` und `cd server && npm ci && npm run check && npm test` reproduzierbar grün und dokumentiert.
**Exit:** CI tatsächlich gelaufen; kein offener P0-Contract-/Dependency-Konflikt.

**Milestone M1 – Staging als wirkliches System [P0]**
- [ ] Dedizierte GuardAI Supabase **project ref** eindeutig zuordnen; fremde Projekte nicht berühren; eigene Staging-/Prod-Grenzen.
- [ ] SQL-Entwürfe 001–033 inventarisieren/abhängigkeitsgeprüft in versionierte **echte** Migrationsdateien überführen. Nie pauschal in unbekannter DB ausführen.
- [ ] DB/Auth/RLS/tenant-crossing/invitation Replay/last-owner/audit tests; baseline seed, idempotente Migration + Rollforward/Backup.
- [ ] API + Security Worker + Scheduler in Staging deployen; echte Auth-Session, geschützte Target Routes.
- [ ] Instrumentierter Smoke: Health/readiness, Sign up/Confirm/Login/Reset, Org → Target → DNS → Scan → Evidence → Finding → Re-Test → Report → Revoke, Zweitnutzer und fremde Org.
**Exit:** reproduzierbare Staging-URL, positive und negative E2E-Beweise, keine fremden Daten.

**Milestone M2 – Core Security UX und Design [P0]**
- [ ] `V1_DESIGN_SYSTEM` implementieren: einheitliche Cards/Tables/PageHeader/States/Forms/Drawer/Dialogs/Toasts/Navigationsgruppen, barrierearme Interaktion.
- [ ] Dashboard + First Run mit belegten Daten: keine falsche globale Kennzahl, kein Fake-PASS; fertige responsive Mobile-/Tablet-Layouts.
- [ ] Target Verification, Scan Queue/Polling, Finding Detail/Re-Test, Evidence Explorer, Control/Requirement Context end-to-end.
- [ ] Grenzen & Fehlermeldungen in verständlicher Sprache; 429, Timeout, RLS/Permission/Unknown, Expired, Provider-Störung.
**Exit:** ein neuer Kunde kommt ohne Entwicklerhilfe zum ersten validen Bericht; Screenshot/Keyboard/Mobile-Review jeder Kernseite.

**Milestone M3 – Laufende Abläufe / Governance [P1 für komplette V1]**
- [ ] Risk, Monitor, Drift und Notifications auf tatsächlich angewendete Schema-/Scheduler-Pfade bringen.
- [ ] Quellengebundene Monitoring-Re-Tests: Cleared Drift nicht aus fehlenden Ergebnissen schätzen.
- [ ] Team Invitations/RBAC, Audit Events und AI Governance Human Review gegen Staging testen.
- [ ] Reports / Trust Center: Snapshot-Integrität, private vs öffentliche Projektion, Revocation.
**Exit:** zeitbasierte Monitoring-Journey + Risk-Behandlung + Audit/Trust nachweislich funktionsfähig.

**Milestone M4 – Integrations und kommerzielle Betriebsfähigkeit [P1]**
- [ ] Vor kommerziellem Release alle Freigaben aus `docs/V1_SUBSCRIPTIONS_BUSINESS_MODEL.md`: echte Tier-Limits, Preis/Terms/VAT, Checkout/Webhook/Portal, Renewal, Upgrade/Downgrade, Cancellation, over-quota/Grace, Datenexport und Quota-Concurrency.
- [ ] GitHub App staging: Install/Callback/Repo authorization/Revoke/Suspend/Webhook replay; Repository-Scanner nur bei sicherem Runtime-Proof aktivieren.
- [ ] Stripe **test**: Billing Migration/Price-Konfiguration, Checkout, signierter Webhook, Portal, periodische Entitlements, Upgrade/Downgrade, Idempotenz/Reconciliation.
- [ ] Rollen-/Nutzungsgrenzen, Planwechsel, Soft-/Hard-limit UX; keine erfundenen Preise.
- [ ] Mail-Delivery für Auth/Invites/Alerts abhängig von genehmigten Templates und Datenschutz.
**Exit:** kompletter Testkauf ohne falsche Freischaltung; Verified Checkout/Portal und GitHub-Life-Cycle.

**Milestone M5 – Website/Compliance Scanning Depth [P1/P2, risikogesteuert]**
- [ ] Security-Headers-Detektoren und Coverage erweitern mit Review/Regression, Version/Rule-Migration.
- [ ] Browser Worker für Privacy/Accessibility nur mit echter Netzisolation, gebundenem Egress, Budget und axe-Version; Consent-Aussagen als Observation, keine Rechtsurteile.
- [ ] Repo-/Asset-Scanner nur nach Provider-, Malware-Quarantine-, Parser-Sandbox- und Secrets-Gate.
- [ ] Fachliche/Legal-Review für Norm- und AI-Rechtsquellen; keine nicht lizenzierten Standardtexte kopieren.
**Exit:** jedes neu freigegebene Modul hat nachvollziehbare Coverage und explizite Unsupported/Not-assessed States.

**Milestone M6 – Release-/Business-/Operations-Gates [P0 vor Öffentlichkeit]**
- [ ] Kunden-Journeys `C01-C12` aus Customer Experience Blueprint gegen reale Org/Scan/Role/Billing-Fälle prüfen, keine Desktop/Mobile CTA-Abweichungen.
- [ ] AI-Act-/DSGVO-/Threat-Model Kontrollmatrix aus `docs/V1_AI_ACT_PRIVACY_SECURITY_PLAYBOOK.md` mit konsolidiertem EU-Rechtsstand und Human Review abnehmen.
- [ ] Security: SSRF/RLS/Auth/Tenant, SCA, sensitive logs, rate limits, signed webhook, abuse prevention, security review.
- [ ] Privacy/Legal: geprüfte Privacy-/Terms-/Imprint-/Contact-Lösung, Retention/Deletion, DSAR-Prozess, Trust/public claims/Datenschutzfreigabe.
- [ ] Operations: produktionsnahe Deployments, Backups **mit Restore-Drill**, Monitoring/Alerts, Queue-/Worker Recovery, incident runbook, rollbacks.
- [ ] UX: Lighthouse/Web Vitals Zielwerte, WCAG 2.2 AA-orientierter Audit, 320–1440px, Browsermatrix, i18n/Copy consistency.
- [ ] 2+ reale Testnutzer + 2 Orgs, negative E2E/Load/Failure matrix, Produktdemo ohne manuelle DB-Eingriffe.
**Exit:** dokumentierte Go/No-Go-Entscheidung und kontrollierter Rollout. Keine implizite Freigabe nur durch grünes CI.

**Milestone M7 – Breite Plattform nach erstem zuverlässigen Release [Post-V1]**
- Policies/Approvals, Vendor Risk, Questionnaires, Auditors Hub, SOC2/ISO/AI-Framework-Mappings, APIs/SDK, SCIM/SSO, Custom Roles, AI Assistant, Datenresidenz, erweiterte Scanner. **Einzeln** mit Scope/Legal/Privacy/Kosten-Gates planen; keine Großbaustelle vor funktionierender V1.

### Sequenzregel

Unabhängige P0-Backend-, UX- und Dokumentationstickets können parallel entwickelt werden, **aber** Aktivierung/Produktbehauptungen folgen weiterhin der M0→M1→M2-Abhängigkeit. Maximal ein Review-fähiger Feature-PR pro Arbeitsblock, kein Umwerfen des Plans ohne klar dokumentierte neue Erkenntnis.

## 6. Erfolg und Bewertung – keine Fantasie-Zahlen

**Product:** Erste echte Security Evidence nach autorisiertem Scan, Erklärbarkeit von Findings, validierte Re-Test-Ergebnisse, Anteil korrekt gekennzeichneter Unknown-Zustände, erster Bericht ohne Entwicklerhilfe.  
**Engineering:** CI-SHA green, reproduzierbare Migrationsfolge, 0 offene P0/P1 Security-Findings, E2E-Positiv/Negativ, fehlerfreie Rollbacks.  
**UX:** Nutzerweg ohne Dead Ends; konsistente Komponenten; responsive/Keyboard/Contrast.  
**Operations:** definierte Ziel-SLOs *erst nach gemessener Baseline*, Queue- und Fehler-Monitoring, Backup-Restore-Proof.  
**Business:** echter Preis/Plan und Privacy-Freigabe bevor Paid Checkout oder Marketing-Kampagnen öffentlich aktiv werden.

Keine scheinpräzisen Prozent-Fortschritte. Status nur `NOT_STARTED`, `IN_PROGRESS`, `CODE_DONE`, `STAGING_VERIFIED`, `DONE`, `BLOCKED_EXTERNAL`, `BLOCKED_TECH`.

## 7. Externe Inputs – nur wenn nötig fragen

**Bekannt:** GuardAI GitHub Repo, Stack, Architektur, Product Truth, Zielkunden, Designrichtung, grobe Feature-Karte, aktuelle SQL-Entwürfe. Eine weitere umfangreiche A–Z-Prompt-Abfrage ist nicht nötig.

**Noch benötigt, genau zum passenden Gate:**
1. **Exakte Supabase-project-ref** für *dediziertes GuardAI Staging*. User sagte, ein GuardAI-Projekt existiert, aber der derzeit verbundene Supabase-Account lieferte keine eindeutig zuordenbare GuardAI-Ref. **Keine** unsichere Schätzung/anderes Projekt berühren.
2. **GitHub Actions Konto-/Runner-Berechtigung bzw. Spending** für derzeitige 0-Step-Failures; PR #22/#23 bleiben Draft bis ausgeführter Check oder gleichwertige dokumentierte Clean-Run-Evidence.
3. Staging-/Produktionsdomain, Hosting-/Deployment-Ziel und erlaubte Auth Redirects/CORS, sobald M1 bereit.
4. Commercial: Pricing, Limits, Stripe-Geschäftskonto/Test-Setup erst vor M4; keine Secrets im Chat.
5. Rechtliche Pflichtangaben, Datenschutzerklärung, Aufbewahrung, Kontaktmail, DPA/Provider erst vor Public Release.
6. Provider-spezifische Browser-Isolation/Scannerkosten und ggf. CI/Security-Budgets vor aktivierter neuer Scan-Art.

Wenn etwas davon noch fehlt: mit **sicherer repo-lokaler Arbeit** fortfahren, an der externen Grenze explizit `BLOCKED_EXTERNAL` markieren und eine einzelne konkrete Frage stellen.

## 8. Welche Arbeit ab jetzt folgt

Beginn mit **Board P0-01 / P0-02 / P0-03**, nicht neuen Marketing-Features:
- GitHub-Actions-0-Step-Ursache belegen, PR #22/#23 aufeinander abstimmen und sauber testen.
- Reproduzierbare Staging-Migrationsinventur/Dependency-Matrix (ohne Remote-DB Writes).
- UI-Pattern-Audit: Dashboard/Targets/Scan/Findings/Evidence + Mobile/Empty/Error/RBAC im gemeinsamen Designsystem.
- Danach Runtime-Staging mit zugeordnetem GuardAI-Projekt.

**Jedes „weiter“ heißt ab jetzt:** Board von oben lesen, das erste unblocked Ticket auswählen, direkt im Repo implementieren, testen, PR/Docs aktualisieren und erst danach nächsten Block. Nicht erneut ad hoc entscheiden.
