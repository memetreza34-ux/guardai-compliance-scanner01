# GuardAI V1 Release Charter — Scope Freeze & Product Advisor Contract

**Date:** 2026-10-15. **Status:** PROPOSED, documentation-only; no production approval.
**Owner decision to pursue:** deliver the smallest credible technical Website Security V1 with high-quality UX and independently verified backend behavior.
**Change authority:** Owner may explicitly revise scope. No agent may expand scope by inference.
**Evidence rule:** This charter is a PRODUCT DECISION, not evidence that the product works.

## 0. How this fits the existing documentation

This charter takes priority **for the first customer-facing V1 release boundary and choice of next work only**. It does not override security, legal, engineering correctness, RLS or external staging gates.

1. **Truth and evidence:** code + runtime/CI/staging evidence; reconcile any contradictory status labels in CURRENT_STATE.md.
2. **Release boundary / what not to build:** this document.
3. **Next executable task / dependencies:** docs/V1_EXECUTION_BOARD.md, interpreted through the V1-only release filter below.
4. **Detailed designs:** docs/V1_MASTER_EXECUTION_PLAN.md, docs/V1_DESIGN_SYSTEM.md, docs/V1_CUSTOMER_EXPERIENCE_BLUEPRINT.md.
5. **Architecture, business, legal:** existing technical ADRs, subscription and AI/security/privacy documents. They remain valuable references, **not promises of V1 scope**.

When older roadmaps describe extra modules as V1, treat them as **V1+ backlog** unless the owner changes this charter. Do not create another all-in-one plan.

## 1. One clear product

**Audience for first validation:** small SaaS operators, developers responsible for public websites, and small web agencies. This is a hypothesis to validate through real customer interviews.

**One-sentence outcome:** Verify an owned website, run a bounded technical security configuration assessment, understand each finding and evidence, make a fix, re-test, and share a scoped technical report.

**Not a legal/compliance certification:** no claim of full GDPR, NIS2, EU AI Act, ISO 27001, SOC 2 compliance; not a penetration test, vulnerability-free or 'secure' guarantee. A completed scan is a record of specific completed checks, not a safety statement.

**Primary differentiator to validate:** guided remediation + verified re-test + evidence provenance + usable sharing, rather than one more HTTP header grade.

## 2. Strict V1 slice

**Included in customer-facing V1:**
- Honest public landing/product/security/contact/pricing-as-prelaunch, signup/login/email confirmation/recovery.
- Authenticated organization creation and coherent first-run flow with no duplicate onboarding/permissions dead ends.
- Website target registration, DNS TXT proof of ownership, target state and strict server-side authorization.
- One **bounded Security** scanner only, with safe HTTP(S) target handling, asynchronous job processing, detector coverage, queued/running/completed/failed/unknown, clear failures and retry semantics.
- Dashboard with only real persisted data; scan history/detail; Finding, linked Evidence, exact detector/rule/score versions and source timestamps.
- Explain finding: **what was observed / why it matters / how to fix / evidence / check scope**. User-marked fixed must not be labeled verified; matching detector/target re-test needed for verified resolved.
- Technical report snapshot with immutable scope/provenance; private-by-default, sharing/revocation only if correctly authorized and proven. If exporting a polished PDF/print is not technically sound, ship a reliable authenticated readable/printable report first rather than add an unvalidated exporter.
- Essential account/workspace management and trustworthy feedback/loading/empty/partial/stale/403/429/failed states, responsive/mobile/keyboard.

**Explicitly NOT launch blockers / not advertised as available in V1:** repository scan, privacy/consent browser scan, accessibility scan, asset/document/AI file scan, full AI Governance/AI Act workflows, broad external framework maps, enterprise risk/vendor/policy/auditor hub, SSO/SCIM, generic API keys/SDKs, expanded integrations, complex team/role administration, fully fledged recurring monitoring/notifications/Trust badges and paid billing. Retain existing code but feature-gate or hide unavailable UI; do not delete good foundations or rewrite architecture merely to satisfy the charter.

**Paid plans:** V1 can be a credible **free private beta**. Stripe, seats, quotas and paid checkout are not required to prove first value. Any published plan limit (e.g., 1 Website or 50 monthly scans) must be enforced across server mutation paths before it is described as an active entitlement. Until then display clearly as proposed/beta or remove the promise.

## 3. Experience and design contract

