# GuardAI – Wettbewerber, Lücken, Produktstrategie (Stand 2026-10-09)

**Art der Aussagen:** Primärquellen/öffentliche Produktseiten der Anbieter. Das ist eine **qualitative Feature-Positionsanalyse**, keine Preise-/Marktanteils-/Qualitätsprüfung. Marketingversprechen der Wettbewerber werden nicht automatisch als technische Wahrheit übernommen. Quellenstand siehe Links unten.

## 1. Marktübersicht – direkte vs indirekte Wettbewerber

| Produkt | Was die öffentliche Anbieterbeschreibung hervorhebt | Relevanz für GuardAI | Nicht sofort imitieren |
|---|---|---|---|
| **Vanta** | Breite Compliance-Automatisierung, wiederkehrende Controls, Integrationen, Remediation, Trust Center, AI-Workflows | Funktionsvorbild für kontinuierlichen Evidence→Control→Trust-Prozess | Tausende Integrationen, Policies/HRIS, vollständige Multi-Framework-Unternehmensplattform |
| **Drata** | Controls/Evidence, Framework-Mapping, kontinuierliches Monitoring, Ownership, Audit Hub, Trust Center und Questionnaire Support | Nachweis- und Berechtigungsprozesse, UI-Informationsarchitektur, kontinuierliche Readiness | Audit-Ready-Zertifizierungsanspruch, große Beratungs-/Audit-Ops vor realem Core |
| **Secureframe** | Tests mit Evidence und Control/Framework-Bezügen; Remediation, Evidence Export, Framework Requirements | Datenmodell für einen lückenlosen Prüfpfad und erklärbare Coverage | Komplettes Policy-/Personnel-/Audit-Management vor getesteter Security Engine |
| **Sprinto** | laufende Compliance-Checks/Alerts; AI Governance mit AI-Tool Registry, Risiko, Genehmigung, Monitoring | AI Governance Workflow-Reife und change-driven Monitoring als spätere Stärke | automatische juristische AI-Act-Klassifikation ohne geeigneten rechtlichen Review |
| **UpGuard Breach Risk** | externe Attack-Surface-Sicht, Monitoring von Internet Assets, Leaks und Brand Abuse | Kontext für priorisierte technische externe Website-Risiken | Dark-Web-/Breach-Intelligence oder vollständige EASM-Behauptung ohne Datenquelle |
| **Mozilla HTTP Observatory** | frei zugängliche Website-HTTP-Header-/Konfigurations-Checks mit Scores und Hinweisen | Untere Messbarkeitslatte für reproduzierbare Website-Security-Detektoren | reiner numerischer Score ohne durchgängige Remediation, Tenancy, Rule-/Evidence-Provenance |

### Quellen (öffentlich; aufgerufen 09.10.2026)

