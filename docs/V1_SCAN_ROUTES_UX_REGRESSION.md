# GuardAI P0-08 – scan history and detail tenant-state regression

**Source-patch status:** 2026-10-10, CODE UNVERIFIED. This plan is not CI, browser, staging or product-release evidence.

## Bounded implementation

- `src/pages/app/ScansPage.tsx` scopes successful scan-history records to `authenticated user ID + selected Organization ID`. The currently visible list cannot silently show the previous organization's scans during a new request.
- Scan-history first-page failures show a proper unavailable/retry state, instead of a fabricated empty scan history. Missing or unauthorized workspace access has a distinct message. The UI still shows only the 50 items the endpoint returns.
- `src/pages/app/ScanDetailPage.tsx` scopes the scan, worker jobs, evidence, findings, report action and detail display to `authenticated user ID + Organization ID + requested Scan ID`. On failed initial reads it offers Retry.
- Polling failures continue to display a clear stale-data warning for a previously loaded **same-scope** scan. A failed/cancelled/completed status must not claim full site security.
- Report-generation responses and errors from a previous auth/workspace/scan context are ignored; only the active scope can navigate to the newly created report. Backend RBAC, immutable snapshot creation and RLS remain authoritative.

## Required scenarios before merge

| Scenario | Expected UX and provenance |
| --- | --- |
| User A / Org A history request remains pending; switch to Org B | No A history, target names or scan IDs are visible in B |
| Logout User A, login User B while history is pending | No A records, no A error in B |
| List endpoint 401, 403, 429, 500, network failure | Explicit unavailable/retry state; never “No persistent scans yet” |
| Valid Org with zero scans | Genuine empty message and next step to a verified target |
| History returns 50 items | Text discloses bounded list, never fabricates a total |
| Scan A detail fetch remains pending; navigate to Scan B or switch Org | A's detail, worker jobs, hashes, findings and report button never show under B |
| Scan poll encounters 429 / network timeout after success | Last same-scope data remains with stale warning; no misleading fresh success |
| Initial Scan detail fetch returns 403/404/500 | “Scan unavailable” with Retry, not old tenant details |
| Report creation request is pending; change Org, scan or user | Old response does not redirect current session; server-side report permission enforced |
| Viewer tries to create report | No create CTA; backend independently rejects unauthorized requests |
| 320/390/768/1024/1440px mobile/desktop | Actions and long Scan IDs/Hashes usable with keyboard and screen readers |
| Scan completed, failed, cancelled, queued, running | Correct execution statuses; never inferred security score or legal compliance |

**Required gates:** root `npm ci && npm run lint && npm run typecheck && npm run build` plus `cd server && npm ci && npm run check && npm test` on the **exact PR HEAD SHA**, actual two-user/two-org staging/browser tests (including request latency), mobile keyboard/accessibility checks and backend authorization review. GitHub Actions failing before any job step = `BLOCKED_INFRA`, not passing QA. No production merge.

**Related open changes:** #22 first-run shell, #23 dashboard, #30 Evidence route, #31 Findings route. This patch intentionally does not edit any of those pages. CI runner tracking: issue #28.