**UX north star:** The customer can answer 'What was tested?', 'What was found?', 'What can I do?' and 'Did my fix actually work?' without expert assistance.

Navigation for the first release: **Dashboard / Websites / Scans / Findings / Reports / Account**. Evidence accessible from scan and finding detail; do not require a global 'Evidence' top-level menu for V1. Extra modules do not appear as usable navigation if gated. Existing storage/routes may remain intact internally.

Use existing React 19 + TypeScript + Vite 8 + Tailwind 4 + Base UI/shadcn, tokens and components. Keep GuardAI's restrained slate/navy/indigo visual language. No new design library, flashy restart or page-count growth. German is the proposed primary V1 product language; public/registered/legal wording should be consistent, followed by English later if requested.

Screens must support empty / loading / partial / stale / forbidden / throttled / failed / disabled states; plain-language headings and clear next action; tested mobile widths 320/390/768/1024/1440px, keyboard focus and WCAG 2.2 AA as a design/test target (no automatic conformity claim). No fake statistics, demo customers or ungrounded badges.

## 4. Hard release gates and the critical path

Each stage ends with **real test evidence**, exact commit SHA, environment and test result. 'Code exists' does NOT equal 'verified'. WIP limit: **one release blocker / narrow PR at a time**, unless explicitly safe parallel independent validation. Branch / draft PR first, no direct production mutations.

| Gate | What must be accomplished | Acceptance evidence |
|---|---|---|
| R0 — Freeze | This charter acknowledged; classify V1 vs deferred routes/PRs; no new V2 work | Current navigation/scope inventory, non-core modules hidden/gated |
| R1 — Restore verification | Diagnose GitHub Actions frontend/backend 0-step failures; fix account/runner restrictions, not speculative code edits | Both real jobs execute npm ci/lint/typecheck/build and backend check/tests on same SHA; green links |
| R2 — Integrate fixes | Review draft PRs #22/#23/#26/#27/#30–#39 and other overlaps by file and risk. Merge only tested, relevant minimal patches; do not merge all blindly | Reviewed diffs, passing targeted/full tests, regressions, updated status |
| R3 — Dedicated GuardAI staging | Identify exact dedicated Supabase project ref without secrets; review 33 SQL drafts, generate/version migrations and apply only in isolated staging | Schema/RLS migration log, restore proof, two-org negative tests |
| R4 — One true journey | signup → confirmation → org → website → DNS → scan → evidence/finding → fix/re-test → report | Automated smoke + at least two manual accounts and two Orgs, success/error/retry/replay, exact logs/SHAs |
| R5 — Product polish | Correct CTAs/navigation, consistent UI language, responsive, keyboard, all error/empty states, rule-by-rule fix guidance | Desktop/mobile/keyboard/browser QA, findings screenshots, no dead links |
| R6 — Private beta | Deploy TLS/CORS, secrets, bounded workers, logs/alerts, backups/restore, retention/privacy/imprint/terms and support/contact; test real owned targets | Signed release checklist, backup restore, security negatives, pilot-user outcomes |

**No public release until R1–R6 and release owner approval.** Optional monitoring or paid sales move to **after** a stable pilot unless explicitly re-scoped with evidence of customer demand. A working core with fewer features is better than an apparent full suite.

**User-dependent blockers documented on 2026-10-15:**
- Latest main CI run #38525559458: frontend and backend fail **before first step**; cause unknown. Need GitHub Actions job banner plus Actions/runner/billing access review; do not assert billing as proven root cause.
- Dedicated GuardAI Supabase project reference is not independently mapped/verified. Request only non-secret project ref; never mutate a shared/unrelated project.
- Hosting/domain, legal operator and business decisions are not yet proven for production.
- Open draft PRs do not constitute released fixes; review individual diffs, tests, conflicts and SHAs first.

## 5. Test strategy (risk-first, not vanity coverage)

**Mandatory security negatives:** unauthorized users/roles, cross-Org reads and mutations, RLS with two Orgs, stale context, DNS ownership expiry/rebind/redirect SSRF, metadata/private IP ranges, link/token replay, worker lease loss/crash/reclaim, timeouts, scan status coverage, report publication scope, secrets/log redaction.

**Mandatory functional positives:** auth/session recovery, onboarding, DNS verification, true detector evidence, job retry/idempotency, finding remediation/re-test, report integrity/revocation. All successful claims backed by persisted data.

