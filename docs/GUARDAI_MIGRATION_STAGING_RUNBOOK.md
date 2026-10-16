# GuardAI – SQL migration / staging promotion runbook

**Status:** DRAFT / BLOCKED ON DEDICATED STAGING IDENTITY AND RUNTIME VALIDATION  
**As of:** 2026-10-09  
**Scope:** 33 read-only design files in `database/001_*_draft.sql` through `database/033_*_draft.sql`. **These files are not executable release migrations.**

This runbook is for a staged, auditable conversion of the existing GuardAI database design sources. **Do not run the full draft folder as a SQL batch on any connected Supabase project.**

## Step 0 – external gates

- [ ] The operator supplies the **exact GuardAI-only Supabase project ref** and checks it against the connected Supabase project list. Project names alone are insufficient. Do not touch KlarKI or any general multi-app project.
- [ ] Separate staging and production identities, database backups and an actual restore test are available.
- [ ] Auth Site URL, callback allowlist, SMTP and API/Worker DB roles are documented and private.
- [ ] GitHub Actions actually executes frontend and backend jobs. Jobs with zero steps do not count.
- [ ] The release reviewer understands which modules will remain gated after initial core schema.

## Step 1 – generate a read-only source report

From the repository root:

```sh
node server/scripts/checkDatabaseDrafts.js
node server/scripts/inventoryDatabaseDrafts.js
node server/scripts/inventoryDatabaseDrafts.js --json
cd server && node --test test/inventoryDatabaseDrafts.test.js
```

`--check` exits nonzero on heuristic inventory flags; do **not** use it as a claim of full SQL correctness. The scanner does not understand all PL/pgSQL, strings, dynamic SQL or PostgreSQL migrations. Flagged definitions, grants, trigger dependencies, RLS, indexes and seed statements require human review.

The inventory hashes each source file with SHA-256 so a reviewed draft cannot silently change after approval. A source hash is not a migration execution record.

## Step 2 – structural dependency review

Read the report in file order. Each phase below requires the previous phase in a **new, empty, GuardAI-owned staging database**:

| Phase | Sources | Runtime concern |
|---|---|---|
| Tenant/queue foundation | 001–005 | Auth users, organizations, tenant composite FKs, verified website challenges |
| Entitlements/audit/rules/findings | 006–012 | RLS grants, subscription counters, scanner status audit, lifecycle and versioned rule/scoring tables |
| Reports/billing/public contact | 013–018 | Snapshots, Trust projection, billing webhook and checkout deduplication, lead retention |
| Monitoring/GitHub/usage | 019–025 | Scheduler and notification triggers, provider ownership, idempotent usage finalization |
| AI governance/assets/provenance | 026–031 | Legal source snapshots, Human Review, asset quarantine, immutable rule/scoring hashes |
| Risk and Team | 032–033 | tenant composite risk relations, invitation expiry/replay and RBAC |

**Critical manual conflicts:**
- Source drafts `008_*`, `011_*` and `025_*` contain **historical hand-maintained Rule / Scoring DML**. **Do not promote those INSERTs as canonical seeds.** Use the current `shared/rules/*.json` and `shared/scoring/*.json` generator scripts, and include generated definition-hash provenance only after schema compatibility is reviewed.
- Migration order must be checked **statement by statement**, not just file name: newly referenced composite unique keys must exist *before* the relevant FKs are added.
- PostgreSQL enum alterations, partially completed migrations, trigger side effects and `CREATE OR REPLACE FUNCTION` redefinitions can be unsafe on reruns.
- The `team_invitations` table (#033) uses token hashes and verified email matching. Never expose raw invite secrets in DB, audit logs, error responses or browser storage.
- Billing plans and quota rows must be created from **approved server-side pricing configuration**; a marketing page is not entitlement authority.
- No Legal/AI Act classification claims may be generated from unreviewed statutory text or user-provided AI descriptions.

## Step 3 – promote sources under explicit version control

1. Create a new `supabase/migrations` directory **only once staging project identity is verified**.
2. Review each SQL file's `up` ordering, grants, indexes, table constraints, triggers, extensions, policies and statement rollback behavior. Prefer small irreversible-forward migrations rather than invented broad rollbacks.
3. Use deterministic Supabase timestamped filenames, one logical migration per domain layer. Do not rename source drafts as if they were already applied.
4. Generate Rule/Scoring seeds from the current server generators, capturing the canonical registry/manifest hashes. Discard historical conflicting hand-authored seeds.
5. Apply to an **ephemeral/local PostgreSQL/Supabase test database** first, with non-production fixture users, then to the verified GuardAI-only staging project.
6. Inspect migration history and schema diff. Second application must not rewrite immutable hashes or unexpectedly recreate rules.
7. Keep production blocked until staging has full security and app-workflow proof.

## Step 4 – mandatory live negative tests

| Test | Must be proved in real staging |
|---|---|
| Auth | Unauthenticated calls fail; recovery links bound to a real Recovery session |
| Two organizations | Owner A cannot see, alter or link resources from Org B; RLS and API both enforce isolation |
| Roles | Viewer/Member/Admin/Owner actions properly bounded; no Owner self-removal or role demotion |
| Scan/FK | An Org A Scan cannot reference Org B Target or Evidence; worker double claims rejected |
| Target ownership | Wrong/expired DNS challenge never verifies target; private-network fetches blocked |
| Findings | Fixed-by-user does not become Verified Resolved without matched detector, target and fingerprint coverage |
| Audit | Tenant events are written transactionally; raw secrets and invite tokens absent |
| Report/Trust | Public projection excludes private evidence; revocation actually makes public URL unavailable |
| Stripe | Redirect cannot grant entitlements without authenticated signed webhook reconciliation |
| Notifications/AI | Failed/unknown collection is not a pass; AI status requires actual source/version + human review |
| Backups | Restore a sanitized staging backup and verify service recovery |

For each row, record exact migration SHA, GitHub commit, environment, test users/IDs (not secrets), positive/negative outcome, request trace, and reviewer.

## Step 5 – staged release decision

`SOURCE INVENTORY` → `REVIEWED SQL` → `LOCAL DB PROOF` → `DEDICATED STAGING PROOF` → `PRODUCTION GO/NO-GO`.

Do not skip directly from a green static source inventory to applied production migrations.  
**Current state:** SOURCE INVENTORY implementation is in PR review; live stages are not complete.
