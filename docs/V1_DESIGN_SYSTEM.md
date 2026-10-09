# GuardAI V1 – UI / Design System / Product UX Contract

**Stand:** 2026-10-09 · verbindlicher Zielzustand, **kein Nachweis, dass jede Seite ihn schon erfüllt**.  
**Gilt für:** public site, Auth, Workspace und responsive Desktop/Tablet/Mobile. [Screen-by-Screen Customer Blueprint](V1_CUSTOMER_EXPERIENCE_BLUEPRINT.md), [Abos/UX](V1_SUBSCRIPTIONS_BUSINESS_MODEL.md) und [AI/Legal Claims](V1_AI_ACT_PRIVACY_SECURITY_PLAYBOOK.md) konkretisieren die Nutzersicht. Die Designsystem-Regeln dürfen ihren sicherheits-/rechtsbezogenen Zuständen nicht widersprechen. Verweise: [Masterplan](V1_MASTER_EXECUTION_PLAN.md), [Board](V1_EXECUTION_BOARD.md).

## 1. Gestalterische Richtung

**Premium B2B / nüchtern / vertrauenswürdig / technisch:** sichtbar strukturierte Informationshierarchie statt endloser gleichförmiger Karten. Die UI soll eher ein hochwertiges Developer/Security Console sein als ein generisches AI-Dashboard.

- Bestehende GuardAI-DNA erhalten: **Slate/Navy**, zurückhaltende **Indigo**-Interaktionen, klare Typografie (Geist Variable), sparsam Grün/Amber/Rot für **echte Zustände**.
- Keine kopierten Drata/Vanta/Secureframe Layouts, Illustrationen oder Texte; eigene Informationsarchitektur mit Evidence-first Fokus.
- Keine großen bunte KI-Verläufe, leuchtenden Rahmen um alle Cards, Comic-Avatare oder künstliche „100% compliant“-Badges.
- Kein Full Redesign ohne Audit bestehender Components. **Ziel: Konsistenz über alle Routes**.
- Wortwahl: im Auth-/Public-Bereich bewusst verständlich, im technischen Produkt präzise. Die derzeitige Mischung Deutsch/Englisch ist **Content Debt**: V1 bewusst eine primäre UI-Sprache festlegen, dann vollständig konsistent umsetzen; keine einzelne Seite im Sprachmix.

## 2. Design Tokens – bestehende Codebasis als Ausgangspunkt

Quelle: `src/index.css` enthält Tailwind v4 + shadcn Tokens; `src/pages/app/AppShell.tsx` bereits Slate-950/900/800, Indigo-300/500, Geist-ähnliche Schrift. Die vorhandene `index.css` definiert teils `--font-sans` doppelt; **vor globalem Token-Refactor prüfen**.

**Empfohlene Ziel-Tokens** – als Umsetzungsvorgabe, **noch nicht** vollständig im Code:
- Canvas `slate-950`, surfaces `slate-900`, recessed `slate-950`, borders `slate-800`; künftige semantische `--ga-*`-Tokens an zentraler Stelle mappen.
- Primäre Aktion `indigo-500` mit unterscheidbarer Hover/Focus/Disabled Behandlung.
- Text: Heading `slate-100`, Body `slate-300/400`, Metadata `slate-500`; reine `slate-600` **nicht** für kritische Hinweise auf dunklem Hintergrund.
- Success = `emerald` nur für **verifizierte positive Verfahrenszustände**, nicht für „secure/compliant“.
- Warning = `amber`, Error = `rose`, Unknown = neutral Slate. Scanner-Coverage ausdrücklich neutral/gelb bei unvollständig.
- Radius: Cards 12–16px, Inputs/Buttons 8–12px; Borders leise, Shadows selten.
- Spacing: 4/8/12/16/24/32px Raster; Tabelle dichter, Formular luftiger; Content-Höchstbreite ca. 1100–1200px für Detail/Listen.
- Typography: nur 3 Hauptgrößen über Hierarchie (Page 24–30px, Section 16–20px, Body 13–15px, Meta 11–12px); Code/Hashes in Monospace mit Wrap/Copy. Mindestkontraste/44px Touch Targets kontextspezifisch prüfen statt Farbversprechen ohne Messung.

## 3. Kanonische Komponenten (schrittweise extrahieren, nicht doppelt bauen)

