# P0-08 – Findings tenant, pagination and mutation regression cases

**Status 2026-10-10:** source patch awaiting execution. Not CI, browser, staging or production evidence.

## Change boundary

The routed `src/pages/app/FindingsPage.tsx` displays persistent Findings provided by the authenticated organization APIs. This patch changes only the browser projection and asynchronous state handling, not backend RBAC or SQL/RLS. `CURRENT_STATE.md` is authoritative for implementation truth.

- First-page Findings are independent of the optional Target display-name API. A failed Target lookup falls back to Target IDs and shows a warning.
- Loaded Findings, severity counts and the pagination cursor have one `userId:orgId:filter` scope; stale counts/results are hidden on a changed scope.
- In-flight pagination and actions are invalidated on auth/session, Organization, filter or retry changes. Results from a previous context cannot change the current UI or navigate to an unrelated Scan.
- An initial API failure shows an explicit error and Retry rather than zero findings/zero counts. A subsequent pagination error retains previously loaded rows with an error banner and retry.
- The severity counts are visibly documented as counts **among loaded Findings**, not a global count of vulnerabilities.
- Marked fixed (unverified) remains distinct from a scanner-verified resolution.

## Mandatory manual browser and staging matrix

| Scenario | Expected result | Evidence needed |
| --- | --- | --- |
| Two users in separate Orgs; switch while first Find API request is pending | No flash of old rows/severity counts/target names; no cross-tenant cursor | Screenshots + browser/API trace |
| Same user, switch Organization during Load more, return delayed result | Old response cannot append rows or replace cursor | Controlled latency + trace |
| Same Organization, change status filter during Load more | Response for old filter cannot append; selected filter/ARIA state correct | Browser test with delayed response |
| Session/token changes during Load more or retest | Stale responses cannot mutate rendered list or redirect to Scan; new authorization applies | Auth refresh / logout/login trace |
| First Findings API call fails 401/403/429/timeout/500 | Explicit unavailable error + Retry; never a zero-risk/empty-list claim | Negative API test |
| Target list fails while Findings API succeeds | Findings remain available, with target IDs and a source-warning | Independent API failure test |
| Mark fixed while switching workspace | Old result does not show success or update the new workspace; actual server-side mutation still follows scoped permission checks | Two-Org test |
| Retest while switching workspace | Old result never navigates new user to old-org Scan; backend idempotency remains server authority | Two-Org test |
| Pagination fails after first page | Visible rows remain, error shown, Retry fetches authoritative first page | API failure test |
| 50+ findings | Loaded-only severity counts; Load more updates count only for loaded items | Dataset fixture |
| Mobile 320/390/768px, keyboard and screen reader | Severity/list/filters/retry/retest usable, ARIA-pressed filter, readable error messaging | Chromium, Firefox, Safari smoke |

## Required quality gates

1. Validate exact **PR HEAD SHA** with `npm ci && npm run lint && npm run typecheck && npm run build` at repo root, and `cd server && npm ci && npm run check && npm test`.
2. CI jobs with zero executed steps are **BLOCKED_INFRA** and do not count as passed source validation.
3. Execute the above cases in a dedicated GuardAI staging environment with real two-tenant users and restricted member/viewer roles. Test 403/404 and no data leakage.
4. Review code consistency against separate open PR #22 (global first-run AppShell), #23 (Dashboard), and #30 (Evidence tenant/error UI); avoid duplicate routes or concurrent changes on the same page.
5. No merge or release until checks execute and the maintainer reviews real outcomes.

**Never infer:** no Findings in a loaded page means zero vulnerabilities; resolved by user means verified resolved; completed scan means secure or compliant.
