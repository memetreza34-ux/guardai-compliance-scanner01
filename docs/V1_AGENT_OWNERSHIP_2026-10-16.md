# GuardAI V1 — verbindliche Zuständigkeiten der Agenten

**Gültig ab:** 2026-10-16  
**Quelle der Produktgrenze:** [V1 Release Charter](V1_RELEASE_CHARTER_2026-10-15.md)  
**Aktueller zu prüfender Code:** [Draft PR #46](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/46), zuletzt als `b6e565b5818857a5648335bf6ea8302e3a878274` mit [Frontend-/Backend-CI green](https://github.com/memetreza34-ux/guardai-compliance-scanner01/actions/runs/38881481408); vor jeder neuen Arbeit HEAD erneut abrufen.  
**Freigabestatus:** CODE-CI VERIFIED; **NOT STAGING_VERIFIED**, kein Production-Release. `main` enthält weiterhin nur die V1-Charta, nicht den PR #46.

## Nicht verhandelbare Arbeitsweise

- **Ein Eigentümer pro aktiver Aufgabe; keine parallelen Bearbeitungen derselben Dateien.** Alle lesen `AGENTS.md`, die V1-Charta, `CURRENT_STATE.md` und diese Matrix.
- **Nicht mehrere Plan-Dokumente konkurrieren lassen.** Dieses Dokument verteilt die Arbeit; [V1 Execution Board](V1_EXECUTION_BOARD.md) dokumentiert Gates/Status, GitHub Issues enthalten ausführbare Tickets, PRs tragen Commits, Reviews und CI-Nachweise.
- **Neue Produktfunktionen sind eingefroren.** Erstes Produkt = Anmeldung/Organisation → verifizierte eigene Website → begrenzter Security-Scan → Findings/Evidence → Re-Test → technischer Bericht. Keine Stripe-, AI-Act-, Risk-, Browser-, GitHub-Scan- oder Monitoring-Features für die erste Beta.
- **Wer schreibt, prüft die Änderung nicht selbst als unabhängigen Auditor.** Kommentare `CODE_DONE` und `CI GREEN` ersetzen weder Review noch Postgres-RLS-, Browser-, DNS- und Worker-Staging-Tests.
- **Arbeiten auf einer eigenen Branch + Draft-PR gegen #46s *aktuellen* Kandidatenbranch,** nicht direkt in `main`. Kein stilles Force-Push oder paralleles Ändern von #46. Ergebnis enthält Files, genaue HEAD-SHA, ausgeführte Checks, Risiken, nächste Übergabe.
- **Berechtigungen:** Keine externen Agenten werden durch das bloße Anlegen von GitHub-Issues automatisch gestartet. Die jeweiligen Sessions müssen explizit begonnen/verbunden werden. Kein Agent hat ohne explizite Autorisierung Zahlungs-, Produktions-, Kunden- oder Fremd-Datenbankzugriff.

## Verbindliche Rollen

| Rolle | Alleinige Hauptverantwortung | Erlaubte Änderungen | Abgabe / Abnahme | Nicht zuständig |
|---|---|---|---|---|
| **ChatGPT in diesem Chat — Release Lead / Produktberater / Integrator** | Priorität und Umfang entscheiden, Abhängigkeiten/Issues koordinieren, Agentenberichte kritisch hinterfragen, Sicherheitsbefunde priorisieren, PR- und CI-Nachweise prüfen, Konflikte zwischen Agent-Branches koordinieren, finalen Release-Kandidaten erst nach Gates zur Freigabe vorschlagen | `AGENTS.md`, Plan/Board/State/Issue/PR-Metadaten und kontrollierte Integrationszweige; isolierte Hotfixes nur **nach Neu-Zuweisung** zur Vermeidung von Überschneidungen | Ein aktueller Status, eindeutige nächste Aufgabe/Owner, Test-/Review-/Staging-Evidence. Keine automatische Produktionsfreigabe. | Nicht dieselben Migrationen, Playwright-Tests oder Review-Dateien parallel zu Codex/Claude verändern |
| **Codex — Implementierungs-Owner** | Noch fehlende technische Umsetzung bis V1: **(1)** 33 SQL-Entwürfe sicher analysieren, Abhängigkeiten und lokale Staging-Migrations-/RLS-Testbarkeit vorbereiten; **(2)** danach E2E-Tests für den durchgängigen Kundenpfad, tatsächliche Integrations-/Deploy-Fixes; **(3)** von Claude bestätigte Defekte beheben | `database/`, `server/scripts/`, `server/test/`, `supabase/` **erst nach Identitäts-/Runbook-Gate**, Playwright-/E2E-Harness, notwendige gezielte Source-Fixes; ausschließlich eigener Branch/Draft-PR | Reproduzierbare Migration/Diff/SQL-Tests; CI mit exaktem SHA, später dedizierte GuardAI-Staging-Nachweise. Übergabe an Claude für Review, an ChatGPT für Integration. | Keine Entscheidungen zu Preisen, V2-Features, öffentliche Compliance-Claims, keine Live-DB ohne GuardAI-Projektbestätigung |
| **Claude — unabhängiger Security- & QA-Reviewer** | Adversarial Review **des aktuellen #46-Gesamtstands**, insbesondere RLS/Mehrmandantensicherheit, Auth-Races, DNS/SSRF/Redirects, SQL-/Schema-Abhängigkeiten, Scanner-Leases, Ergebnisprovenienz, Reports, Secrets/öffentliches Repo; später CodeX-PRs *nach* Implementierung lesen | Standardmäßig **read-only**. Prüfkommentare, reproduzierbare P0/P1/P2-Findings und vorgeschlagene Tests in Issue #44 / PR #46. Nur bei explizit separat zugewiesenem Hotfix eigener Branch. | Reproduzierbarer Befund je Problem: Pfad/Zeile, Angriffsszenario, Auswirkung, Minimalfix, Regressionstest. Auch bei keinen Funden Einschränkungen dokumentieren. | Keine stillen Implementierungen, kein eigenes Sicherheits-Selbstabzeichnen, kein Merge, keine DB- oder Provider-Änderungen |
| **Projektinhaber (Nutzer)** | GuardAI-only Supabase-Projektreferenz und Zugang in geeigneter Verbindung freigeben, Staging/Domain/Hosting bestimmen, externe Kosten und gesetzliche Pflichtangaben bestätigen, Go/No-Go entscheiden | Provider-Einstellungen außerhalb des Codes nach eigener Prüfung | Eindeutige Projekt- und Deployment-Identität, keine Geheimnisse in Issues oder Chat | Nicht manuell Quellcode-Patches oder SQL-Dateien zusammenführen müssen |

## Tatsächliche nächste Reihenfolge (kritischer Pfad)

1. **Codex als Nächstes:** [P0-MIGRATION-BLOCK](https://github.com/memetreza34-ux/guardai-compliance-scanner01/issues/47) — 33 Drafts: statisches Dependency/Audit-Inventar + sichere, reproduzierbare lokale migrationsfähige Basis und Negativtests, ohne fremde Supabase-Projekte anzufassen. V1-Minimum vor Legacy-Modulen. **Ein aktiver Codex-Code-PR zur Zeit.**
2. **Claude parallel, read-only:** [P0-SECURITY-REVIEW #44](https://github.com/memetreza34-ux/guardai-compliance-scanner01/issues/44) — reviewt **#46**, nicht nur den historischen #42-Teil; P0-Funde blockieren Release.
3. **ChatGPT parallel:** CI/PR-/Issue-Status und Abhängigkeiten nachhalten, Audit-Befunde triagieren, Entscheidung treffen, ob Codex gezielten Fix braucht, keinen konkurrierenden Code schreiben. Bearbeiten von migrations-/E2E-Zielcode erst nach expliziter Übergabe.
4. **Projektinhaber:** [GuardAI Supabase Staging #29](https://github.com/memetreza34-ux/guardai-compliance-scanner01/issues/29): nur den **nicht geheimen project ref** zuordnen. Ohne zweifelsfreie Zuordnung weder SQL anwenden noch fremde Projekte verändern.
5. **Codex danach:** [P0-E2E-RELEASE-TEST #48](https://github.com/memetreza34-ux/guardai-compliance-scanner01/issues/48) — 2 Org / 2 Accounts, Signup/Confirm/Workspace/DNS/Scan/Findings/Re-Test/Report, worker crash, error paths. Bereits geschriebene Tests lokal/CI ausführen, reale Anteile nur nach bestätigtem Staging. Claude reviewt Befunde, ChatGPT integriert.
6. **ChatGPT + Owner:** Deployment/Server-/Worker-Smoketest, Secrets/Backups/Restore, mobile/keyboard/Fehlermeldungen, deutsche Pflichtseiten und rechtliche Prüfung, Beta-Go/No-Go. Wenn Security/UX-Test scheitert: minimale reproduzierbare Codex-Fix-Aufgabe statt Featureausbau.

## Merge- und Statusregeln

- **PR #46 ist die alleinige integrierte V1-Code-Basis;** Backend-PR #42 ist nur noch ein Review-Hilfsmittel. Die geschlossenen Einzel-PRs nicht nochmals mergen.
- Codex erstellt **einen Draft-PR pro engem Block**, markiert echte Abhängigkeiten und schreibt `npm`-/Test-Ergebnisse plus SHA. Das allein gibt keine Deployment-Freigabe.
- Claude prüft nach Fertigstellung **nicht gleichzeitig** denselben Quellstand, den Codex noch mutiert: Review-Ziel-SHA fixieren; bei neuen Commits Recheck.
- ChatGPT entscheidet nach Evidenz: `REVIEW_REQUESTED` → `CHANGES_REQUIRED` oder `CI_VERIFIED` → `STAGING_VERIFIED` → `BETA_GO`. Keine unbelegten Prozentwerte.
- Erst **nach** unabhängigen Security-Review und echtem Test des gesamten Kundenpfads wird #46 (oder ein daraus hervorgegangener neuer gemeinsamer Head) in `main` übernommen. Keine vollen Prod-Rechte für autonome Agents.

## Agentenübergabeformat

```text
Role / GitHub issue:
Base SHA / Head SHA / Draft PR:
Veränderte Dateien:
Tatsächlich ausgeführte Tests und genaue Resultate:
Staging/Prod berührt? Wenn ja, explizite Freigabe:
Offene P0/P1-Probleme (reproduzierbar):
Freigabeempfehlung / nächster verantwortlicher Agent:
```
