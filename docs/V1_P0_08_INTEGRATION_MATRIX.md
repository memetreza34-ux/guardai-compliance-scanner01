# GuardAI P0-08 – Cross-PR core route integration contract

**Date:** 2026-10-10. **Status:** source-integrated, **CODE UNVERIFIED**. This is not staging verification, end-to-end proof or release approval.

## What was integrated

This branch is the single combined review candidate containing the independent source changes from draft PRs #30–#33 without touching `main`.

| Original draft | Imported route code | Imported test material |
| --- | --- | --- |
| [#30](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/30) | `src/pages/app/EvidencePage.tsx` | `docs/V1_CORE_ROUTE_UX_AUDIT.md` (manual matrix only) |
| [#31](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/31) | `src/pages/app/FindingsPage.tsx` | `docs/V1_FINDINGS_TENANT_UX_REGRESSION.md` (manual matrix only) |
| [#32](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/32) | `ScansPage.tsx`, `ScanDetailPage.tsx`, `src/lib/scanViewScope.ts` | Six `node:test` UI scope checks + `docs/V1_SCAN_ROUTES_UX_REGRESSION.md` |
| [#33](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/33) | `TargetsPage.tsx`, `TargetDetailPage.tsx`, `src/lib/targetViewScope.ts` | Eight `node:test` UI scope checks + `docs/V1_TARGET_ROUTES_UX_REGRESSION.md` |

The initial source merge used the #33 tree as its base and brought in only the **distinct files** from #30, #31 and #32. No route code file overlapped. `package.json` and `.github/workflows/ci.yml` both independently introduced the **same** `test:ui-state` script / CI step in #32 and #33; the integration intentionally retains **one copy** from #33. `CURRENT_STATE.md` and `docs/V1_EXECUTION_BOARD.md` are merged as a truth/status reconciliation below, rather than using the last branch's version silently. The four original draft PRs remain independently reviewable and must not be merged **in addition** to this integrated version without a conflict/rebase review.

## Added executable backend service-level negative tests

- `server/test/coreJourneyTenantIsolation.test.js`: 6 `node:test` scenarios for two Organizations: cross-tenant target/DNS/scan denial, viewer vs member vs admin, unauthorized/unverified target cannot queue jobs in a controlled persistence fake, DNS TXT hash proof, role downgrade reauthorization, unsupported modules.
- `server/test/coreJourneyAssuranceIsolation.test.js`: 7 `node:test` scenarios for cross-tenant Findings access and status changes, viewer denial, manual-resolved not equivalent to verified, re-test scope/job payload, accepted-risk re-test rejection, foreign/incomplete Scan Report creation and denied Report reads.

These 13 tests instantiate **real authorization/domain/service functions** and use in-memory controlled repositories. They do **not** use a live HTTP server, Supabase RLS, the production Postgres schema, a real DNS lookup, a real worker, a real finding-retest verification pass or a persisted immutable Report. Their existence is *test code*, not evidence of a passing execution.

The combined check inventory is **14 UI pure-function test cases** (6 Scan + 8 Target) and **13 new server service integration scenarios** (6 target/scan + 7 finding/report). Existing repository server tests still run unchanged.

## Mandatory executable checks on the exact integrated head SHA

```sh
node --version # repository requires 24.18.1+
npm ci
npm run lint
npm run typecheck
npm run test:ui-state
npm run build
cd server
npm ci
npm run check
node --test test/coreJourneyTenantIsolation.test.js test/coreJourneyAssuranceIsolation.test.js
npm test
```

`npm run test:ui-state` executes all `tests/*.test.mjs` using Node 24 TypeScript source type-stripping. Backend `npm test` discovers `server/test/*.test.js`. In GitHub Actions the `frontend` and `backend` jobs currently fail **before the first step** (issue #28). A result with zero steps cannot be treated as any passed/failed code check.

## Dedicated GuardAI staging test journey – still NOT executed

Use two confirmed test identities **A/B**, separate Organizations **Org A/Org B**, distinct verified domains controlled by those test identities, and only the known GuardAI Supabase staging project ref.

1. Signup / Email confirm / Login / Create Org A (also Org B for B); check membership refresh and switching.
2. Create Website Target. Probe unauthorized reads/creates with foreign Organization IDs and Target IDs; expect 403/404, no rows, no silent success, no PII in logs.
3. Publish one-time DNS TXT for owned test domain; wrong/expired token must **not** verify. Check Owner/Admin vs Member/Viewer roles; confirmed ownership must never be rendered as security certification.
4. Submit only the enabled persistent `security` Scan. Check ownership, server-side Member+ policy, idempotency replay, queue/workers, fail/retry, result Contract/Provenance and no fake ETA.
5. Read Scans and Scan Detail jobs/evidence/findings. Induce 401/403/429/500, 3s polling delays and org/identity changes. Old responses must not display in the new context; same-scope stale data must be explicitly labelled.
6. Read the independent Evidence and Findings routes. Distinguish API outage vs real empty page, loaded-only counts, per-Detector coverage and Evidence hash/time; test pagination after switching Org/filters.
7. Mark a Finding fixed **unverified** then request scanner re-test. Assert only a matching Target/Detector/fingerprint coverage can change to verified resolved, including negative/no-coverage re-tests.
8. Create an immutable Report only from a completed scan with full required source/version/hash provenance; unauthorized user/viewer and foreign Scan must not produce or read reports. Test tamper detection and return from report route.
9. Switch between A/B during pending fetch, status mutation, DNS token clipboard operation, Scan submission, re-test and Report creation. Check no cross-tenant display, navigation, mutation feedback or stale cursors.
10. Test 320, 390, 768, 1024, 1440px, Chromium/Firefox/Safari, keyboard/ARIA, 429 Retry UX, full error/empty/permission states and bad/expired tokens. Retain timestamped, privacy-safe screenshots/traces.

**Release rule:** No PR merge or product release until CI on the exact head runs real steps and passes, staging/database RLS and negative cases pass, and the maintainer reviews the combined sources and any remaining live PR overlap. The P0-05 GuardAI-specific Supabase project ref is not yet verified. Never use another project's database.
