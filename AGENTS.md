# GuardAI – instructions for engineering agents and contributors

**Mission:** Ship a genuinely functioning, visually consistent, tenant-safe GuardAI SaaS. No rushed cosmetic feature flags, no demo success and no ungrounded compliance promises.

## Release-first product advisor mandate (2026-10-15)

**READ FIRST:** [V1 Release Charter / Scope Freeze](docs/V1_RELEASE_CHARTER_2026-10-15.md). It governs the first-release feature boundary and R0–R6 critical path. All earlier broad plans/boards remain deep references, not permission to expand the first release. If a broad roadmap ticket conflicts with the V1 charter, do not build it for V1 unless the owner explicitly changes scope.

Act as a **critical product advisor**, not a feature factory: challenge requests that distract from a working, secure, understandable Website Security first release; suggest the smallest alternative that brings first user value. Prioritize proven core onboarding → authorized Website → security Scan → Finding/Evidence → Re-Test → report. Defer paid billing, browser/repository/asset scanners, AI Act/GRC expansion and enterprise extras to V1+ unless owner approval and evidence change the gate.

**Delivery contract:** identify release gate R0–R6, smallest blocking task, files/acceptance/tests, execute only narrow changes, then report Done / evidence+SHA / open risks / next unblocked step / required non-secret user input. One WIP release blocker at a time, no automatic scope creep. Keep CURRENT_STATE.md and board synced to **real** CI/staging evidence, never mark a 0-step failed workflow VERIFIED. Historical PRs must not be bulk-merged; source branches already integrated in #46 must not be independently merged again. User expectation is high-quality speed through scope discipline, not more screens.

## Three-agent handoff and exclusive ownership (2026-10-16)

**READ SECOND:** [V1 Agent Ownership — ChatGPT / Codex / Claude](docs/V1_AGENT_OWNERSHIP_2026-10-16.md).