| Baustein | Muss können |
|---|---|
| `AppShell + Sidebar/NavGroup` | aktive Navigation, Mobile Drawer mit Escape/Focus, Org Switcher, Account/Logout, keine nicht freigegebenen Produkte |
| `PageHeader` | kleine Breadcrumb/Section, H1, hilfreiche Subline, Primary Action rechts nur bei Berechtigung |
| `Metric` | Wert **oder** Unknown, Beschreibung, Source/Coverage/Freshness, kein Fake-`0`, keine willkürliche Trendpfeile |
| `StatusBadge` | Scannerstatus vs Ownership vs Human Review vs Risk klar getrennt; nicht allein Farbe |
| `DataTable/List` | responsive cell overflow, Sort/Filter/Pagination, loaded-only Counts, real Link to Detail, Empty state |
| `DetailPanel` | Status + ID/Version/Source/Time, related objects/links, chronological evidence, action permissions |
| `StateBlock` | loading/skeleton, empty, first-run, permission, expired, stale, partial, error, 429 with retry or actionable next step |
| `ActionDialog` | destructive/revoke/sensitive changes bestätigen, async busy, protected double submit |
| `CopyableValue` | Token/Hash/DNS TXT mit Copy und optional one-time secret, keine Logger/Telemetry-Abflüsse |
| `WorkflowStepper` | echte Persistenzstate, completion nur mit Evidence, niemals kosmetischer Fortschritt |
| `ActivityTimeline` | source scan/job/status event/reviewer/actor/timestamp; Replay/Retry dokumentieren |
| `SourceLink` | Links nur zu autorisierten, existenten Quellen; externe URLs validieren |
| `FormField` | Hilfe, Schemafehler, Fokus, Pflichtfeld, vollständiger Keyboard-Flow, Rate limit |
| `Toast/Feedback` | erfolgreiche Mutationen nur nach API-Bestätigung, keine behauptete erfolgreiche Mail-/Checkout-Zustellung |

**Komponentenpolitik:** vorhandenes `src/components/ui/` und Base UI/shadcn bevorzugen. Neue Bausteine möglichst in `src/components/app/`, aber erst extrahieren wenn 2+ echte Verbraucher. Keine zweite Styling-Library ohne Design-/Bundle-Begründung.

## 4. Layout und Responsive-Akzeptanz

**Desktop (≥1024):** feste/klappbare linke Navigation (ca. 256px), klarer Workspace-Kontext, Inhaltsseite scrollt unabhängig, PageHeader mit Aktionen.  
**Tablet (768–1023):** Drawer oder kompakte Sidebar, Tabellen dürfen kontrolliert horizontal scrollen oder in Cards wechseln, niemals Text abschneiden ohne Zugriff.  
**Mobile (320–767):** vollständige Navigation per Drawer, Esc/Close, Copy-Tokens gut nutzbar, Form Controls voller Breite, Dialoge viewport-sicher, touch targets, keine festen 3-Spalten-Grids.  
**Print/Report:** farbarmes/weißes Print-Layout; technische Hashes/Tabellen/Grenzen bleiben sichtbar, kein Sidebar-Druck.

Testbreiten mindestens: **320, 390, 768, 1024, 1440 px**. Browser: aktuelle Chromium, Firefox, Safari; Touch-/Keyboard-Smoke.

## 5. Zustandsdesign – verpflichtend

| Realer Zustand | Anzeige |
|---|---|
| neue Org/no targets | geführter Einstieg mit genau einem nächsten erlaubten CTA |
| DNS pending | Record Name/Value (ephemeral)/Expiry, Check, Rate Limit; kein Verified Badge |
| DNS verified | „Domain control verified“ (nicht „Site secure“) |
| queued/running | Scan ID, Status, bekannte ETA **nur wenn vom Backend vorhanden**; Polling/Stale Hinweis |
| completed | Requested modules, assessed/observed/not-assessed/error Coverage je Detector, Score nur wenn berechnet |
| failed/cancelled | Fehlerkontext und ausdrücklich keine Sicherheits-/Compliance-Aussage |
| open Finding | Rule ID/Version, Severity/Confidence, Evidence refs, Remediation |
| manually resolved | „Fixed by user – verification pending“, getrennt von verified resolved |
| verified resolved | matched detector coverage + verifying Scan ID/Time |
| Risk accepted | gesonderte Admin/Owner Freigabe, Grund und Audit, nicht Finding-Sicherheit |
| AI review complete | Human workflow fertig, **nicht** AI Act-compliant |
| subscription redirect | Zahlungsstatus unbekannt bis signierter Webhook/Server-Status |
| API error/403/429 | nur betroffene Funktion blockieren, Retry/Help; falsche Nullwerte vermeiden |
| missing storage/migration | klarer Storage Gate, niemals Demo-Ersatz |
| pending provider | GitHub revoked/suspended/deleted nicht als active/healthy |

## 6. Screens – konkrete visuelle Architektur

