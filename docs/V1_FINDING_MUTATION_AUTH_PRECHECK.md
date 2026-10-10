# P0-06 — Finding status mutation authorization-before-read

**As of 2026-10-10: CODE UNVERIFIED / DRAFT ONLY.** This patch does not establish database RLS, tenant isolation at Postgres level or release readiness.

## Problem and security boundary

`server/services/findingService.js:updateStatus` previously called
`findingRepository.getFinding(organizationId, findingId)` **before** any organization membership or role check. It then inspected `current.status` and performed status-dependent validation before authorizing the mutation. Even though repository lookups are organization-scoped, this order created an unnecessary data access and a potential difference in error behavior/timing for untrusted callers.

The separate `createFindingLifecycleService` already performs an authorization preflight; this patch protects the service actually used by the Finding status route.

## Implementation

1. Check `requireRole(organizationId, userId, 'member')` **before lookup** for normal status changes.
2. For requests setting `status: 'accepted_risk'`, require `admin` **before lookup** regardless of whether the stored Finding is already in that status.
3. Only after preflight authorization may the service read the Finding and validate its lifecycle transition. With authorized access, missing Findings return a 404.
4. Enforce any stricter role derived from **stored current status**, especially when leaving `accepted_risk`, **before** persistence.
5. Preserve `expectedCurrentStatus`, `actorId`, and the repository's optimistic-concurrency/audit ownership. This is defense in depth; it does not replace Postgres tenant filtering or RLS.

## Executable regression file

`server/test/findingMutationAuthorization.test.js` adds **8 `node:test` cases** using real service/domain authorization functions and controlled in-memory repositories:

- Foreign owner cannot read a known or missing Finding via a mutation (no Finding repository calls).
- Malformed status and accepted-risk attempts from a foreign organization fail permission preflight before status-dependent validation.
- Viewer can neither update nor accept risk, with no Finding lookup.
- Member may mark fixed but cannot accept risk.
- Leaving accepted-risk state still requires Admin, even for an authorized Member.
- Admin may accept risk with a meaningful reason; short reason is rejected without writes.
- Authorized missing Finding returns 404 **after** membership check.
- A revoked Member is denied before another lookup/write.

Run on **this PR HEAD SHA** using Node 24 / npm 11:

```sh
cd server
npm ci
npm run check
node --test test/findingMutationAuthorization.test.js test/findingService.test.js test/findingLifecycleService.test.js
npm test
```

Expected policy for negative cases: 403 without unauthorized repository reads; 404 only for an authorized caller; no status-transition write without the requested stored-state authorization. No user-specific records or secrets in test data.

## Separate live gates

Still required on an explicitly identified **GuardAI-only** staging database: two real accounts, two organizations, API/JWT validation, RLS/GRANT policies, cross-org Finding GET/list/PATCH/re-test, unauthorized member/viewer/expired token, last-owner/invite replay, auditable concurrent transitions and full private data access review. The in-memory tests cannot prove any of those external controls.

Current GitHub Actions failures execute **zero job steps**, so no test from this PR may be called passing until an actual SHA-matched run is available. Track infra issue #28 and combined route PR #34; neither is merged. Keep this P0-06 security fix independent from the P0-08 route integration to reduce conflicts.
