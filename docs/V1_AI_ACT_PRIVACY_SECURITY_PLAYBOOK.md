# GuardAI V1 – EU AI Act, Datenschutz, Recht & Security: Produktanforderungen

**Quellenstand: 2026-10-09.** Dieser Plan ist eine technische/produktseitige Kontrollmatrix, **keine Rechtsberatung** und kein automatisches Compliance-Urteil. Jede Aussage über **geltendes Recht** muss aus versionierten **amtlichen** Rechtsquellen stammen; rechtsberatende Zuordnungen müssen vor Verkauf durch qualifizierte Fachleute geprüft werden.  
Ist-Stand: `CURRENT_STATE.md`. Aktuelle AI Governance Basis: `shared/legal-sources/eu-ai-act-guided-review-v1.json` (nur Art. **4**, **14**, **50**), `server/domain/aiGovernanceEvidence.js` (human review, no legal class). **Diese Basis ist kein vollständiger AI-Act-Checker.**

## 1. EU AI Act: amtlicher 2026 Rechtsstand und Fristen

**Aufgrund der am 27. Juli 2026 in Kraft getretenen AI-Omnibus-Änderungen sind ältere AI-Act-Zeitpläne/Normen-Sekundärquellen teilweise veraltet.** Vor jeder Änderung der Produkt- oder Rechtsklassifikation ausschließlich konsolidierten EUR-Lex-Text und aktuelle EU Service Desk Quellen heranziehen; späteren Rechtsstand immer erneut prüfen.

| Geltungs-/Anwendungsmeilenstein | Stand 09.10.2026 – nur als orientierende Norm-/Produktplanung | GuardAI UI |
|---|---|---|
| 01.08.2024 | AI Act in Kraft | rechtliches Datum getrennt von Anwendbarkeit |
| 02.02.2025 | ausgewählte Verbote, AI-Literacy und Definitionen | `Art. 4 AI literacy` und Prohibited Practices als **Human Review Task**, kein Auto-Ja/Nein-Urteil |
| 02.08.2025 | Governance sowie GPAI-Provider-Pflichten in Kraft | **GPAI Modellprovider** getrennt vom SaaS Deployer/AI System Provider behandeln |
| 02.08.2026 | Teile der Transparenzpflichten/Enforcement greifen | `Art. 50` nur bei tatsächlich relevanter Art von Einsatz, Rolle und Ausnahme; kein Default-Compliance-Badge |
| 02.12.2026 | zusätzliche Verbote und Übergang für bestimmte synthetische-Inhalte-Marking-Pflichten | datiertes Follow-up/Review statt stillschweigender Fristen-Ableitung |
| 02.12.2027 | High-Risk AI Systems in Anhang III laut 2026-geändertem Zeitplan | vorgeschlagene Risiko-/Anwendungsfall-Prüfung, Human Legal Review notwendig |
| 02.08.2028 | High-Risk AI in regulierten Produkten nach Anhang I | produktregulatorische Abgrenzung, separate technische Dokumentationsanforderungen |