### Public / Acquisition
- **Home:** präziser Hero („technical checks you can trace“), ein Primär-CTA „Start free“ → echte Registrierung, Product Explanation „Evidence chain“ mit 3–4 ruhig illustrierten Schritten, Security / Trust Grenzen, Use Cases/FAQ.
- **Product:** real existierende Module, nicht erfundene Scanner, Screens/UI illustrativ nur als Beispiel gekennzeichnet.
- **Pricing:** kommerzielle Preise/Pläne erst nach User-Entscheid; „Free“ → Signup, Paid nur bei realem Stripe Plan/Webhook aktiv.
- **Security/Trust/About/Contact:** konkrete Datenschutz-/Scoping Aussagen, keine amtliche Zertifizierung; funktionierender Kontakt/Privacy-/Imprint-Pfad.
- **Auth:** ruhige 2-Spalten-Seite auf Desktop, eine Formularspalte Mobil; Signup, Login, Recovery, Invite Join unterscheiden sich klar.

### App / Overview
- Dashboard: kompakte KPI-Reihe mit Coverage/Unknown, 3-step first-run, 2 informative echte Listen „recent scans/findings“, globaler Stale/Partial-Indikator.
- Sidebar Gruppierung: Overview / Assess / Govern / Monitor / Assure / Connect / Organization; aktive Reihenfolge nach Nutzer-Workflow, keine zehn gleichwertigen Top-Bar-Aktionen.

### Assess
- Targets: Tabellenlisten + Status-Chips; Add Target direkt, Detail „verify/scan/history“.
- Scan Detail: Scan Execution Hero, Job States, Detector Coverage, Evidence und Finding Quellen, Failures, Provenance.
- Finding Detail: Titel, Severity/Status, betroffener Target, why/Source/Remediation, Activity Timeline und re-test; niemals leere rote/graue KPI-Ringe.
- Evidence: traceability nach Scan/Target/Detector, Hash Copy, JSON normalized observation lesbar und datensparsam.

### Govern / Monitor
- Controls/Frameworks: Requirement-Grid und Coverage States, kein pauschaler Pass.
- Risks: Tabelle + Filter + Details/Treatment/Owner/Review; nicht nur Modal.
- AI Governance: Inventar / Declaration / Review Items / legal source provenance, menschliche Entscheidung.
- Monitoring/Drift: Target-Schedule + Run Hist + echte Changes, First-run Baseline, Filter/Freshness/Error.
- Notifications: actionable/event-linked Cards oder Liste, unread / read.

### Assure / Connect / Organization
- Reports: Liste + immutable Detail inkl. Begrenzungen, überprüfbarer Snapshot/Version/Hash.
- Trust: private Admin-Vorschau vs kuratierte Public Page; safe revoke.
- Integrations: Connection Health, Current Provider Auth, Repository-list + scanned coverage extra.
- Team/Audit/Billing: Rollen, Quorum, Einmal-Invite, sichere Audit-Timeline, authoritative subscription state.

## 7. UX Acceptance & Design Review bei jedem PR

- [ ] Jede sichtbare Kennzahl aus realer Quelle; Label „loaded only“ bei begrenzter Pagination.
- [ ] Eigener Empty-/Error-/Unknown-/Permission-/Loading-/Disabled-Zustand pro betroffener Funktion.
- [ ] ARIA-Labels, Keyboard, Focus, Dialog behavior, Farbkontrast, visuelle Status+Text redundant.
- [ ] Mobile 320/390; Desktop 1280/1440; keine Horizontalscroll des gesamten Viewports.
- [ ] Formular zeigt Field-/Server-Errors, busy/duplicate protection, 429 und Token Expiry.
- [ ] Tenantwechsel/Loginwechsel: keine stale Cross-tenant UI.
- [ ] Kein „compliant“, „secure“, „passed“ ohne definierte, geprüfte Claim-Basis.
- [ ] Screenshots oder Browser-Review eines echten Datensatzes und jedes relevanten Sonderzustandes.
- [ ] Reuse vs new component begründet, keine kopierten Komponenten und keine ungeprüften Libraries.

## 8. Implementierungsreihenfolge UI

1. Erst **shared states / pages / mobile nav** und Login/Org/Target Journey stabilisieren.
2. Danach Dashboard/Scans/Findings/Evidence/Control-Graph konsolidieren.
3. Danach Risk/Monitor/Report/Trust/Team/Billing vereinheitlichen.
4. Erst nach Staging-Beweisen neue Scanner-/Enterprise-Screens sichtbar machen.

**Kein Design-Fertig-Status ohne realen Screenshot-/Interaktionstest.** UI-Struktur in diesem Dokument ist ein Vertrag für Umsetzung, keine Behauptung aktueller Fertigstellung.