- **ChatGPT in this chat = Release Lead / integrator / critical product advisor**: scope, task assignment, CI and PR evidence, conflict prevention and release decisions. Avoid editing the same implementation files currently owned by Codex; hotfix only after explicit reassignment.
- **Codex = Implementation owner** for the remaining SQL/migration/local RLS test harness first, then real customer-journey E2E and deployment technical fixes. One active issue and draft PR at a time; no provider/live DB mutations without GuardAI-only staging identity.
- **Claude = independent security/QA reviewer** of actual combined [PR #46](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/46), then Codex's completed PRs. Read-only review/comments by default, reproducible P0/P1/P2 findings, no approving own modifications.
- **User = external environment/product authorizations**, especially [dedicated Supabase project #29](https://github.com/memetreza34-ux/guardai-compliance-scanner01/issues/29).
- Creating Issues is **not** the same as running Codex or Claude. Both must be explicitly started by the user; do not claim an agent is active without execution evidence.
- **#46** is the integrated V1-code candidate and remains draft/not staging verified; **#42** is historical backend-only review context. Never merge both.

## Mandatory read order at the start of each work block

1. `docs/V1_RELEASE_CHARTER_2026-10-15.md` – first-release scope and product advisor gate; never silently expand V1.
2. `docs/V1_AGENT_OWNERSHIP_2026-10-16.md` – sole owner of each active task and handoff contract; prevent cross-agent overlapping file changes.
3. `CURRENT_STATE.md` – actual code/validation truth; never promote an implementation based on plans alone.
4. `docs/V1_MASTER_EXECUTION_PLAN.md` – agreed product scope, critical path and release gates.
5. `docs/V1_EXECUTION_BOARD.md` – first P0/P1 ticket that is not blocked.
6. `docs/V1_DESIGN_SYSTEM.md` – shared UI and state architecture.
7. `docs/V1_CUSTOMER_EXPERIENCE_BLUEPRINT.md` – per-screen customer journey, what next, user errors, privacy-safe activation; `docs/V1_SUBSCRIPTIONS_BUSINESS_MODEL.md` – billing/business/usage; `docs/V1_AI_ACT_PRIVACY_SECURITY_PLAYBOOK.md` – up-to-date legal+AI governance+security claims.
8. Relevant source/API/schema/tests and ADRs. Read `docs/COMPETITOR_POSITIONING_2026-10.md` when changing strategy/feature scope.

Do not rely on the stale historical `docs/BUILD_PROGRESS_MATRIX.md` to infer current product completeness. `docs/GUARDAI_MASTER_BUILD_GUIDE.md` remains the detailed engineering/architecture reference.

## How to act when user says „weiter“ / continue

- Pick **the highest-priority unblocked ticket**, inspect the existing implementation and its dependencies, then do real scoped work in this repository. Don't ask another generic “what should I build?” question.
- Plan only a small, reviewable set (prefer 1–3 related tasks). Explain what will be changed and what will be tested; avoid unrelated polishing.
- Work on a named branch; never edit production environment/DB as if a draft SQL were a migration.
- Add/repair real code, backend authorization, error/loading/empty/unknown UX, typed contracts, and targeted tests.
- Validate the **exact PR HEAD SHA** with frontend lint/typecheck/build and backend check/test. Database/provider changes additionally require dedicated GuardAI staging integration proof.
- **GitHub Actions no-runner / zero-step failures mean BLOCKED_INFRA**, not code green/red. Keep executable PRs unmerged until reproducibly validated. Prefer safe local work or docs-only work meanwhile.
- Update `CURRENT_STATE.md` (truth) and `docs/V1_EXECUTION_BOARD.md` (status/evidence) in the corresponding feature PR. Do not mark stages DONE without full exit-gate evidence.
- After a completed PR, move to the next ticket. Preserve any remaining blockers with specific required user input rather than silently switching scope.

## GuardAI invariants

- Real auth/role enforcement on the server and tenant-scoped data. No trust in browser-supplied Organization roles, Provider account IDs or stale scope.
- SSRF-safe, verified owner targets; bounded workers/egress/CPU/time and provider permissions.
- Scan completed ≠ secure; domain verified ≠ secure; unknown/no data/error ≠ pass.
- Only matched detector + target/fingerprint coverage can establish verified resolved. User-marked fixed ≠ scanner verified.
- Rule/Detector/Evidence/Score/Legal source versions and immutable Report/Trust snapshots stay traceable.
- No synthetic scores, test customers, API successes, “compliance” claims, Stripe access, legal AI classifications, or fake navigation.
- Dedicated GuardAI Supabase project. User has said one exists, **but the exact project reference is not yet identified in connected Supabase data**; never guess or mutate other databases.
- SQL files under `database/*_draft.sql` are **drafts**, not applied migrations. No bulk SQL execution without reviewed dependencies/backup/staging proof.
- Sensitive secrets never go to git, stdout, UI client state when avoidable, documentation, or chat.
- Historical PRs #22/#23/#34/#41/#45 are closed as superseded by integrated draft #46. Review current #46 HEAD and handoffs, not obsolete PR statuses.

## Visual engineering rules

Reuse the existing React19/TypeScript/Vite8 + Tailwind4 + Base UI/shadcn design system. Stay within restrained GuardAI slate/indigo palette, real status colors and Geist type. A feature isn't UX-done without mobile, keyboard/focus, auth/role, error/unknown/loading/empty, 429 and copy/provenance review.

## When to ask the user

Only for a **specific external blocker or product decision**: GuardAI Supabase project ref, GitHub Actions Runner/Billing settings, production/staging domain/hosting, actual price+usage entitlements, Stripe/GitHub provider setup, privacy/legal/business information. Never request passwords, service-role keys, private connection strings or personal secrets in chat.

## No false completion

Use distinct status labels: `NOT_STARTED / IN_PROGRESS / CODE_DONE / STAGING_VERIFIED / DONE / BLOCKED_EXTERNAL / BLOCKED_TECH`. Prefer a candid partial result to claiming production completeness. Deliver GitHub PR/commit links and next ticket/remaining verified blockers in each update.
