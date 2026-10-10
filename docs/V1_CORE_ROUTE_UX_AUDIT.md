# GuardAI V1 – core route UI / tenant-state audit

**As of:** 2026-10-10 · **Status:** SOURCE AUDIT / P0-08 IN PROGRESS · **Not:** browser QA, CI, staging or production proof.

This audit covers the currently routed V1 core, based on `src/AppRoutes.tsx`, its page components, `src/providers/WorkspaceProvider.tsx` and `docs/V1_DESIGN_SYSTEM.md`. The live pages, not historical mock components, define product behavior. UI permission checks complement but **never replace** backend tenant authorization. Do not publish this document as evidence of an audit certification.

## Route-by-route source findings

| V1 route | Existing source behavior | Open work / gate |
| --- | --- | --- |
| `/app` Dashboard | Target and Finding API are used; an unavailable placeholder KPI remains on `main`. | Draft PR #23 implements independent API-health/error states. Review it against PR #22 before merging; avoid parallel Dashboard changes. |
| `/app/targets` | Workspace create/list, Admin/Owner create gate, 429 handling, verification status and retry exist. | Mobile layout, input keyboard/errors, long URL wrapping and no-org/unauthorized state need real browser QA. |
| `/app/targets/:targetId` | DNS ownership start/check, expiry, role-aware scan start, ephemeral challenge and API error flows are present. | Exercise expired/failing DNS TXT, 429, clipboard failure, org switch during actions, Viewer and Member negatives in staging. |
| `/app/scans` | Real list (up to 50), bounded count wording, non-compliance completion label, loading/error/empty states. | Responsive rows and session/tenant-switch race need QA. The list has no complete historical total. |
| `/app/scans/:scanId` | Polling and stale-state warning, persisted Evidence/Findings and report creation from completed Scan. | Verify cancelled/failed/queued/running, refresh error, source hashes, role controls and unknown detector coverage against actual staging API. |
| `/app/findings` | Real paginated list, status filters, mark-fixed and re-test paths, role gates; fixed is not verified resolved. | Initial list unnecessarily depends on the Target name API via `Promise.all`; `loadMore` can append responses after filter/organization switch, and failed initial fetch can display loaded-count zeros. Fix in separate scoped patch; do not infer absence from failure. |
| `/app/evidence` | Real paginated Evidence, latest-vs-superseded, collection health, detector provenance and source Scan link. | **Addressed in this PR (unverified code):** current-user/org scope for initial data, stale page-response rejection, no misleading zero-metric screen after first fetch failure, explicit missing-workspace and retry states. Manual race and a11y proof pending. |

### Shared state priorities

1. **First-run / role:** no Organization and `403` must never mount inaccessible tenant data; PR #22 already changes AppShell and must be reviewed first.
2. **Request races:** immediately hide previous workspace's rows/counts when identity or selected tenant changes. Reject any late pagination/mutation responses. Browser-only route keying does not authorize backend access.
3. **Failure is not empty:** missing API, `401/403`, `429`, timeout and broken DB must not produce zero/count=0/passing/scanned semantics. Loading and failed states need a visible source-aware next step.
4. **Accessibility:** error blocks announce with `role=alert`, loading with status; keyboard navigation, focus, minimum touch targets and text contrast require Chromium/Firefox/Safari/real-device checks.
5. **Mobile:** test at 320, 390, 768, 1024, 1440px; long URLs, hashes, tables, dialog scroll, DNS TXT copy and action placement.
6. **No feature inflation:** privacy/AI Act/SAST/A11y modules remain gated. Visible Scan success means only completed requested checks, not verified compliance.

## Evidence regression checklist for this PR

- [ ] User A / Org A: initial 50 Evidence entries show real counts and source Scan links; history toggle only filters the loaded page.
- [ ] User A / Org B: switching while Org A first-page request is pending never displays Org A data, counters, cursor or error.
- [ ] User A / Org B: switching while an Org A `Load more` request is pending never appends Org A entries, even if the old response returns last.
- [ ] User A → User B: the same checks hold across authentication identity changes.
- [ ] `Load more` failure preserves already loaded data and displays an actionable error; a retry reloads authoritative data.
- [ ] First-page HTTP error/timeout does **not** display 0 current/superseded/collection counters or “No evidence”; retry is visible and focusable.
- [ ] No Organization and failed Organization membership read remain distinct. Authorization is always checked by the backend.
- [ ] 429 rate limit, slow requests, unmount/navigation and multiple fast workspace switches do not show cross-tenant content.
- [ ] At 320px and with keyboard, error/retry actions, long hashes and normalized observations remain usable.
- [ ] Run `npm ci && npm run lint && npm run typecheck && npm run build` and backend `npm ci && npm run check && npm test` on **exact PR HEAD SHA**; zero-step GitHub Actions failures are **BLOCKED_INFRA**, not passing QA.

## Source-change design

The Evidence page keeps a `scopeKey` of authenticated user ID + selected Organization ID. Initial data is only displayed when the successful read's `loadedScope` matches that key; an error for the current scope renders an error state instead of zero counts. A layout-effect request epoch invalidates inflight pagination whenever the scope or explicit retry changes. This is a defensive client UX measure, **not** tenant security enforcement or proof that the backend is isolated.

**Release status:** P0-08 is **IN_PROGRESS**, this narrow route fix is **CODE UNVERIFIED**. PR #22/#23 and GitHub Actions P0-01 remain independent; tests and real mobile/staging proof must run before merge. See `CURRENT_STATE.md` and `docs/V1_EXECUTION_BOARD.md`.
