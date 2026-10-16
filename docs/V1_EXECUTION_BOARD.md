# GuardAI V1 Execution Board – der nächste konkrete Arbeitsauftrag

**Stand:** 2026-10-09 · **Plan:** [V1_MASTER_EXECUTION_PLAN.md](V1_MASTER_EXECUTION_PLAN.md)  
Dies ist die **priorisierte, maschinen- und menschenlesbare Arbeitsliste**. Sie ersetzt keine unabhängigen QA-/Security-Nachweise. Nach jedem PR genau die betroffenen Zeilen aktualisieren. **Nichts abhaken ohne ausgeführte Evidence.**

> **V1-SCOPE-FREEZE — 2026-10-15:** [Release Charter](V1_RELEASE_CHARTER_2026-10-15.md) is the first-release filter over this broad execution board. Existing P1/P2 plans are **not automatically V1 release requirements**. No extra scanners, enterprise GRC, paid billing or monitoring as V1 release blockers without explicit owner decision. FIRST prioritize R1 CI Runner zero-step diagnosis, then triage security/core draft PRs and dedicated staging RLS/migrations, then test ONE full real owned-Website → Security Scan → Finding/Evidence → Re-Test → Report journey, followed by UX/private-beta release gates. Every agent acts as a product advisor, challenges scope creep, and delivers evidence not feature count. Charter is ACTIVE for V1 scope as of 2026-10-16, not proof of executable code or a production approval. Do not mark code completed by writing this note.

## Workflow

`NOT_STARTED → IN_PROGRESS → CODE_DONE → STAGING_VERIFIED → DONE`  
Blocker: `BLOCKED_EXTERNAL` (Konto/Provider/Infra) bzw. `BLOCKED_TECH` (reproduzierbarer Code-/Architekturfehler). Kein Prozent-Fortschritt. 

**Auswahlregel:** Immer das erste **nicht blockierte** Ticket nach P0 → P1 → P2 bearbeiten. Bei mehreren Tickets mit demselben Prio: kleinere unabhängige Patches vor großen Umbauten. Externe Provider nie simulieren.

**Änderungsbudget:** Pro Implementierungs-PR maximal ~3 eng zusammengehörige Tickets; keine Feature-Füllarbeiten zur kosmetischen Seitenzahl; CI für **genau den Head-SHA**. Aktive Code-PRs #22 und #23 nicht duplizieren oder ungesehen überlagern.

## P0 – jetzt / Staging / erste echte Journey

