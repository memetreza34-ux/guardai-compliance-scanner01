# P0-06 – Persistent Security Worker lease heartbeat

**Date:** 2026-10-11 · **State:** source implemented in a draft PR; **9/9 isolated JS callback probes passed**, but official Node24 CI, PostgreSQL and two-worker staging **NOT VERIFIED**.

## Confirmed code-level gap

`server/workers/securityWorker.js:processOneSecurityJob` originally claimed a timed database lease and executed the externally fetched Security assessment with **no lease renewal** until `completeJob`. Network DNS, redirect chains, slow TLS/HTTP or process pauses can take longer than the configured lease. A second worker could reclaim the expired running job. Although repository writes enforce the active lease transactionally, the original worker would still attempt completion and then attempt to record failure after a lost-ownership error. The Repository worker already had an abortable heartbeat that renews leases while processing.

**This is an ownership/reliability issue, not proof of an actual cross-tenant disclosure.** The DB enforces worker ID + active expiry on completion and failure, but a Security Worker should not attempt any result/failure write once heartbeat renewal indicates lost ownership.

## Source change

- New `server/workers/leaseHeartbeat.js` shares the **existing Repository-worker implementation** (abortable periodic `jobRepository.renewLease`, approximately every one-third lease duration bounded to 5–30 seconds). Optional `sleep` injection is solely for deterministic testing; production uses `node:timers/promises.setTimeout`.
- `server/workers/repositoryWorker.js` imports and re-exports the shared heartbeat under the previous API. Its processing flow and existing renewal semantics are unchanged.
- `server/workers/securityWorker.js` starts the same heartbeat immediately after claiming a Security job. On successful assessment, it **stops and awaits any in-flight renewal** before `completeJob`. On a normal execution error with a healthy heartbeat, it stops renewal and calls `jobFailureService.fail` as before. If heartbeat renewal fails at any point, it throws the heartbeat error and **does not call either completion or failure write**; the DB lease can expire and another worker or terminal-expired-job recovery can handle it.
- The existing `executeSecurityJob` fetch/assessment and its SSRF/target type checks remain unchanged. An optional `executeAssessment` and `startHeartbeat` parameter permit deterministic process testing; the production process passes neither override.

### Limits

A heartbeat cannot guarantee lease survival during a frozen event loop, prolonged database outage or process crash. The DB still controls valid lease ownership. Stopping renewal before commit leaves a short commit window whose safety depends on the existing `assertActiveLease` transactional check. A live delayed fetch may continue after ownership loss; the PR guarantees only that the worker avoids **database result/failure writes after it detects the heartbeat error**. Recovery for exhausted crashed leases is a **separate unmerged draft PR #38**.

## Executable regression coverage

`server/test/securityWorkerLeaseHeartbeat.test.js` adds **9 `node:test` cases**:

1. Idle poll does not launch a heartbeat or write anything.
2. Successful Security job stops heartbeat **before** completion.
3. Normal scanner failure records a retryable failure after stopping heartbeat.
4. Context-load failure still stops heartbeat before failure handling.
5. Lost lease after successful assessment suppresses both completion and failure writes.
6. Lost lease takes priority over an assessment exception and suppresses all writes.
7. Shared heartbeat renews and aborts future timers on `stop`.
8. Shared heartbeat surfaces `renewLease` failure.
9. `stop` awaits an in-flight renewal rather than racing it.

**Executed:** the actual nine test callbacks and actual changed source were loaded in an isolated JavaScript V8 harness with controlled fake `require`, `AbortController`, timers, network/DB and assertion functions: **9/9 passed**. No real Node24 test runner or npm dependency graph, PostgreSQL, long HTTP fetch, concurrent worker service or staging database participated. These tests are source-level probes, not CI evidence.

## Required verification on the exact PR SHA

```sh
# Node24/npm11 repository contract
cd server
npm ci
npm run check
node --test test/securityWorkerLeaseHeartbeat.test.js test/repositoryWorker.test.js test/jobRepository.test.js
npm test

# Plus root client gate
cd ..
npm ci
npm run lint
npm run typecheck
npm run build
```

Then in **dedicated confirmed GuardAI staging**, use two workers and an owned test domain: delayed HTTP response greater than one lease period, verified actual renewals, completion exactly once, forced `renewLease` 409/DB outage, worker kill/restart, expiry and reclaim, successful retry vs failure, no cross-Organization writes, `scan_jobs` + `scans` RLS and join conditions, and report/evidence state that never claims "completed" after a lost lease.

GitHub Actions remains blocked by runner **zero-step failures** (P0-01 issue #28). Do not merge this PR, #38, or independent drafts #34–#37 without real SHA-matched CI checks and staging proof. No schema, production provider, secrets or live data changed.
