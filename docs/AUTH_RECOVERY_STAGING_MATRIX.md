# GuardAI Password Recovery — Staging Verification Matrix

> Status: CHECKLIST ONLY. No real Supabase staging account, email or delivery check has been run by the GitHub CI job. Use only the dedicated GuardAI Supabase project; never the shared multi-application project.

## Expected client behavior

| Scenario | Expected |
| --- | --- |
| Signed-out user requests reset for an existing account | Auth provider accepts the request; UI does not promise email delivery |
| Signed-out user requests reset for an unknown account | Public UI makes no assertion that the account exists |
| Valid recovery link returns to `/auth/reset-password` | Supabase emits `PASSWORD_RECOVERY` with an authenticated session; reset form becomes available |
| Already-signed-in user opens `/auth/reset-password` directly | Reset form is blocked; a normal session is not treated as recovery |
| Invalid/expired recovery link | Form stays blocked and links back to requesting a fresh reset |
| User submits mismatched/short passwords | Client validation blocks submission |
| Supabase rejects `updateUser` | Error is shown; success is not claimed |
| Supabase accepts `updateUser` | Input values cleared; in-memory recovery grant cleared |
| Session signs out or switches to another user | Recovery grant is discarded |
| Access token refresh races initial `getSession` | Older initial read cannot overwrite a newer auth event |
| Recover link page reload without fresh recovery event | In-memory recovery grant is not resurrected from browser storage |
| Recovery link from another Supabase project | Should not authenticate in the dedicated GuardAI project |

## Deployment prerequisites

1. Use the GuardAI-only project ref and verify it is **not** any other application's project.
2. Allowlist the exact deployed `/auth/reset-password` callback URL.
3. Configure and test the recovery email sender, redirect domain and Supabase Auth templates.
4. Test SMTP deliverability and failure handling using disposable staging users, never production identities.
5. Verify successful and expired recovery cases with real browser redirects, including direct URL access from a logged-in session.
6. Verify password policies and sensitive auth-operation enforcement in Supabase itself; **the frontend recovery-event gate is a UX safeguard, not an independent server-side authorization mechanism**.
7. Confirm account sessions, post-reset logout/session rotation expectations, rate limits and audit requirements before production.

## Sources

- [Supabase JS password reset](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
- [Supabase auth state event guide](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