| ID | Status am 09.10. | Aufgabe / Akzeptanz | Abhängigkeit |
|---|---|---|---|
| P0-01 | BLOCKED_EXTERNAL | GitHub Actions Runner 0-Step-Failures beheben. Screenshot/Settings/Logs oder Actions-API beweisen konkrete Ursache. `frontend` und `backend` laufen wirklich mit Steps + green SHA. Letzter Stand: Runs #37808824593, #37813540403 ohne ausgeführte Steps, auch `main` betroffen. | Repo-Billing/Spending/Runner-Zugriff oder Plattform |
| P0-02 | BLOCKED_EXTERNAL | PR [#22](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/22): first-run route gate/Org-Onboarding reviewen; echte Tests + mobile/permission negative; keine unbeabsichtigte doppelte Onboarding-UI. | P0-01 |
| P0-03 | BLOCKED_EXTERNAL | PR [#23](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/23): Dashboard + echte Findings/Scans integrieren; Daten-Ausfälle, Scan-/Website-Provenance, Rollen und Empty-States gegen P0-02 abgleichen; CI grün. | P0-01, Konfliktprüfung P0-02 |
| P0-04 | NOT_STARTED | **SQL-Migration Inventory & Generation**, 33 Drafts in Abhängigkeitsreihenfolge: Tabellen/Typen/Functions/Triggers/Seeds/FKs/RLS/Grants erfassen, versionierte kontrollierte Migrationen vorbereiten, `up` idempotent bewerten und DB-Safety-Plan; **nicht** direkt in unbekanntes Projekt schreiben. | dedizierte staging DB für Ausführung |
| P0-05 | BLOCKED_EXTERNAL | GuardAI-only Supabase staging project ref eindeutig mit verbundenem Projekt vergleichen; dazu Site/Redirect/CORS-Konfiguration. Keine Nutzung von KlarKI/allgemeinem Supabase ohne ausdrückliche Zuordnung. | User nennt **project ref**, Zugang |
| P0-06 | NOT_STARTED | RLS/tenant/cross-tenant/auth/last-owner/invite/replay/Scan-Worker-lease Testmatrix als ausführbare Staging-Tests; jeder fremd-Org-Aufruf 403/404 ohne Datenaustritt; keine privaten Daten in Logs. | P0-04/05 |
| P0-07 | NOT_STARTED | End-to-end `Signup → Confirm → Org → Website → DNS → Security Scan → Evidence → Finding/No Finding Coverage → Re-Test → Report`. Zwei Testnutzer, zwei Orgs, Scannerfehler, Retry, Rate Limit, Expiry. Evidence inklusive Job/Detector/Hash. | P0-01/04/05/06 |
| P0-08 | NOT_STARTED | UI-Design Audit der V1 Kern-Routen `Dashboard/Targets/TargetDetail/Scans/ScanDetail/Findings/Evidence`; Komponentenbibliothek für Loading/Error/Empty/Permission/Not-Assessed, Mobile und Keyboard. Keine divergierenden Routen. | `V1_DESIGN_SYSTEM.md` |
| P0-09 | NOT_STARTED | Deployment Smoke/API/Worker/Scheduler, `/api/health` vs `/api/ready`, Worker Queue drain und failed/reclaim; Backup-Restore-Testumgebung. | P0-04/05 |
| P0-10 | NOT_STARTED | Produktions-Vorbedingungen: Hosting, TLS/CORS, Secret-Management, Security/RLS/SSRF, legal Privacy/Imprint/Terms, SMTP, Logs/Alerts, Restore, Performance, Launch Go/No-Go. | alle Launch-Musts |
| P0-11 | NOT_STARTED | **Kunden-UX-Lückencheck**: alle realen Routen gegen [Customer Blueprint](V1_CUSTOMER_EXPERIENCE_BLUEPRINT.md) C01–C12; expliziter Befund auf Desktop: `PublicSiteLayout.tsx` primärer „Kostenlos starten“-CTA zeigt nach `/login`, während Mobile `/signup` benutzt. Ergänze Route-Regressionstests, kopiere keine UI-Platzhalter. | CI-Runner für Code-Merge; Design ohne Runner prüfbar |
| P0-12 | NOT_STARTED | **AI Act 2026 Source Review**: `shared/legal-sources/eu-ai-act-guided-review-v1.json` ist noch der alte 2024-Quellenstand mit Art. 4/14/50. Prüfe konsolidierte Fassung nach 27.07.2026 AI Omnibus, Nachvollziehbarkeit/Source-Version und Human Review; keine stillen neuen Compliance-Klassen. | fachlicher Rechtsreview vor Product-Claims |
| P0-13 | NOT_STARTED | **Subscription Integrity Plan**: public `PricingPage` bewirbt Free-Features/„1 Target“ als Packaging, während `server/domain/entitlements.js` `security` noch `null` zuordnet. Inventarisiere und teste tatsächliche Limits vor Angebot, schreibe verbindliche Upgrade/Downgrade/Cancel/Refund und Datenhaltungs-Semantik. | Stripe Test/Staging und Preis-/Limit-Beschluss für Verkauf |
| P0-14 | NOT_STARTED | **SaaS Security Threat Model**: kontrollierte Checkliste für cross-tenant/RLS, SSRF, Worker, Webhook, Auth, AI-Input, Logging, Privacy und Restore in [Playbook](V1_AI_ACT_PRIVACY_SECURITY_PLAYBOOK.md) als ausführbare Positiv-/Negativtests; dokumentiere Owner und Mitigation. | echtes Staging und CI für Beweis |

**Kann trotz P0-01/05 sofort umgesetzt werden (nur Repo, keine Fremd-DB):** P0-04 Entwurfsinventur/Generierung, P0-06 lokale Test-Harness, P0-08 Design-Audit und Wiederverwendung; dabei Code-Änderungen selbst erst mit ausführbarer CI mergen.

## P1 – komplette technische V1 (nicht mit „fertig“ verwechseln)

| ID | Status / Quellstand | Feature | Definition of Done / Beweise |
|---|---|---|---|
| P1-01 | CODE_DONE / STAGING OFFEN | Workspace/Org/Auth | UI + Backend vorhanden; Email Verification/Recovery, Org-Auswahl, Multi-Tenant, Login/Logout mit realen Supabase-Accounts bewiesen |
| P1-02 | CODE_DONE / STAGING OFFEN | Targets/DNS | Nur autorisierte Hosts; korrekte TXT/Expiry/Failed/Verified; Screens/Mobile; SSRF-Safety-Zweittest |
| P1-03 | CODE_DONE / STAGING OFFEN | Scanner/Evidence/Finding/Re-Test | Volle Scan-Job-Journey, echter Security Detector, No Data vs Secure, richtige Verified Resolved-Coverage |
| P1-04 | CODE_DONE / STAGING OFFEN | Controls/Frameworks | Echte, versionierte GuardAI-Baseline; nur geprüfte externe Mappings; fehlende Checks erzeugen kein PASS |
| P1-05 | CODE_DONE / STORAGE-GATE | Risk Register | Draft 032 migriert, Relations/RBAC/Owner/Reviews/Audit, Negativtests und Card/Detail/Filter UX |
| P1-06 | CODE_DONE / STORAGE-GATE | Monitoring/Drift/Notifications | Drafts 019–021/Leases/Scheduler; real first-run-baseline, tatsächlicher scanner-originated Drift und Notifications; Cleared nur mit matched absence |
| P1-07 | CODE_DONE / STAGING OFFEN | Reports/Trust | Report-Snapshot reproduzierbar/hash-valid, private Evidence bleibt privat, Publish/Revoke/410 und Anteil-UI |
| P1-08 | CODE_DONE / STORAGE-GATE | AI Governance | Drafts 026/027; system snapshot/official registry, verified Human Review; keine automatische Risikoklasse/Gesetzesaussage |
| P1-09 | CODE_DONE / STORAGE-GATE | Team/Invites/Audit | Draft 033; bestätigte E-Mail, Token-Hash, Ablauf, Replay, Role Guard, revoked, org audit |
| P1-10 | CODE_DONE / PROVIDER-GATE | GitHub App Integration | Staging-App, least-privilege, callback/state, authorized repos, removed/suspended/revoked, signed webhook/idempotency |
| P1-11 | CODE_DONE / STORAGE/PROVIDER-GATE | Billing/Entitlements | Drafts 006/016/017, server-defined Plans, Stripe TEST Checkout/Webhook/Portal, irreversible/replayed event, real usage/limits |
| P1-12 | PARTIAL | Product Dashboard & Landing | Keine Fake-Werte, informative Scan-/Evidence-Basis, Mobile/KPI Lower Bound, echte CTAs, klare Claims |
| P1-13 | PARTIAL | First-run UX | Org leer, Viewer ohne Berechtigung, Target unverified, erstes Result, 404/expired/stale, Callouts und Onboarding-Kontinuität |
| P1-14 | NOT_STARTED | Settings / Organization Profile | Erst Backend-Contract, dann UI; Name, Zeitzone, Benachrichtigungen/Locale, auditierbare Admin-Aktionen |
| P1-15 | PARTIAL | Betrieb/Support/Legal | Privacy Notice/Terms/Imprint, Mail-Templates, retention/delete, error observability, Nutzerhilfe; kein gesetzlich geschütztes Copy ungeprüft |
| P1-16 | NOT_STARTED | Deterministische QA-/Visual-Regression | E2E Journey Tests, responsive Screenshots, axe/Keyboard, controlled API mocks **nur in Tests**, nicht in Produkt |

**Status-Beleg:** `CURRENT_STATE.md` führt den zutreffenden Feature-Quellstand. `CODE_DONE` hier bedeutet **nicht** Production-ready oder dass externe Staging-Gates geschlossen sind.

### Business-, Security- und Experience-Spezifikation – neue Umsetzungsquellen

- [Customer Experience Blueprint](V1_CUSTOMER_EXPERIENCE_BLUEPRINT.md): 25+ Seiten/Journeys, Rollen, Fehlerzustände und Personas; C01–C12.
- [Subscriptions & Business Model](V1_SUBSCRIPTIONS_BUSINESS_MODEL.md): Free/Starter/Growth/Business **als hypothetische Pakete**, konkrete BILL-01 bis BILL-08; Preis-/Quota-/Stripe-Vorgaben ohne erfundene Zahlen.
- [EU AI Act / Privacy / Security Playbook](V1_AI_ACT_PRIVACY_SECURITY_PLAYBOOK.md): aktuelle EU-Rechtsgrundlage inkl. AI Omnibus, AI-01–AI-08, Privacy, Threat Model und Legal Gates.

**Diese Dokumente sind Spezifikation, NICHT funktionierende Module.** Implementierungsstatus ausschließlich in `CURRENT_STATE.md` und belegter CI/Staging.

## P2 – wertvolle Erweiterungen nach stabiler V1

| ID | Funktion / Nutzen | Aktivierungs-Gate |
|---|---|---|
| P2-01 | Privacy/Consent Beobachtung mit Browser Worker | isolierter Browser, budgetiertes Egress/PII, Consent-States, Legal Review |
| P2-02 | Accessibility/axe Checks | isolierter Browser, Version, incomplete/unassessed, WCAG coverage klar |
| P2-03 | Bounded Repository Security Scan | staging GitHub App, commit SHA immutable, Tree/Blob budgets, Leak redaction, no SAST claim |
| P2-04 | Asset/File Quarantine Scanner | isolierter Malware/Parser, unabhängige Storage/credentials, file size/format budgets |
| P2-05 | Policies/Document/Approval Workflows | Owner/Reviewer/Approval/audit/templates/legal/licensing/privacy |
| P2-06 | Vendor Risk + Questionnaires | strukturierte vendor records, Quellen, Approval, sichere AI-Assistance nur mit Evals |
| P2-07 | Deep Framework mappings + Auditor Hub | Source licensing/legal review, requirement/test/evidence mapping, Auditor RBAC |
| P2-08 | SSO/MFA/SCIM/Custom Roles | Identity architecture, migration, security, enterprise test |
| P2-09 | API Keys/Developer API/SDK | scoped server keys, revocation, rate limits, OpenAPI/change policy |
| P2-10 | Multi-language, data residency, analytics, support | echte Datenschutz-/Betriebs- und Kostenentscheidungen |

## QA- und Release-Gates als Testfälle

**Journey T01**: Registrieren/bestätigen/anmelden; Recovery mit gültigem Link; normal eingeloggter User darf Recovery-Seite nicht als Recovery nutzen.  
**Journey T02**: Org erstellen und wechseln; zwei Benutzer/Orgs, keine Daten-/UI-Flash-Leaks.  
**Journey T03**: Website hinzufügen, unverified → pending → verified, falscher TXT und expired.  
**Journey T04**: Security Scan success/fail/retry/idempotent; keine „grünen Ergebnisse“ bei collection error.  
**Journey T05**: Evidence Hash/Version/Source zu Source Scan zurückverfolgen, unveränderlich.  
**Journey T06**: Finding/Remediation/Retest: manual fixed ≠ verified; matched coverage + absence notwendig.  
**Journey T07**: Control/Framework/Risk: kein externes Norm-Zertifikat ohne reviewed mapping, Risks auditierbar.  
**Journey T08**: Monitor Scheduler + Drift first-run baseline, dedupe, Notification mark read.  
**Journey T09**: Report erstellt; Trust veröffentlicht nur kuratierte Projektion, Revoke öffentlich 410.  
**Journey T10**: Team Invite/confirmed email/replay/revoke/role restrictions/last owner.  
**Journey T11**: GitHub Install/Repos/Removal/Suspend/Webhook tamper.  
**Journey T12**: Stripe Test Checkout, unverifizierter Redirect kein Entitlement, duplicate webhook kein duplicate grant.  
**Journey T13**: Mobile (320/390/768/1280px), keyboard, navigation, loading/empty/error/unknown.  
**Journey T14**: Security: SSRF DNS rebinding, reserved networks, RLS cross-tenant, abuse/rate quotas.  
**Journey T15**: Staging deploy/rollback/backup restore/drift alerts, keine Secrets.  

Zu jeder Journey: Testtyp, Environment, Commit SHA, Ergebnis und reproduzierbarer Beleg erfassen. Tests sollen mindestens positive + negative Pfade enthalten.

## Board-Pflege bei jedem „weiter“

1. Erste Zeile suchen, die **ohne externe Inputs** ausführbar ist.
2. Vorher Code, API, Tests, ADRs lesen; nicht dieselbe Implementation erneut anlegen.
3. Ticket auf IN_PROGRESS, begrenzten Branch, CI + Staging-Gates; bei blocker BLOCKED mit konkreter Ursache.
4. PR mit How to Verify, Auth/tenant and product-truth Auswirkungen; nach tatsächlichen Prüfungen mergen.
5. Status aktualisieren (`CURRENT_STATE.md` + Board) und erst nächsten Block wählen.

**Offene Code-PRs bei Erstellung dieses Boards:** [#22](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/22) First Run und [#23](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/23) Dashboard. Kein stiller Doppelbau. GitHub Actions Jobs zu beiden hatten keine ausgeführten Steps; deshalb keine verifizierten Code-Merges.