- Vanta – [Features](https://www.vanta.com/features) und [Automated Compliance](https://www.vanta.com/products/automated-compliance)
- Drata – [Continuous Compliance](https://drata.com/products/compliance), [Evidence Overview](https://help.drata.com/en/articles/13404035-evidence-overview), [Framework/Control Ownership](https://help.drata.com/en/articles/14670605-section-5-control-owners)
- Secureframe – [Automated Tests and Evidence](https://secureframe.com/features/automated-evidence-collection), [Framework Views](https://support.secureframe.com/en/articles/15111116-using-the-frameworks-views-in-secureframe)
- Sprinto – [AI Governance](https://sprinto.com/products/ai-governance/), [Continuous Compliance](https://sprinto.com/continuous-compliance/)
- UpGuard – [Breach Risk / Attack Surface](https://www.upguard.com/product/breach-risk)
- Mozilla – [HTTP Observatory](https://developer.mozilla.org/en-US/observatory/docs/tests_and_scoring), [Limitations FAQ](https://developer.mozilla.org/en-US/observatory/docs/faq)

Die Quellen sind bewusst vorwiegend **Anbieter-Primärquellen**; unabhängige Kundenbewertungen/Kosten/Nutzerstudien müssen vor einer öffentlichen Wettbewerbsbehauptung gesondert geprüft werden.

## 2. Marktlücke, die GuardAI realistisch bedienen kann

**Fokus-Nische: `Developer-first Technical Evidence & Remediation` für kleinere SaaS-Teams und Agenturen.**

Das sinnvolle Startversprechen ist nicht „Wir schlagen Vanta/Drata in sämtlichen Compliance-Bereichen“, sondern:

1. **Sofort begreifbare erste technische Prüfung:** Website verifizieren und konkrete Security Evidence/Rule-Provenance lesen.
2. **Nachvollziehbare Herkunft:** Zu jedem Finding echte Zeit, Target, Detector/Rule-Version, Scan, Hash, Confidence/Severity getrennt.
3. **Fix→Re-Test→Verified Resolved:** Zeigen, ob derselbe Check denselben Target-Fingerprint nachweislich nicht mehr findet; nicht einfach Status per Klick in „sicher“ umstellen.
4. **Versionierte technische Baseline + Risiko + Monitoring:** Ein schmaler End-to-End-Pfad kann wertvoller sein als 40 halbfertige Module.
5. **Auditor-/Kundenkommunikation ohne Overclaim:** Snapshot statt Marketing-Sicherheitsbadge, public Trust-Auszug kuratiert, RLS/Freigaben überprüft.
6. **Verständliche Bedienung für kleine Teams:** gute leere Zustände, keine langwierige Setup-Beratung als Voraussetzung für ersten gemessenen Wert.

**Wichtigster Wettbewerbsvorteil ist nur dann echt, wenn GuardAI technisch und operativ messbar funktioniert.** Eine UI, die eine größere Featureliste verspricht, ist kein Wettbewerbsvorteil.

## 3. Konkret fehlende Dinge – gegenüber dem Ziel, nicht behauptet als Markt-K.O.

| Lücke in GuardAI | Risiko beim Kunden | Roadmap |
|---|---|---|
| Fehlende Staging DB / ungeprüfte Migrationen | die „echten“ UI-Module bleiben möglicherweise nicht nutzbar | P0-04–07 |
| GitHub Actions 0-Step-Failures | jede neue Codeänderung ohne reproduzierbare CI | P0-01 |
| Uneinheitliches Design und First-Run Journey | Produkt wirkt unfertig, hohe Abbrüche | P0-02/03/08; P1-12/13/16 |
| Zu geringer öffentlich aktivierter Scanner-Umfang (`security` only) | Anspruch „GRC-All-in-one“ wäre überzogen | P2-01–04 nach Isolation |
| Risk/Monitoring/AI/Billing/Invites sind datenbankseitig gated | Mehrere fertige Screens könnten im Kundentest scheitern | P1-05/06/08/09/11 |
| Kein echtes end-to-end Nutzungs-/Zahlungs-/Support-Proof | verkaufbare SaaS noch nicht abgesichert | P0-07/09/10, P1-11/15 |
| Nur interne GuardAI Baseline, keine externen Norm-Claims | Käufer müssen Compliance-Mappings separat behandeln | P2-07 nach Legal/Source |
| Kein ausgereiftes Privacy/Accessibility-Browser-Setup | „Privacy/Accessibility Scan“ kann nicht seriös beworben werden | P2-01/02 |

## 4. Produktentscheidung: in welcher Reihenfolge wir konkurrieren

**Welle 1 – Product Reliability:** Website/Scan/Finding/Evidence/Re-Test + verständliches Design + realer Kunden-Workflow. **Ziel: funktionierende technische Prüfung.**

**Welle 2 – Sticky workflows:** Risk, Monitoring/Drift, Reports/Trust, Team, GitHub App, AI Human Review auf echte Staging-Persistenz bringen. **Ziel: wiederkehrender Gebrauch und interne Zusammenarbeit.**

**Welle 3 – Commercial completeness:** Stripe/Plans, Privacy/Terms, SMTP, Settings, Support, Fehlertransparenz/Backup/Observability. **Ziel: verlässliches, öffentlich betreibbares SaaS.**

**Welle 4 – Breadth:** Privacy/Accessibility-Browser, sichere Repository-/Asset-Checks, Vendor/Policy/Questionnaire/Frameworks, Enterprise. **Ziel: größere Kundensegmente, nur nach Safety-/Wirtschaftlichkeitsnachweis.**

### Bewusst vermeiden

- Vanta/Drata-SOC2/ISO-Compliance-Status ohne lizenziertes Mapping, überprüfte Controls und Audit.
- Mozilla-Observatory-ähnlichen Score in „vollständig sicher“ umbenennen; selbst Mozilla beschreibt Grenzen seiner Prüfungen.
- SecurityScore-/„Critical“-Zahlen auf geschätzten Demo-Daten anzeigen.
- Großes KI-Dashboard als Differenzierung, solange eigene Scanner-/Evidence-/Review-Evals fehlen.
- Tarife, Konkurrenzpreise oder Umsatzpotenziale ohne verifizierte, datierte Quelle als Zahlen präsentieren.
- Verbreitete Wettbewerber-Screens/UI kopieren; eigenständiges Designsystem.

## 5. Wie wir Forschung künftig aktualisieren

**Quartalsweise bzw. vor kommerzieller Preisentscheidung:** Feature-Matrix aus offiziellen Produkt-/Hilfedocs neu prüfen, Quellen mit Datum speichern, Changes gegenüber Vorversion markieren. Ergänzend mindestens 5 Gespräche/Demos mit realen potentiellen Nutzern (SaaS/Agentur/Security), um Bedürfnisse und Prioritäten zu validieren. Bis dahin gelten die Prioritäten oben als fundierte **Produkt-Hypothesen**, nicht als belegte Kundenpräferenzen.

**Was noch offen bleibt:** exakte Wettbewerberpreise/Tiers, User-Recherche, CAC/Distribution, regulatorische Lizenzrechte, gewünschte GuardAI-Tarife. Diese sind relevante kommerzielle Entscheidungen, aber **kein Grund, die technische V1 planlos auszubauen**.
