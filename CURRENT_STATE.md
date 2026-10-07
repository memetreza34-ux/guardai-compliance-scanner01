# CURRENT_STATE.md

## Repository truth — 2026-10-06

This file records what the current GuardAI product code actually supports. Product plans and market research do not make a capability implemented.

Status vocabulary:
- **VERIFIED** — implemented and covered by the repository validation/CI gate.
- **IMPLEMENTED** — code exists, but a stronger runtime/production verification may still be required.
- **PARTIAL** — a bounded subset exists.
- **DISABLED / BLOCKED** — code or foundations may exist, but the product capability is intentionally unavailable.
- **PLANNED** — not implemented.

## 1. Foundation

- **Routing:** VERIFIED. React Router is the routed application source of truth.
- **Authentication:** VERIFIED. Supabase-backed sign-in/session integration is wired into protected application routes.
- **Organizations / workspace context:** VERIFIED. The routed app uses one workspace context; backend authorization remains authoritative.
- **Backend API:** VERIFIED. Persistent product APIs are mounted under `/api/v1`.
- **CI:** VERIFIED. Frontend lint/typecheck/build and backend check/test run as non-masked GitHub Actions jobs.
- **Node baseline:** Node 24 / npm 11 contract is versioned in the repository.

## 1A. Public website

- **Multi-page public SaaS site:** IMPLEMENTED. Shared responsive navigation/footer now cover Home, Product, Security, Pricing, About and Contact.
- **Public product claims:** bounded to real or explicitly upcoming capabilities. The site no longer presents the product as a generic prototype/rebuild status page.
- **Pricing page:** IMPLEMENTED as packaging/launch information only. Paid checkout is not presented as publicly available until billing configuration and entitlements are released together.
- **Login experience:** IMPLEMENTED with GuardAI public-site branding while preserving Supabase authentication behavior.
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

## 5. Other product modules

The repository contains substantial foundations for additional domains, but routed availability must not be inferred from code presence.

- **Monitoring / drift:** backend foundations exist; routed product UI is not yet active.
- **Reports / snapshots:** backend foundations exist; routed product UI is not yet active.
- **Trust publication:** backend/public foundations exist; authenticated assurance workflow is not yet complete.
- **GitHub integration:** foundations exist; full routed integration workflow is not yet active.
- **AI Governance:** guided-review/evidence foundations exist; routed product UI remains unavailable in the current app shell.
- **Privacy / accessibility browser scanning:** foundations exist but remain gated/fail-closed pending hardened runtime requirements.
- **Repository scanner:** bounded foundations exist; it must not be presented as full SAST, dependency vulnerability management, secret scanning, SBOM or pentesting.
- **Asset/file pipeline:** foundations exist but remain gated until runtime/storage/parser safety requirements are satisfied.
- **Billing / entitlements:** backend foundations exist; routed billing product experience is not yet active.
- **Team / granular enterprise administration:** not yet complete in routed product UI.

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

## 7. Immediate next product work

1. Evidence freshness semantics and collection-health states.
2. Basic Risk register connected to findings/controls/assets.
3. Monitoring/drift and notification product surfaces after those object relationships are stable.

Do not expose placeholder enterprise modules merely to make the navigation look larger.
