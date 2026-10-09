# GuardAI – Plan- und Dokumentenstatus

**Zuletzt überprüft:** 2026-10-09

Ab jetzt gibt es einen klaren **IST-/SOLL-/AUSFÜHRUNG-/DESIGN-Vertrag** statt vieler konkurrierender Roadmaps.

| Dokument | Verbindlichkeit | Zweck |
|---|---|---|
| `CURRENT_STATE.md` | **KANONISCH – IST/Beweisstand** | Welche Funktionen Quellcode, Tests, CI und Staging wirklich unterstützen; Blocker und Grenzen. |
| `docs/V1_MASTER_EXECUTION_PLAN.md` | **KANONISCH – V1-Scope/Reihenfolge** | User Journeys, Feature-Scope, Meilensteine, Architektur, Release-Gates und Abhängigkeiten. |
| `docs/V1_EXECUTION_BOARD.md` | **KANONISCH – nächster ausführbarer Schritt** | P0/P1/P2 Tickets, verifizierbare Akzeptanz, offene PRs/Blocker, Statuspflege. |
| `docs/V1_DESIGN_SYSTEM.md` | **KANONISCH – UI/UX-Qualitätsvertrag** | GuardAI-eigenes Design, Navigation, Interaktions- und Sonderzustände je Oberfläche. |
| `docs/V1_CUSTOMER_EXPERIENCE_BLUEPRINT.md` | **KANONISCH – USER JOURNEY / UX SCOPE** | Nutzerrollen, alle relevanten Seiten, Error States, reale Customer-Acceptance und First-Run. |
| `docs/V1_SUBSCRIPTIONS_BUSINESS_MODEL.md` | **KANONISCH – PRICING-/ENTITLEMENT-FREIGABEGATES** | Free/Starter/Growth/Business als Vorschlag; Quotas, Paid/Cancel/Lifecycle, Taxes; ohne Preise nicht kaufbar. |
| `docs/V1_AI_ACT_PRIVACY_SECURITY_PLAYBOOK.md` | **KANONISCH – TECH/LEGAL/SECURITY KONTROLLMATRIX** | AI Act (Stand nach 2026 Omnibus), Human Review, Privacy, Threat Model; keine Rechtsberatung. |
| `AGENTS.md` | **KANONISCH – Engineering-Agent-Routine** | Bei jedem „weiter“ erst Stand/Board prüfen, klein implementieren, CI/Staging prüfen, dokumentieren. |
| `docs/COMPETITOR_POSITIONING_2026-10.md` | PRODUKTSTRATEGIE / QUELLEN | Wettbewerbspositionierung, bewusste Differenzierung und nicht belegte Marktannahmen. |
| `docs/GUARDAI_MASTER_BUILD_GUIDE.md` | KANONISCH – TIEFENARCHITEKTUR | Langfristiges A-to-Z-Engineering, Security/Infra/ADRs; bei Aussagen zum IST gewinnt `CURRENT_STATE.md`. |
| `docs/adr/*` | KANONISCH – EINZELNE ARCHITEKTURDECISIONS | Versionierte technische Entscheidungen. |
| `docs/BUILD_PROGRESS_MATRIX.md`, alte Phase-Tracker, `docs/REPO_INVENTORY.md` | HISTORISCH / NACHRANGIG | Hilfreicher Ursprungskontext; einige Zeilen sind nach vielen PRs veraltet, **nicht** als aktuelle Feature-Freigabe verwenden. |

## Produkt-Nordstern

```text
Verified Target → Authorized Scan → Detector/Observation
→ Evidence + Provenance → Finding → Remediation → Re-Test
→ Verified Resolved → Control/Requirement → Risk/Monitoring
→ immutable Report → curated Trust/Audit
```

## Was beim Fortschreiben gilt

- Nur `CURRENT_STATE.md` darf behaupten, dass etwas im Code implementiert/extern verifiziert ist, und nur mit passenden Belegen.
- Nur `docs/V1_EXECUTION_BOARD.md` bestimmt den nächsten geplanten Block; Roadmap darf keine erledigten Tickets vortäuschen.
- Ein ausführbarer Code-PR erfordert grünes **ausgeführtes** CI/Tests, nicht nur Workflow-Dateien oder Jobs mit 0 Steps.
- SQL-Entwürfe sind keine angewendeten Migrationen. Das verbundene Supabase-Projekt darf nicht ohne eindeutige GuardAI-Zuordnung verändert werden.
- Das Plan-/Design-/Competition-Dokument beschreibt **Ziele und Hypothesen**, nicht bestehende Produktfähigkeit.
