# GuardAI P0-06 – DNS verification authorization & transaction lock order

**Date:** 2026-10-11 · **State:** CODE IMPLEMENTED IN DRAFT, **ISOLATED TEST HARNESS PASSED**, full CI/Postgres/staging **NOT VERIFIED**.

## Audited source defects

1. `targetVerificationService.checkDnsChallenge` previously checked that a Target existed, but unlike `startDnsChallenge` it did **not** verify `type === 'website'`. For a nonwebsite Target with a stored `verified` state, the endpoint could return `{ verified: true, alreadyVerified: true }`, falsely representing DNS website ownership. Pending nonwebsite Targets could also proceed into challenge lookup.
2. `checkDnsChallenge` required Admin **only before** an external asynchronous TXT resolver. A user's role could be revoked while the resolver was pending, yet `recordAttempt` could still persist the result using the earlier authorization.
3. `targetVerificationRepository.createDnsChallenge` locked the Target row but did not revalidate its `type` inside that transaction, leaving only a pre-transaction service-level type check.
4. Lock order was inconsistent: `createDnsChallenge` locked Target first and then updated Challenges, while `recordAttempt` locked Challenge first before updating Target. Concurrent requests could create a PostgreSQL lock-order inversion. The record attempt also lacked a Target-type check at this authoritative update boundary.

## Applied source changes

- `server/services/targetVerificationService.js`: after membership preflight, check `target.type === 'website'` before the already-verified shortcut or DNS lookups. Reauthorize Admin after DNS resolution and before `recordAttempt`; revoked Admin aborts without persisting a verification result. This does not claim to make an entire network call atomic with authorization.
- `server/repositories/targetVerificationRepository.js`: `createDnsChallenge` verifies `website` on the **locked Target row** before expiration or creation writes. `recordAttempt` locks the tenant-scoped Target row **before** the Challenge, matching the creation lock order; rejects unknown or nonwebsite Targets before reading/updating a Challenge. Existing TTL, attempt, hash match, challenge status and transaction rollback semantics remain intact.

No existing SQL draft, migration, production database, live DNS target, provider, credentials, access token or user data was changed.

## Targeted executable regression suite

`server/test/dnsVerificationAuthorizationRace.test.js` includes **10 node:test scenarios**:

1. Asset/Repository, pending/verified: DNS check rejects before challenge fetch, resolver or write.
2. Already-verified Website: returns ownership-only status without DNS secret or lookup.
3. Admin downgrade while DNS resolver is pending: no successful attempt write.
4. Successful DNS: Admin checked both before and after resolution, plaintext DNS value not reissued.
5. DNS timeout/unavailable: 502, no persistence.
6. Challenge creation rejects nonwebsite Target under lock, rolls back, never writes.
7. Missing Target in organization: transaction rolls back without creating Challenge.
8. Record attempt first locks Target then Challenge; asserts tenant parameters and commits unchanged terminal challenge.
9. Record attempt rejects nonwebsite Target under lock before reading/writing the Challenge.
10. Record attempt rejects target absent in requested organization before reading/writing the Challenge.

**Executed evidence:** All **10 actual new test callbacks passed** in an isolated V8 runner using the exact branch source, a mocked `node:test`, `node:assert`, fake SHA computation, controlled DNS resolution and fake PostgreSQL transaction APIs. The fake SHA is only for testing control flow; it does **not** test cryptographic correctness. This is NOT a normal Node24 test run, a real PostgreSQL lock-order/deadlock test, or a security penetration test.

### Required exact-PR-SHA validation

```sh
# Node 24 / npm 11 required by repository
cd server
npm ci
npm run check
node --test test/dnsVerificationAuthorizationRace.test.js test/targetVerificationService.test.js
npm test

# repository-wide frontend gate separately
cd ..
npm ci
npm run lint
npm run typecheck
npm run build
```

### Required dedicated GuardAI staging verification (NOT executed)

- Auth + role preflight for foreign Organization, Viewer, Member, Owner/Admin, revoked Admin **during** delayed DNS lookup.
- Real persisted Website Target vs Repository/Asset Target, including targets with stale `verified` state.
- Concurrent `startDnsChallenge` and `checkDnsChallenge` on one Organization/Target; confirm no lock-order deadlock, no stale challenge can become current, correct transaction rollback after invalid/missing Target.
- Wrong, expired, repeated or consumed tokens; hash-only persistence; successful TXT check never returns plaintext; bounded attempts, HTTP 429, TTL, DNS NXDOMAIN/timeout.
- SQL tenant scoping/RLS and DNS records independently tested in GuardAI-only project, not in another project. Verify post-revocation authorization behavior at HTTP and database boundaries.

**External gates:** GitHub Actions runner issue #28 has repeatedly produced **zero-step frontend/backend failures**; P0-05 GuardAI staging project reference still must be identified. No merge/release while these checks are outstanding.

**PR interactions:** independent server source from [#34 UI integration](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/34), [#35 Finding auth preflight](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/35), and [#36 Finding/Evidence binding](https://github.com/memetreza34-ux/guardai-compliance-scanner01/pull/36). Shared `CURRENT_STATE.md` and execution-board documents will require review when integrating.
