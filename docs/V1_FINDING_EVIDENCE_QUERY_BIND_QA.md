# GuardAI P0-06/P0-08 – Finding + Evidence SQL list pagination bind fix

**Date:** 2026-10-11 · **Status:** SOURCE PATCHED, PROBE VERIFIED, FULL CI / LIVE DB UNVERIFIED.

## Confirmed source defect

Two real read repositories constructed their paginated list SQL by adding the page-size bind value to the PostgreSQL `params` array, but then used a JavaScript interpolation of the **parameter index** in the SQL `LIMIT` clause:

- `server/repositories/findingRepository.js:listFindings` previously generated `LIMIT 2` for no filters (instead of `LIMIT $2`), yet supplied two bind values `[organizationId, pageSize + 1]`.
- `server/repositories/evidenceRepository.js:listEvidence` had the same defect. With several filters it produced e.g. `LIMIT 8` while supplying eight parameters; PostgreSQL then receives one extra bind argument that has no placeholder. Even without PostgreSQL protocol rejection, the encoded numeric value would have limited results to the **argument position** instead of the requested page size.

This is a **correctness / availability** defect affecting normal Finding/Evidence list requests and pagination. It is not evidence of a cross-tenant disclosure: all examined list SQL still includes the requested `organization_id = $1` filter. The actual selected Organization is independently authorized by the service.

## Fix

Both lists now interpolate the placeholder itself as `LIMIT $${limitIndex}` (in the JS template literal; produces `LIMIT $2`, `LIMIT $8`, etc.), not its numeric position. The already validated page-size bind value `pageSize + 1` remains in `params`. Cursor (time, UUID) and other filters remain bound, and the next-page semantics are unchanged.

No schema change, migration, RLS change, data access, provider/secret change or production query was executed.

## Executable regression suite

`server/test/findingEvidenceQueryBinding.test.js` adds seven `node:test` cases:

1. Finding list no filters uses two binds (`$1` tenant, `$2` page-size+1).
2. Finding status/Target/time+UUID cursor filters retain contiguous bind indexes.
3. Finding page truncates `pageSize+1` rows and returns a timestamp/ID cursor.
4. Evidence list uses the correctly bound default page-size.
5. Evidence Target/Scan/Detector/Type/time+UUID cursor indexes and tenant bind are preserved.
6. Evidence page truncates correctly and retains scan collection health.
7. Invalid page-size input fails before any database query.

The instrumented fake pool verifies **every referenced `$N` placeholder has a matching parameter**, plus `LIMIT $N` is the final parameter and Org ID stays scoped as `$1`. Prior source would fail these assertions.

**Executed lightweight source-level probe:** The exact updated Finding/Evidence repository modules were loaded in an isolated JavaScript runtime with mocked `pg` and repository dependencies. Four combinations (unfiltered and multiply filtered + cursor for both lists) **passed placeholder/arity and Organization filter assertions**. Test file syntax parsed successfully. This is not Node24/npm11 `node:test`, a live PostgreSQL statement execution or a full backend build.

## Required project QA on exact PR HEAD SHA

```sh
# Node 24, npm 11 (repo contract)
cd server
npm ci
npm run check
node --test test/findingEvidenceQueryBinding.test.js test/findingRepositoryProjection.test.js test/evidenceRepository.test.js
npm test

# Required full frontend gate (separately)
cd ..
npm ci
npm run lint
npm run typecheck
npm run build
```

Use a **dedicated, identified GuardAI-only staging Postgres** with applied reviewed migrations for real bound query execution; test authorized Org A and Org B, scopes/filters, empty vs server errors, cursor renewal after a status change, limit=1/50/100, unauthorized Org IDs, and long lists. Confirm HTTP 401/403/429/500 semantics and frontend PR #34’s in-flight scope behavior. This test does not prove database RLS.

**Blocking requirements:** GitHub Actions issue #28 (current jobs fail before any step); GuardAI Supabase project ref P0-05 not yet verified. Do not merge on a mock-only probe. This source patch is independent of source files in draft #34 (same doc status files require reconciliation if both PRs merge later).