**Amtliche Quellen (nicht durch Marketing-Claims ersetzen):**
- [Konsolidierter EU AI Act nach Änderung vom 27.07.2026, EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02024R1689-20260727)
- [EU-Kommission: AI Act Übersicht + Omnibus](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)
- [AI Act Service Desk: Umsetzungstimeline](https://ai-act-service-desk.ec.europa.eu/en/ai-act/eu-ai-act-implementation-timeline)
- [AI Act Service Desk: Enforcement FAQ](https://ai-act-service-desk.ec.europa.eu/en/ai-act/faq/when-does-enforcement-start)
- [EU-Kommission: AI Omnibus in Kraft](https://digital-strategy.ec.europa.eu/en/news/ai-omnibus-enters-force)

**Schutz gegen Gesetzesänderungen:** immutable source registry `instrumentId`, `article`, `revision`, `publishedAt`, `effectiveAt`, `reviewedAt`, `officialUrl`, `sourceHash`, `reviewerId`; jede Review speichert verwendete Source-Version. Neues Gesetz → neue Registry-Version + Review-Tasks; keine rückwirkende Änderung historischer Reviews.

## 2. AI Governance: Was ein Kunde im Produkt wirklich braucht

### Einfache, sichere Nutzerreise

```text
AI System Inventar
  → beabsichtigter Einsatz + Betreiberrolle erheben
  → Verwendete Modelle/Provider, Datenkategorien, Endnutzer, Zweck
  → relevante Norm-/Pflichtfragen mit verlinkter offizieller Quelle
  → Evidence für vorhandene interne Maßnahmen / Zuständigkeit
  → offene Punkte: NOT_DOCUMENTED / UNKNOWN / NEEDS_HUMAN_REVIEW
  → zuständigen Human Reviewer benennen
  → Review + dokumentierte Entscheidung/Begründung/Datum
  → Follow-up, Monitoring und bei Änderung Re-Review
```

**Grundregeln:** GuardAI sammelt deklarative, strukturierte **Metadaten**. Niemals standardmäßig Rohprompts, Generierungen, Dokumente, Kundendaten, Employee-PII, API-Schlüssel oder Model-Logs für Governance speichern. Nur nach klarer Daten-/Risikoanalyse einzelne sichere Evidence-Attachments/Links freigeben.

### Strukturierte Felder – minimale und optionale künftige Versionen

| Bereich | Erforderliche/empfohlene Daten | GuardAI-Grenze |
|---|---|---|
| AI System identity | Name, fachlicher Owner, Deployment Context, Status, Zweckbeschreibung ohne sensible Inhalte | Klassifikation nicht aus Namen ableiten |
| Rollen | provider, deployer, ggf. importer/distributor/authorised representative, `unknown`, plus Begründung | Rolle hängt vom konkreten Vertriebs-/Integrationssetup ab |
| Intended purpose/use | Anwendungsfälle, betroffene Personengruppen, sensible Bereiche (HR, Kredit, Gesundheit, Bildung, Infrastruktur etc.) | Indikator für Review, **keine automatische High-Risk-Zuordnung** |
| Models & vendors | Provider, Model/Version, Deployment mode, Herkunft und Nutzungsschicht | GPAI Modell ≠ jedes App-AI-System; Rollenpflichten unterscheiden |
| Data mapping | Datenkategorien, personenbezogene/sensible Daten ja/nein/unbekannt, Datenfluss, Verarbeitung/Rechtsgrundlage-Referenz | keine Rohdaten kopieren |
| Human oversight | Oversight Owner, Eingriffsmöglichkeiten, Eskalation, dokumentierter Kontrollstatus | Art. 14 nur bei tatsächlicher Anwendbarkeit |
| Transparency | Interaktion/Bot-Hinweis, synthetische Inhalte/Markierung, ggf. Deployer Disclosure | Art. 50 Ausnahmen/Rollen rechtlich prüfen |
| AI literacy | Maßnahmen/Schulungsnachweise auf hoher Ebene, zuständiger Mensch | `documented` ≠ ausreichend |
| Potential prohibited use | geschulte Verantwortliche prüfen Anwendungsart nach Artikel 5; Hinweise mit Source Link | keine automatisierte abschließende Illegalitätsaussage |
| High-risk screening | indikative Fragen zu Annex I/III, final `requires_legal_review` | niemals 0-100% AI Act Score |
| Governance lifecycle | Review Owner, Open Items, Evidence ref, approved/reopen, next review date | Human reviewed ≠ Legally compliant |
| Changes/Incident | Model-/Purpose-/Role-Änderung, neue Rechtsquelle, Sicherheits-/Bias-Vorfall, Mitteilungspflichten reviewen | keine automatische Meldepflichten-Entscheidung |

**V1 sofort zulässig:** vorhandenes strukturierte 4-Item-Guided-Review aus Art. 4/14/50 mit **klar sichtbarem begrenztem Coverage Label**. **Nicht zulässig:** „GuardAI prüft den gesamten EU AI Act“ oder ein grüner AI-Compliance Score. Für Vollabdeckung braucht es separate, juristisch freigegebene Requirement-Versionen und echte Evidenz-Workflows.

### Pflichtenscope für spätere Erweiterungen (NUR reviewed mappings)

- **AI Literacy** / Art. 4: Dokumentierte Maßnahmen und Personenrolle, kein automatisches Bestehen.
- **Prohibited Practices** / Art. 5: Human applicability review mit Datum, aktueller konsolidierter Quellenbasis; heikle Themen nicht als normalen Scan automatisieren.
- **High-risk provider obligations** (u.a. Art. 9 Risk Management, 10 Data Governance, 11 Documentation, 12 Logging, 13 Transparency, 14 Human Oversight, 15 Accuracy/Robustness/Cybersecurity, 16ff Provider Duties) nur bei geprüfter High-Risk und Rollenrelevanz.
- **High-risk deployer obligations** (u.a. Art. 26/27) abhängig von Einsatz, Rollen, Ausnahmen und zeitlicher Geltung.
- **Certain transparency obligations** / Art. 50 für zutreffende Interaktions-/synthetische Nutzungsszenarien, mit juristisch geprüften Ausnahmen.
- **GPAI model obligations** getrennt von AI System Pflichten; nicht jedem OpenAI-/Anthropic-/Open-Source-API-Kunden Modellprovider-Pflichten zuschreiben.
- Menschenrechtliche/Fundamental Rights Impact Assessments (wo anwendbar), technisches Risiko, Sicherheits-/Logging-/Privacy-Nachweise nur bei Scopefreigabe.
- Fristen, Sanktionen, Meldepflichten, Ausnahmen und nationale Ergänzungen erfordern qualifizierten Review und versioniertes Geltungsdatum.

### Formulierungen und UX (rechtliche Trennschärfe)

| Nicht anzeigen | Stattdessen zulässig |
|---|---|
| „EU AI Act compliant“ | „AI-System dokumentiert; Art. 4/14/50 Status zur menschlichen Prüfung vorbereitet“ |
| „KI ist High Risk“ | „Kontext könnte eine vertiefte Anwendbarkeits-/Rollenprüfung erfordern“ |
| „Article passed 100%“ | „Dokumentation vorhanden/fehlt/unklar; Geltung nicht abschließend geprüft“ |
| „Automatisch juristisch zertifiziert“ | „Human Review abgeschlossen – keine rechtliche Zertifizierung“ |
| „Dieses Modell verletzt Art. 5“ | „Potentiell relevanter Anwendungsfall zur fachlichen Prüfung markiert“ |
| „Keine Risiken“ | „Für den erfassten Review-Scope keine zusätzlichen Dokumentationslücken gemeldet; Coverage prüfen“ |

### AI Governance QA

**AI-01** zwei Systeme, unterschiedliche Roles und Purpose, eine `unknown`-Angabe; der Review bleibt menschenabhängig.  
**AI-02** Source registry Version wechselt – historischer Report darf nicht heimlich neue Rechtsquelle behaupten.  
**AI-03** Review "reviewed" wird nicht mit "compliant" gleichgesetzt.  
**AI-04** Unzulässige Rohprompt/PII-Felder werden abgewiesen und nicht geloggt.  
**AI-05** unvollständige Declaration → offen, nicht automatisch „Low Risk“.  
**AI-06** revoked/archived System nicht aus aktivem Inventory erraten; Audit/retention beachten.  
**AI-07** Angabe `Annex III`/GPAI erzeugt Anwendbarkeits-Aufgabe, kein Ergebnis aus Regex.  
**AI-08** Provider/deployer Role in semantischer UI nicht mit App Owner/Admin verwechselt.

## 3. Datenschutz / DSGVO als Plattformbetreiber

**Rechts- und Produktabgrenzung:** GuardAI kann je nach Verarbeitung eigener Account-/Billing-/Marketingdaten **Verantwortlicher** sein und bei Verarbeitung hochgeladener Kunden-/Website-Daten auch als **Auftragsverarbeiter** auftreten. Die Rollen hängen vom konkreten Zweck/Vertrag ab und sind vor Launch verbindlich zu bestimmen.

Kontrollfragen und technische Deliverables:

| Thema | Was wirklich implementiert/vereinbart sein muss | Release-Blocker |
|---|---|---|
| Rechtsgrundlage/Transparenz | klarer Zweck für Accounts, Billing, Security Scans, Logs/Monitoring, Kontakt, Cookies | Privacy notice je Zweck, keine Copy-Paste-Vorlage als Rechtsabnahme |
| Zweckbindung/Datensparsamkeit | keine Rohkundenantworten/Prompts/Tokens unnötig persistieren; Field-/TTL-Policy | verifizierter Data Flow Inventory / PII-Klassifikation |
| Zugriff/Integrität | serverseitige RBAC/RLS, least privilege, verschlüsselte Übertragung, Safe logs, 2 orgs negative tests | tenant-isolation + threat model test |
| Speicherfristen | Roh-/normalisierte Evidence, Reports, Audit, Billing/Legal retention getrennt | pro Kategorie begründete Frist, TTL Jobs, DB/Backup Deletes |
| Betroffenenrechte | Auskunft, Export, Berichtigung, Löschung/Widerspruch je Rechtsgrundlage + Backup/gesetzliche Aufbewahrung | DSAR/Export/Delete-Prozess inkl. Fristen und Rollen |
| Drittanbieter | Supabase/Hosting/Stripe/GitHub/Email/LLM als Subprozessoren und Transfers dokumentieren | AVV/DPA, Transfer-Schutz und aktuelle Subprozessorenliste |
| Incident/Data Breach | Risiko-/Meldeprozess, Verantwortliche/Logs/Recovery, Aufbewahrung | internes Runbook und rechtliche Meldebewertung |
| Produkt Analytics | event minimisation, consent/legal basis, Retention, keine heimlichen Tracking Cookies | vor Aktivierung Review |
| Public Trust/Reports | Disclosure approval, Preview, revoke, no PII/private Evidence | real negative projection tests |

EU Commission sources:
- [DSGVO: Verarbeitungsprinzipien](https://commission.europa.eu/law/law-topic/data-protection/reform/rules-business-and-organisations/principles-gdpr/overview-principles/what-data-can-we-process-and-under-which-conditions_en)
- [Datenschutz durch Technik und Voreinstellung](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en)

**Nicht automatisch überall eine Einwilligungs-Checkbox als Rechtsgrundlage verwenden.** Zweck und tatsächliche Rechtsgrundlage fachlich festlegen; Support-/transactional Mail anders behandeln als Marketing-E-Mail.

## 4. Accessibility, NIS2, andere Standards – keine falsche Gleichsetzung

**EU Accessibility Act (EAA):** Erfasst bestimmte Produkt-/Dienstkategorien und enthält Ausnahmen; ein B2B-Security-Dashboard fällt nicht schon deshalb automatisch unter alle Vorgaben. Trotzdem GuardAI V1 **WCAG 2.2 AA orientiert** designen und mit Keyboard/Screenreader/Focus/Contrast prüfen; WCAG-Konformität nicht ohne Audit behaupten.  
Quellen: [EU-Kommission EAA](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/european-accessibility-act-eaa_en), [EUR-Lex EAA scope/exceptions](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=legissum:4403933).

**NIS2 / ISO 27001 / SOC2:** GuardAI darf technische Evidenz als Teil menschlicher Kontrollen sammeln, aber keine regulatorische Einstufung, Zertifizierung oder vollständige Normdeckung ohne freigegebene Anwendbarkeit/Mappings behaupten. Verwechslungsgefahr: Security Headers Scan ≠ Penetrationstest ≠ Datenschutzgutachten ≠ SOC2 Audit.

**DSA/DMA:** App/Plattform-Betroffenheit anhand der tatsächlichen angebotenen Dienstleistung prüfen, nicht alle EU-Digitalgesetze automatisch auf GuardAI übertragen.

## 5. SaaS Threat Model und Security-by-Design

| Bedrohung / Angreiferziel | Kontrollschicht | Test / Evidenz |
|---|---|---|
| Fremde Org-Daten lesen | Auth bearer verify, tenant-bound Repository SQL, RLS und composite FKs | 2 Nutzer × 2 Orgs, enumerate IDs, filter/list/detail, 403/404 without data |
| Rollen eskalieren / Owner entfernen | transaction locked RBAC, Admin/Owner guard, last owner policy, immutable audit | concurrent promotions/removals, malicious DTO role, self-edit |
| fremde Website scannen | verifizierter Domainbesitz, Host Whitelist/SSRF safe fetch, DNS rebinding protection | private/loopback/metadata/blocklisted hosts, redirect chains, rebinding |
| Worker / Queue abuse | quotas/rate/concurrency, job lease & idempotency, scan budget & retries | burst, crash, lease reclaim, duplicate completion |
| Auth/session compromise | Supabase confirmation/recovery event, strong auth, refresh, short token handling, invalidation | stolen/replayed recovery link, account switch, token leakage checks |
| Stored XSS / malicious target content | strict client encoding, CSP, safe parsing, sanitized normalized Evidence, no raw HTML | untrusted headers/user strings, renderer sanitization, CSP report |
| Public Trust leak | separate public projection + approval, token entropy, revocation, redaction | private Evidence/PII inaccessible, 410 revoked |
| Stripe/GitHub webhook spoof/replay | raw body HMAC/signature, provider fetch current state, idempotency, mode guard | wrong signature/mode, duplicate/out-of-order event |
| Provider token/Secret leak | secrets server only, encrypted managed store, least scopes, no logs | leaked-VITE secret scan, log and repo history checks |
| SQL migration / RLS regression | source gates + staging pg integration, non-destructive expand/migrate/contract | cross-tenant RLS tests against applied schema |
| Browser Scanner egress escape | isolated worker, DNS/egress host deny, metadata deny, resource limits, downloads off | network sandbox escape simulation in staging |
| Asset upload malware/parser | quarantine, malware scan, separate no-network parser, max size/type and CPU/memory | malicious PDF, zip bomb, mimetype spoof, parser crash |
| LLM prompt injection | treat target Evidence and text as data, never tool instruction, schema validation | malicious website instructs AI to reveal secrets/change findings |
| LLM data leakage | opt-in/scope-bound prompts, server redaction, provider DPA, no default raw customer content | PII in Evidence, provider logs, model retention settings |
| AI hallucination / automation bias | deterministic scanner is authority, AI explanation cites specific Evidence, uncertainty marker, human review | missing Evidence -> no prescriptive legal finding, adversarial evals |
| Supply chain / deploy takeover | locked deps, CI execute, protected branches, signed images/SBOM as appropriate | npm audit/SCA, build provenance, dependency update test |
| Insider or support misuse | least-privilege admin, audit and minimum-access support workflow | impersonation blocked, support data access logged |
| Outage/Restore failure | readiness, per-service metrics/alerts, queue recovery, immutable backup/restore | restore drill and controlled rollback staging |
| Abuse/cost explosion | fair-use limits, payment checks, budget alerts, circuit breaker, cancellation | concurrent expensive scans and quota race |

**Nie direkt Browser-Berechtigungen als echte Sicherheit verwenden.** Alle Mutationen erfordern serverseitiges RBAC und idempotente Transaktion. Alle Scanner/AI/Provider-Jobs mit eigener Runtime-Sandbox, kein ungeprüfter User-Content in Shell/DB.

## 6. Rechtlicher Release-Check

- [ ] Verantwortliche Betreiberidentität, Kontaktadresse, Impressum, Privacy Notice, Terms, Vertragspartner und Zahlungs-/Steuerbedingungen fachlich geprüft.
- [ ] Zweckbezogene Datenkategorien, Rechtsgrundlagen, Retention, Subprozessoren/DPA und ggf. Transfers dokumentiert.
- [ ] AI-Act-Quelle auf konsolidierten Stand 27.07.2026 oder aktuelleren Stand reviewt, versionsgesichert, Rechtsanwender-/Rollen-Checks begrenzt.
- [ ] Auth- und Teamprozesse, Datenexport/-löschung und vertragliche Aufbewahrung real getestet.
- [ ] Verfügbarkeit, Status-/Supportwege, Melde-/Recoveryprozess benannt und getestet.
- [ ] Website- und Payment-CTAs keine falschen Rechtssicherheits- und Zertifikatsversprechen.
- [ ] KI-Ausgaben sind Erklärung/Review-Hilfe, nicht automatische Legal/Fakten-Authority.
- [ ] Public Trust only explicit scope publication, timestamp + revocation.
- [ ] Security & Accessibility Smoke inkl. Keyboard, Mobile, RLS, SSRF, webhooks, third-party connectors.
- [ ] Externe Fachprüfung vor konkreten Compliance-Claims, B2B AGB/Datenschutz/Zertifizierung/Versicherung.

**Acceptance:** Rechtsrelevante AI-System-Screens dürfen niemals `AI_COMPLIANT` oder `LEGAL_HIGH_RISK_CONFIRMED` aus reinem KI-Ausgabe-/Fragebogenstate ableiten. Stattdessen belegen sie `DECLARED`, `REQUIRES_HUMAN_REVIEW`, `REVIEWED_BY_HUMAN` und die **Quelle/Version**.
