# CURRENT_STATE.md

## Repository Inspection - 2026-09-16

### 1. Document / Source Mismatches Discovered
- **BUILD_PROGRESS_MATRIX.md**: Contained false claims about feature completeness. The frontend lacked a real React Router setup and real API integrations. The UI contained hardcoded demo state (e.g. "Overall Compliance 92%").
- **PHASE_12_AI_GOVERNANCE_TRACKER.md**: References obsolete files like `AiGovernanceCenter.tsx` and `AuthWorkspaceShell.tsx`. The API client was not wired effectively in a router; instead, local state navigation was used.

### 2. Architecture & Implementation Updates Made
- **Routing**: Replaced local-state navigation with a mature `react-router-dom` configuration inside `AppRoutes.tsx`. `src/main.tsx` cleanly mounts `AppRoutes`.
- **Authentication**: Implemented actual sign-in and sign-up using `@supabase/supabase-js`. The app correctly displays authentication flows instead of spoofing a session.
- **Workspace Context**: Created `WorkspaceProvider` to handle organization data matching the backend's multi-tenant architecture.
- **Dashboard**: Created `DashboardPage.tsx` which queries the real API (`findingApi.ts`) for findings. Synthetic zeroes for unknown/missing data have been replaced with truthful "Unavailable" states.
- **Fake Data**: Removed fake scans, fake repository names, and fake reviewers from the production routing paths.

### 3. Server Configuration
- Backend APIs (`findingRoutes`, `evidenceRoutes`, `ruleRoutes`) have been properly mounted on `/api/v1` in `server/app.js`.
- Integrated development flow via `concurrently`: `vite` serves the frontend on port 3000 and proxies `/api` to the backend.
- Backend tests and typechecking have been verified.

### 4. Remaining Blocked / Unverified Modules
- Asset Ingestion, Real repository parsing, Privacy/Accessibility Scanners, and complete AI Governance automation remain disabled or in placeholder state pending further validation.
- All disabled features explicitly render a "Not Yet Available" state.
