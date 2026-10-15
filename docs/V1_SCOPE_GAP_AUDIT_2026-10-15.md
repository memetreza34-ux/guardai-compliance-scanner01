# GuardAI — first-release V1 scope and gap audit

**Audit:** 2026-10-15. **Base inspected:** main @ `cd4f31b09d059c959524e3a525132aaf39f681ee`.
**Change branch:** `feat/v1-minimal-customer-surface-20261015`.
**Release charter:** [proposed product decision / PR #40](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/40).
**Purpose:** Decide what is actually necessary for a first usable website-security release. A source component or draft PR is NOT a working, validated feature.

## Customer promise and minimum app

The first public promise should be **bounded technical Website Security with understandable findings, remediation/re-test and trustworthy technical reports**. Target audience: website operators, technical founders/developers and small agencies, still a user-research hypothesis. Do not present ISO/NIS2/GDPR/AI Act certification or comprehensive vulnerability scanning.

V1 sidebar order and route scope:
1. Dashboard (/app) — real data/first next action.
2. Websites (/app/targets, /app/targets/:targetId) — owner-authenticated domain verification.
3. Scans (/app/scans, /app/scans/:scanId) — actual security module, coverage/errors, evidence embedded in detail.
4. Findings (/app/findings) — what/why/how-to-fix, mark fixed and matched technical re-test.
5. Berichte (/app/reports, /app/reports/:reportId) — immutable report details and source/version/limitations.

Sign up/login/recovery, organization setup and sign out are operational prerequisites, not extra feature sections. Public home/product/security/about/contact and a truthful prelaunch pricing page remain. Existing public callback/Trust-read URLs remain for compatibility; keeping them is not a promise of a released integration.

## Deferred from V1 navigation AND authenticated app routes

- Global Evidence library (retain observations in Scan detail; no need for duplicate top-level surface).
- Controls, Frameworks, Risk Register, AI Governance review.
- Monitoring, Drift and Notifications.
- Public Trust Center administration/badges.
- GitHub integration management and repository scanner.
- Billing page, paid plans, Stripe checkout as a customer product.
- Team & Audit Log UI (backend tenancy and audit invariants are **not** removed; security remains mandatory).

Implementation files/services/schema drafts have deliberately NOT been deleted. This is a **frontend product-surface freeze**, not backend endpoint removal or a secure feature flag. Independently audit/gate non-core endpoints prior to public access. Direct URLs for deferred authenticated app pages fall through the protected app redirect. Preserve any previously published `/trust/:slug` reads and provider return/callback routes as compatibility boundaries. Do not disable webhook signatures or RLS just because a page is deferred.

## Current implementation vs what is still missing

| V1 area | Code/surface currently present | Missing release evidence / priority |
|---|---|---|
| Signup, confirm, login, recovery | React + Supabase adapters in code | Real staging SMTP, expired/replay recovery, workspace entry, wrong-account safety and success/error E2E. P0 |
| Dashboard + first-run | Routed dashboard/WorkspaceOnboarding in main; PR #22/#23 pending | Single no-dead-end guided first run; API failure/empty/permission cases, accurate tenant/scope after switch. P0 |
| Website targets + DNS | Target create/detail, DNS TXT challenge, scans; strong draft fixes #33/#37 | Staging verified ownership, expired challenge, private IP/SSRF/redirect, cross-org negatives and rate-limit UX. P0 |
| Security scan | Bounded `security.headers` + persistent queue/worker in source | Workers actually deploy/run/recover; lease safety fixes #38/#39, real deterministic result with negative tests and no fake PASS on error. P0 |
| Evidence + Findings + Re-test | Persistence, scan detail, findings; draft security scope fixes #30–#36 | Verify versions/hash/fingerprint and matched absence, 2-org isolation; plain-language fix instructions and no misleading green state. P0 |
| Technical report | Immutable snapshot + report routes exist | Real report from scan, hash/provenance validation, permissions, usable share/print strategy; no V1 Trust-Center link. P0 |
| Public copy / pricing | V1-only public presentation in this branch | Do not advertise unimplemented quotas/certification. Keep paid plans as internal drafts until server-side enforcement and pricing evidence. P0 |
| Website inventory | Targets list in code | This branch stops presenting failed scan history fetch as zero scans; test failures, unknown and retry across org-switch. P0 |
| Mobile/accessibility | Responsive utility classes in source | Manual 320/390/768px, keyboard, focus and cross-browser UX tests; no reliance on visual inspection alone. P1 |
| Legal/support | Contact page is routed | Verified Impressum, Datenschutzerklärung, account/delete/retention contact and legally reviewed terms as applicable before German public release. No source route for Impressum/Datenschutz seen in `AppRoutes.tsx`. P0 |
| Infrastructure | Node24/npm11 CI definition, PostgreSQL drafts and worker scripts | Actions frontend/backend **zero steps** run #38525559458; dedicated GuardAI Supabase staging project identity, ordered migrations, tenant/RLS, secrets, TLS/CORS, backups/restore, observability and real scan budget. P0 |

**Open PRs at audit:** #6, #22, #23, #26, #27, #30–#39, #40. Review overlap; do not bulk-merge or mark any code production-ready based on mocked tests. `CURRENT_STATE.md` uses VERIFIED for some areas despite contemporary 0-step Actions; real run and Staging evidence is authoritative.

## What changed in this branch, and what did not

Changed:
- Slim V1 sidebar and React routes.
- Product/home/about/pricing language aligned to one website-security journey.
- Removed inaccessible Trust Center action from report detail.
- Website inventory labels clarified.
- Scan-history request failure no longer silently becomes '0 tested websites'.
- Node built-in static surface regression test added to frontend CI definition.

Not changed:
- Database / SQL drafts / RLS / production data.
- Backend routes or worker/scanner code.
- Deployed feature flags or Stripe accounts/providers.
- Authentication permissions or existing API schemas.
- Draft PRs for first-run/security/worker fixes.

## Exit criteria for a public first release

1. Real CI frontend/backend jobs **run all steps and pass on exact SHA** (not 0-step result).
2. Dedicated GuardAI staging with applied reviewed migrations and two-org isolation tests.
3. A real customer can finish Signup → Workspace → DNS verification → Security Scan → Finding/Evidence → Remediation/Re-Test → Technical Report, with positive + negative cases.
4. All user-facing URLs/buttons work, bilingual debt is removed, mobile/keyboard/cross-browser and data-failure states are checked.
5. Security abuse tests, worker restart/lease recovery, backup/restore, secret/log redaction, legal/privacy/contact and responsible live ops pass.
6. No paid plan or quota claim unless actual server enforcement is proved; pilot with real customers before introducing subscription complexity.

**Next work, ordered:** R1 investigate Actions job failure banner/account settings; R2 validate and integrate relevant existing security/first-run fixes; R3 owner supplies only the dedicated GuardAI Supabase **non-secret project ref** and migrate safely in staging; R4 end-to-end proof; R5 UX polish + legal/runtime operational release gates. No unrelated features until all gates clear.
