# CURRENT_STATE.md

## Repository truth — 2026-10-11 (main plus unmerged P0-06 source branch)

This file records what the current GuardAI product code actually supports. Product plans and market research do not make a capability implemented.

**Plan links (not implementation evidence):** [V1 scope/order](docs/V1_MASTER_EXECUTION_PLAN.md), [execution board](docs/V1_EXECUTION_BOARD.md), [design contract](docs/V1_DESIGN_SYSTEM.md), [competitor context](docs/COMPETITOR_POSITIONING_2026-10.md), [agent routine](AGENTS.md). GitHub Actions recent 0-step failures are a **validation blocker**, not proof the affected code passed/failed; open code PRs [#22](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/22) and [#23](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/23) remain unmerged pending executable CI.

Status vocabulary:
- **VERIFIED** — implemented and covered by the repository validation/CI gate.
- **IMPLEMENTED** — code exists, but a stronger runtime/production verification may still be required.
- **PARTIAL** — a bounded subset exists.
- **DISABLED / BLOCKED** — code or foundations may exist, but the product capability is intentionally unavailable.
- **PLANNED** — not implemented.

## 1. Foundation

- **Routing:** VERIFIED. React Router is the routed application source of truth.
- **Authentication:** VERIFIED. Supabase-backed sign-in/session integration is wired into protected application routes.
- **Organizations / workspace context:** VERIFIED. The routed app uses one workspace context; backend authorization remains authoritative. Session/token refresh preserves the currently selected authorized Organization, stale in-flight list responses are discarded, missing/failed reads do not display old tenant roles, and callers cannot select unauthorized Organization DTOs.
- **Backend API:** VERIFIED. Persistent product APIs are mounted under `/api/v1`.
- **CI:** BLOCKED_EXTERNAL. Recent PR backend/frontend GitHub Actions jobs returned failure with zero executed steps; they do not validate any current draft code. Runner cause still unverified; see issue #28.
- **Node baseline:** Node 24 / npm 11 contract is versioned in the repository.

## 1A. Public website

- **Multi-page public SaaS site:** IMPLEMENTED. Shared responsive navigation/footer now cover Home, Product, Security, Pricing, About and Contact.
- **Public product claims:** bounded to real or explicitly upcoming capabilities. The site no longer presents the product as a generic prototype/rebuild status page.
- **Pricing page:** IMPLEMENTED as packaging/launch information only. Paid checkout is not presented as publicly available until billing configuration and entitlements are released together.
- **Account lifecycle:** IMPLEMENTED IN CODE. Password reset UI now requires an in-memory Supabase `PASSWORD_RECOVERY` auth event for the current identity rather than merely any authenticated session; grant is cleared on success/sign-out/account switch. Supabase auth initialization ignores stale initial session reads after newer auth events. Detailed staging verification remains mandatory (`docs/AUTH_RECOVERY_STAGING_MATRIX.md`).
- **Public Trust publications:** remain a separate evidence-verification surface under `/trust/:slug`.

## 2. Website Targets and DNS ownership

- **Website target create/list/detail:** VERIFIED.
- **DNS TXT ownership verification:** VERIFIED.
- **Ownership semantics:** VERIFIED. A verified domain proves control of the target only; it is not displayed as proof of security or legal compliance.
- **Workspace-switch safety:** IMPLEMENTED. Target create and DNS verification actions invalidate stale async results when organization/route context changes.
- **Terminal challenge handling:** IMPLEMENTED. Verified, failed and expired challenge outcomes refresh authoritative target state.
- **Rate-limit UX:** IMPLEMENTED for target/DNS actions; HTTP 429 is surfaced without aggressive retry.
- **Ephemeral DNS secret handling:** challenge values remain one-time UI state and are not treated as retrievable durable product data.

## 3. Persistent security scanning

- **Persistent scan submission:** VERIFIED backend foundation.
- **Current externally requestable persistent module:** `security` only.
- **Verified-target requirement:** VERIFIED backend rule.
- **Role requirement:** backend requires at least `member` to submit; `viewer` is read-only.
- **Queue / worker model:** VERIFIED foundation. Long-running security work is executed by the worker pipeline rather than the HTTP request.
- **P0-06 Security worker lease heartbeat:** SOURCE IN DRAFT, **NOT CI/STAGING VERIFIED**. Security Worker now uses the abortable renewal heartbeat shared with Repository Worker, stops it before result/failure writes, and refuses both mutations if renewal reports lost ownership. Nine new regression callbacks **passed in an isolated JS mock harness**, not Node24/real Postgres/long-running HTTP or parallel workers. See [Security heartbeat regression plan](docs/V1_SECURITY_WORKER_HEARTBEAT_REGRESSION.md). The separate expired-final-attempt cleanup is still [draft PR #38](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/38), not merged.
- **Safe network fetch foundation:** IMPLEMENTED and used by the security worker. This remains a security-critical area and must continue to fail closed.
- **Idempotent submission:** VERIFIED backend foundation.
- **Tenant-scoped scan read:** VERIFIED.
- **Tenant-scoped scan history:** IMPLEMENTED and covered by repository tests.
- **Routed scan history UI:** IMPLEMENTED.
- **Routed scan detail UI:** IMPLEMENTED.
- **Target → security scan launch:** IMPLEMENTED for verified website targets and authorized roles.
- **Scan polling:** IMPLEMENTED. Queued/running scans refresh; refresh failures are shown as stale-state warnings rather than silently implying live data.

A completed scan means the requested automated checks executed and their result was persisted. It does **not** mean the target is secure, legally compliant, certified, or free of vulnerabilities.

## 4. Evidence and Findings

- **Persistent evidence produced by the scan pipeline:** VERIFIED foundation.
- **Persistent finding instances linked to scan evidence/rules:** VERIFIED foundation.
- **Evidence shown inside Scan Detail:** IMPLEMENTED with detector/version/source/hash/timestamp provenance where available.
- **Findings shown inside Scan Detail:** IMPLEMENTED with severity, lifecycle state, rule provenance, remediation and linked-evidence count.
- **Standalone routed Evidence library:** IMPLEMENTED; tenant-scoped, paginated and provenance-first.
- **Evidence freshness semantics:** IMPLEMENTED without arbitrary expiry claims. Each Evidence item is classified as current or superseded relative to the same Target + Detector, while absolute age is shown separately.
- **Evidence collection health:** IMPLEMENTED from the authoritative source Scan state. Completed, pending, failed and cancelled collection states remain distinct; collection uncertainty never becomes a pass.
- **Standalone routed Findings workspace:** IMPLEMENTED; tenant-scoped and enriched with the newest persisted technical observation.
- **Remediation / re-test workflow:** IMPLEMENTED on the V1 core path. Members can mark a finding fixed-but-unverified and launch a dedicated re-test through the same persistent security worker. A finding is shown as **Verified Resolved** only when the matching detector assesses the same target and the original fingerprint is absent; the verifying Scan ID is recorded in status history.

No-result messaging explicitly avoids claiming that zero findings means zero vulnerabilities or compliance issues.

## 4A. Controls and Frameworks

- **Canonical GuardAI Control catalog:** IMPLEMENTED as a versioned, validated source catalog mapped to existing versioned Rule IDs.
- **GuardAI Technical Security Baseline:** IMPLEMENTED as an internal technical framework with four Controls and seven bounded technical Requirements.
- **External compliance mappings:** intentionally EMPTY. GuardAI does not currently claim ISO 27001, SOC 2, NIS2 or other external framework coverage from this catalog.
- **Controls workspace:** IMPLEMENTED. Current open Findings are mapped to Controls by canonical Rule ID; absence of mapped Findings is explicitly not presented as a pass/audit result.
- **Control detail:** IMPLEMENTED with mapped Requirements, Rule IDs and current mapped open Findings.
- **Frameworks workspace/detail:** IMPLEMENTED with framework version, Control/Requirement structure and explicit claim boundary.
- **App navigation:** IMPLEMENTED as responsive active-module navigation. Placeholder enterprise modules are hidden until their routed workflows are real.

## 4B. Risk Register

- **Risk domain/API/UI:** IMPLEMENTED IN CODE. GuardAI models Risk separately from Findings with status, treatment, likelihood, impact, optional residual assessment, review date and owner.
- **Risk relationships:** IMPLEMENTED IN CODE for same-tenant Targets and Findings plus canonical GuardAI Control IDs.
- **Risk RBAC:** IMPLEMENTED IN CODE. Viewer is read-only; Member can create/update normal Risk workflow; accepted-Risk decisions require Admin/Owner.
- **Risk audit:** IMPLEMENTED IN CODE. Create/update operations write tenant-scoped Audit Events in the same backend transaction.
- **Risk storage:** BLOCKED until `database/032_risk_register_draft.sql` is promoted through the dedicated GuardAI staging migration process. Environments without the Risk tables return `RISK_STORAGE_NOT_READY` instead of simulating browser data.
- **Risk workspace:** ROUTED IN CODE at `/app/risks`; it displays the storage gate truthfully when the database capability is not provisioned.

## 5. Other product modules

The repository contains substantial foundations for additional domains, but routed availability must not be inferred from code presence.

- **Monitoring:** ROUTED IN CODE at `/app/monitoring` using the existing tenant-scoped Monitor service. Admin/Owner can create, pause, resume and disable recurring Security monitors for verified Website Targets; Viewer/Member can read. Missing Monitor tables return `MONITORING_STORAGE_NOT_READY` instead of browser fallback.
- **Notifications:** ROUTED IN CODE at `/app/notifications` using the existing tenant-scoped notification service. Users can filter unread events, mark one/all read and follow source scans/findings. Missing tables return `NOTIFICATION_STORAGE_NOT_READY`.
- **Drift:** IMPLEMENTED as a read-only canonical monitored-event projection at `/app/drift`. It only emits scanner-originated Finding introductions/reappearances tied to a real `monitor_run`, excludes the first run of each Monitor as baseline, and excludes manual status changes. **Cleared Drift is not yet claimed** because ordinary Monitor scans do not yet automatically verify absence and resolve prior Findings.
- **Reports / snapshots:** ROUTED IN CODE. Members can create immutable technical report snapshots from completed Scans; viewers can browse and inspect frozen Target, Scan, scoring, Evidence, Finding, limitation and SHA-256 provenance.
- **Trust publication:** ROUTED IN CODE at `/app/trust-center`. Admin/Owner can publish one immutable technical report through the existing curated public Trust projection, copy/open the public URL, and revoke publication without deleting the underlying report. Viewer/Member remain read-only for publication controls.
- **GitHub integration:** ROUTED IN CODE at `/app/integrations`. Viewer can inspect installation health and authorized repositories; Admin/Owner can start/reconnect the GitHub App and create verified repository Targets only from repositories returned by the current provider authorization. Suspended/deleted installation state remains explicitly unhealthy and repository connection is not presented as a completed repository security scan.
- **AI Governance:** ROUTED IN CODE at `/app/ai-governance`. Viewer can inspect active AI-System inventory and guided-review cycles; Member can create AI Systems and source-versioned guided reviews; Admin/Owner can complete or reopen the human-review workflow and archive systems. Every item remains `requires_human_review`; GuardAI does not determine EU AI Act applicability, prohibited/high-risk classification or legal compliance.
- **AI Governance storage:** BLOCKED until `database/026_ai_governance_guided_review_draft.sql` and `027_ai_governance_review_cycle_invariant_draft.sql` are promoted through the dedicated GuardAI staging migration process. Missing tables return `AI_GOVERNANCE_STORAGE_NOT_READY` rather than simulated browser data.
- **Privacy / accessibility browser scanning:** foundations exist but remain gated/fail-closed pending hardened runtime requirements.
- **Repository scanner:** bounded foundations exist; it must not be presented as full SAST, dependency vulnerability management, secret scanning, SBOM or pentesting.
- **Asset/file pipeline:** foundations exist but remain gated until runtime/storage/parser safety requirements are satisfied.
- **Billing / entitlements:** ROUTED IN CODE at `/app/billing`. Admin/Owner can read the authoritative server-side subscription state and start Checkout only for server-configured Stripe plan codes when billing is enabled. Member/Viewer do not receive billing details. Checkout return never activates entitlements; verified Stripe webhook reconciliation remains authoritative. Missing/incomplete billing schema returns `BILLING_STORAGE_NOT_READY` rather than simulated client state.
- **Billing storage:** commercial tables/invariants remain draft-gated by `database/006_entitlements_usage_draft.sql`, `016_stripe_billing_invariants_draft.sql` and `017_billing_checkout_idempotency_draft.sql`. No commercial prices or paid limits are invented in code.
- **Team management:** ROUTED IN CODE at `/app/team`. Tenant-scoped member list, safe Admin/Owner role changes and removals (no Owner mutation), seven-day expiring hashed one-time email-bound invitations, explicit manual invite sharing, authenticated confirmed-email acceptance at `/join`, revocation, and transactional Audit Events. No automated email delivery or owner-transfer flow is claimed. The invite-accept page now supports in-place account registration for previously unregistered recipients; when Supabase requires email confirmation, the recipient must reopen the original private invite after confirming because the token is never stored in the browser.
- **Audit Log workspace:** ROUTED IN CODE at `/app/audit-log`, using the existing tenant-scoped Admin/Owner Audit Event API and cursor pagination. Displays source action, actor, object and time, but never dumps unreviewed arbitrary metadata. It does not claim full activity coverage or tamper-proof external archival.
- **Team invitation storage:** BLOCKED until `database/033_team_invitations_draft.sql` is promoted through dedicated staging migration. The invite portion shows `TEAM_STORAGE_NOT_READY`; existing Membership reading remains available. Granular enterprise custom roles remain PLANNED.

## 6. Product truth invariants

GuardAI must preserve these distinctions across backend, UI, reports and AI:

```text
PASS != COMPLIANT
SCAN COMPLETED != SECURE
DOMAIN VERIFIED != SECURE
NO DATA != PASS
UNKNOWN != ZERO
COLLECTION ERROR != PASS
OBSERVATION != FINDING
FINDING != RISK
EVIDENCE != CONTROL
USER MARKED FIXED != VERIFIED RESOLVED
CONTROL STATUS != AUDITOR OPINION
AUTOMATED AI ASSESSMENT != LEGAL DETERMINATION
```

## 6A. Product completeness audit findings (2026-10-09)

- **Customer experience specification (PLANNED/REVIEWED AS REQUIREMENTS):** Customer jobs, per-page UX states/CTAs, entitlement/cancel lifecycle and accessibility in `docs/V1_CUSTOMER_EXPERIENCE_BLUEPRINT.md`; **not** automatically implemented by adding docs.
- **Public Signup CTA mismatch (SOURCE DEFECT TO FIX):** desktop `PublicSiteLayout.tsx` currently links "Kostenlos starten" to `/login`, while mobile links to `/signup`. Correct, add regression proof, and deploy only after actual CI.
- **Subscription package mismatch (LAUNCH BLOCKER):** public `PricingPage.tsx` Free/Starter/Growth/Business wording is suggested commercial packaging, **not a verified quota contract**; `server/domain/entitlements.js` does not require a quota capability for the `security` module. Before paid or constrained Free launch the same server-versioned quotas and package descriptions must drive both Marketing and authorization. See `docs/V1_SUBSCRIPTIONS_BUSINESS_MODEL.md`.
- **EU AI Act 2026 (LEGAL REVIEW BLOCKER):** the current guided review source registry contains only Articles 4/14/50 from the Regulation (EU) 2024/1689 origin; it does **not** automatically incorporate the AI Omnibus consolidated 27 July 2026 legal revisions. Any law applicability, dates, additional duties and marketing claims require source-versioned human/legal review; see `docs/V1_AI_ACT_PRIVACY_SECURITY_PLAYBOOK.md`.
- **Security and GDPR readiness:** source has multiple controls, but the threat-model/retention/accessibility/operations matrix and real two-tenant staging tests remain release gates, not verified claims.

## 7. Immediate next product work

1. Promote the Risk + Monitoring/Notification schema only in the dedicated GuardAI staging database and run tenant/invariant proof matrices.
2. Add authoritative monitored-absence resolution before introducing `finding_cleared` Drift.
3. Promote and validate Team invitations, AI Governance and Billing/Entitlement storage only through staging; prove cross-tenant isolation, invite replay/revocation/expiry, confirmed-email acceptance, and Admin/Owner guardrails before production.

Do not expose placeholder enterprise modules merely to make the navigation look larger.
