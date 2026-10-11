# P0-06 — Recover terminally exhausted expired worker leases

**Date:** 2026-10-11. **Status:** source patch and six isolated JS tests PASS; standard Node24, PostgreSQL and staging verification **NOT RUN**. This is not production readiness.

## Reproducible code-level failure mechanism

The original `claimNextJob` SQL selected only `j.attempt_count < j.max_attempts` for both queued jobs and expired running jobs. A worker that dies during its **last leased attempt** has `attempt_count >= max_attempts`, `status='running'` and a subsequently expired lease. The claim path will never pick that job again, and a crashed worker cannot call `failJob`. The parent Scan remains `running` without any terminal recovery from this path. This is an availability/accuracy defect: clients could see a permanently in-progress assessment, not a completed/failed result.

## Narrow source change

`server/repositories/jobRepository.js` now performs a bounded recovery check at the start of an authorized worker's normal `claimNextJob` poll, in its transaction:

- Only **one** candidate in the worker's allowlisted `jobTypes`, with `status='running'`, **expired lease**, `attempt_count >= max_attempts` and parent Scan `queued/running` is selected.
- Select uses `FOR UPDATE OF j, s SKIP LOCKED` to avoid reaping a job/scan currently held by another transaction; final status operations occur under the acquired locks.
- On recovery the exhausted job becomes `failed` with `JOB_LEASE_EXHAUSTED`, bounded generic error text, `retryable:false` and previous attempt counters. Its lease is cleared.
- Other queued/running jobs **in the same Organization and Scan** become `cancelled`, and the parent Scan is marked `failed` with `overall_score=null` and explicit module coverage `error`. No `completed`/PASS state is inferred from lost work.
- All updates are scoped with `organization_id`, including subordinate job cancellation and the parent Scan update. The operation is atomic and rolls back on errors.
- The worker returns idle after one repair; its next tick can claim other jobs in a fresh transaction. Normal successful claims, retrying jobs with attempts remaining, and never-claimed jobs follow the existing route.

**Limits:** The cleanup is triggered by an active worker polling the **same job type**. It is not an independent scheduler: a job type without any running workers is not recovered automatically. All lock-order/concurrency correctness, 2-tenant isolation, and real worker crash/restart behavior require a dedicated GuardAI staging database. This PR does not implement general worker heartbeats or change worker timing.

## Executable tests

New `server/test/exhaustedWorkerLeaseRecovery.test.js` includes six `node:test` cases for:

1. terminalizing a last-attempt orphan, cancelling same-scan jobs, scoped updates and error/coverage values;
2. expired/eligible/skip-locked bounded SQL query and allowlisted job-type arguments;
3. no abandoned jobs and empty queue do no mutations;
4. ordinary queued claim still leases a job unchanged;
5. transactional rollback and client release if parent Scan update fails;
6. invalid worker ID/lease input fails before database acquisition.

**Executed limited verification:** All six new test callbacks executed and passed against the exact updated repository JS source inside an isolated V8 harness with mocked CommonJS dependencies and transactional `pg` calls. This is **not** `node --test`, full server `npm test`, PostgreSQL lock/row-security testing or runtime concurrency proof.

## Exact-SHA validation and staging exit gates

```sh
# Node 24 / npm 11 repository contract
cd server
npm ci
npm run check
node --test test/exhaustedWorkerLeaseRecovery.test.js test/jobRepository.test.js test/jobLifecycle.test.js
npm test

# root frontend
cd ..
npm ci
npm run lint
npm run typecheck
npm run build
```

GuardAI-only staging scenarios (not executed):

- A previously healthy verified Target → Security Scan → running job → crash at attempt `max_attempts` → clock advances past lease → worker restart of same type. Scan and job must become failed, never completed/healthy; API status and UI coverage show failure.
- Crash at attempt `max_attempts-1`: lease can be reclaimed and attempts increase normally, not terminalized early.
- Worker that is still executing but lost lease to another worker; competing completion, reclaim, recovery: no double-commit and correct lock outcomes.
- Concurrent worker types/jobs sharing a Scan; `SKIP LOCKED` cannot erase committed results or deadlock while cancelling other jobs. Measure lock waits and request retry behavior.
- Two Organizations with separate Scans; recovery of Org A leaves Org B untouched at database and API levels, including RLS policy enforcement.
- Scan already failed/completed: no reaper change. Failed update must roll back all status/coverage mutations.
- Confirm indexes/query plan for expired exhausted scan jobs and worker-poll performance at scale.

**CI infrastructure:** GitHub Actions P0-01 still fails both jobs with **zero steps**. Latest earlier run logs could not be retrieved: GitHub job log API returned 404 / `BlobNotFound`; exact account-side root cause is not established. Issue [#28](https://github.com/memetreza34-ux/guardai-compliance-scanner01/issues/28) tracks owner-side runner/billing/settings diagnosis. **P0-05** exact GuardAI-only Supabase staging project ref remains unknown. No database/SQL migrations, secrets, deployments or production changes were made.
