# GuardAI V1 – Target list, DNS ownership and scan-start regression matrix

**2026-10-10: P0-08 SOURCE IMPLEMENTATION ONLY – CODE UNVERIFIED.** This document is neither browser/staging evidence nor proof of backend security or legal compliance.

## Source changes and boundaries

- `TargetsPage.tsx` may show listed Targets only after a successful read for its currently authenticated `userId:organizationId`. Target list API responses containing any unexpected `organizationId` fail the page closed. Workspace membership API errors are shown distinctly from a fresh empty list.
- Target creation redirects are rejected if the request completes after the user switches to a different Organization, changes login identity or loses Owner/Admin role. Buttons are guarded against concurrent creates. HTTP 429 still gives a no-retry-storm error.
- `TargetDetailPage.tsx` requires successful target retrieval with the **expected target ID and organization ID** before displaying ownership challenge, verification data, scanner action or other details. On initial failure, a retry is available and there is no stale Target from a previous workspace/route.
- DNS challenge issue/check and scan submission responses are guarded against changes in auth identity, active Organization, Target or role. Target creation also rejects redirects after an auth access-token transition. Client checks are not authorization: backend must enforce Owner/Admin for DNS writes and Member+ for scanning. The only exposed scan module remains `security` and only DNS-verified website Targets may be scanned according to the server.
- Non-website repository/asset Targets do not render website DNS challenge or website security scan controls. One-time DNS TXT values and copy UI only render to an Owner/Admin in the active Target context. Async clipboard confirmation and its reset timers are invalidated if the context changes. Challenge values are ephemeral UI state, never persisted or logged by this patch.
- `src/lib/targetViewScope.ts` centralizes conservative client display predicates and organization-ID checking; `tests/targetViewScope.test.mjs` provides **eight pure-function regression cases**, registered as `npm run test:ui-state` in frontend CI.

## Required staging/browser test matrix (not yet executed)

| Scenario | Acceptance requirement |
| --- | --- |
| User A / Org A target list fetch pending, switch Org B | A Targets, names/URLs/errors cannot appear in Org B; no foreign Target IDs |
| User A → User B while target list/detail fetch pending | Old user's Target and DNS TXT value never render in User B |
| Target list API accidentally returns mixed Org IDs | Explicit unavailable error, never silently expose mixed rows |
| Empty list returned successfully for an authorized Organization | Genuine first-run empty state with one next action; no claim of security assessment |
| List or detail API responds 401/403/429/500 or times out | Explicit error/Retry and no stale Target. No fabricated zero/verified state |
| Target detail fetch for A returns after navigation to B | A Target, verification state, DNS TXT, scanner controls never render under B |
| Owner starts DNS verification, then switches Org/Target/user | Old challenge response does not expose one-time TXT record or update visible status |
| Owner checks DNS, then loses Admin/Owner role | Late check and refresh do not change current visible status; no DNS write buttons |
| Verification expires or fails | Server-refreshed authoritative status; no misleading “verified”, expiry explained |
| Copy TXT then switch user/Org | Old clipboard promise/timer does not show copied state/error in new context; no TXT value displayed to Viewer |
| Viewer attempts DNS challenge or scan | No forbidden buttons; backend separately returns 403 if called directly |
| Member attempts scan on verified Target | Server authorizes Member+; submits only supported `security` module |
| Scan request pending then Org, Target, role or user changes | Old response never redirects to Scan detail under new identity; idempotency enforced by backend |
| Multiple quick clicks / 429 throttling | No duplicate active submission, explicit rate limit message, no automatic aggressive retries |
| Source Target is repository/asset, not website | Frontend hides DNS / website scan actions and displays explanation; backend must also reject unsupported operations |
| 320/390/768/1024/1440px widths, keyboard navigation, screen reader | Form labels/errors, long URLs, hashes and DNS copy controls remain accessible |

## Validation gates

Execute **exact PR head SHA**, not an old green workflow: root `npm ci && npm run lint && npm run typecheck && npm run test:ui-state && npm run build`, then `cd server && npm ci && npm run check && npm test`.

The eight `node:test` cases check pure display scoping/organization responses only. They do **not** test React render timing, DNS network calls, actual role changes, clipboard, database RLS, encrypted storage or worker scheduling. All table cases require dedicated GuardAI staging + two users/two Organizations and browser QA. GitHub Actions **0 step** jobs mean **BLOCKED_INFRA**; this is not passing or failed code validation. See issue #28.

**Related independent open Drafts:** #22 AppShell, #23 Dashboard, #30 Evidence, #31 Findings, #32 Scan routes, #27 SQL inventory. No migrations/providers/secrets changed in this patch, and no release/merge until actual tests and staging gates pass.