**Mandatory UX:** 320/390 mobile, keyboard Tab/Escape/focus, comprehensible errors, no dead CTA, no unknown displayed as zero/pass, scanner coverage always shown.

Use existing Node/frontend/backend tests first. Add targeted tests for found gaps; do not rebuild the test suite for its own sake. Browser E2E when dependencies and staging exist. OWASP ASVS v5.0 is useful for checklist design; W3C WCAG 2.2 for accessibility target. Automated checks never replace human review.

## 6. The advisor behavior EVERY future contributor/agent must follow

Before any work:
1. Read this charter, AGENTS.md, CURRENT_STATE.md, the release board and actual relevant code/PR state. Verify dates and evidence; code wins over outdated status prose.
2. Think like a **product advisor, not a feature generator**: ask whether the work unlocks a release gate or solves a real verified user/security problem. If not, recommend deferral; be explicit about scope/cost/security implications.
3. Choose the **smallest high-impact unblocked action** on the R0→R6 path. No unrelated features, new dashboards, refactors, dependency churn or cosmetic redesign.
4. State current blocker, exact impacted files, minimal fix, acceptance criteria and test plan. Implement only that scoped slice.
5. Run/review real tests. Never present 0-step CI as passing, never claim staging when only mock tests ran, never mark DONE on source-only evidence.
6. Update this document **only** for explicit scope decisions; update CURRENT_STATE.md and docs/V1_EXECUTION_BOARD.md after real changes with SHA, CI link, staging test and remaining blocker. Keep PR draft until verified.
7. End each delivery with: **Done / Evidence / Remaining risks / Next unblocked step / User input strictly required**. Protect release momentum by challenging unnecessary requests with an alternative that fits V1.

**Feature admission rule:** a proposed feature outside V1 requires an explicit owner decision and a short evidence-based case: user pain, indispensable outcome, maintenance/security cost, effect on R1–R6, and what is deferred in exchange. Default = V2 backlog. Do not let unrelated work silently become a V1 requirement.

**Research cadence:** refresh competitor and legal/technical references when making a related decision, record primary source URL and checked date; do not blindly inherit historical October 2026 research. No unsupported TAM, pricing or revenue predictions.

## 7. Market evidence and references (checked 2026-10-15)

| Category | Primary source / observed positioning | GuardAI product implication |
|---|---|---|
| HTTP Observatory | https://developer.mozilla.org/en-US/observatory/docs/tests_and_scoring – graded HTTP header/config checks and context limits | A grade alone is not differentiation |
| SecurityHeaders | https://api.securityheaders.com/faq/ – A+ to F header grade | Must add guided fix/retest/provenance |
| Internet.nl | https://internet.nl/ – public DNS, HTTPS and mail standards checks | Do not claim novel basic network scanning |
| Hardenize | https://www.hardenize.com/pricing – managed attack surface/configuration and certificate monitoring | Monitoring is a future paid value hypothesis |
| Probely | https://probely.com/pricing/ – free/paid web and API vulnerability scanning | Do not advertise DAST/crawling/SAST without real modules |
| Vanta | https://www.vanta.com/products/automated-compliance – broad evidence/control automation | Architectural long-term reference only |
| Drata | https://drata.com/products/compliance-automation – continuous control monitoring and audit | Do not compete on full enterprise breadth at V1 |
| UpGuard | https://www.upguard.com/product/breach-risk/attack-surface-management – continuous external asset discovery | Not a V1 feature |
| Security guidance | https://owasp.org/projects/asvs and https://www.w3.org/TR/WCAG22/ | Risk-focused negative tests and inclusive design |

These reflect provider positioning, not independently proven feature quality, market share or demand. After reliable pilot functionality, interview at least five target operators/agencies and test whether remediation/re-test/reporting justify adoption or payment.

## 8. Decisions pending owner review

- Confirm **bounded website-security-first V1** and that additional modules are deferred, not deleted.
- Choose private-beta audience: SaaS founders/developers first; small web agencies as secondary hypothesis.
- Confirm German-first UI, with the exact target customer language to test.
- Decide whether first beta is free. **Suggested: free, no paid checkout** until product + quotas + operations are proven.
- Supply **non-secret** GuardAI Supabase project reference and GitHub Actions failure banner only when needed.

**First action after accepting scope:** address R1 (runner 0-step issue), then R2 limited PR triage and R3 staging in parallel only where dependencies make it safe. Do not add another feature.
