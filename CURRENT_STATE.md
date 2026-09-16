# CURRENT_STATE.md

## Repository Inspection - 2026-09-16

### 1. Document / Source Mismatches Discovered
- **BUILD_PROGRESS_MATRIX.md**: This file lists several features as complete or in progress, but the actual frontend lacked a real React Router setup and real API integrations. The UI contained hardcoded demo state (e.g. "Overall Compliance 92%").
- **PHASE_12_AI_GOVERNANCE_TRACKER.md**: References files like `src/types/aiGovernance.ts`, `src/api/aiGovernanceApi.ts`, `AiGovernanceCenter.tsx`, and `AuthWorkspaceShell.tsx`. 
  - `AiGovernanceCenter.tsx` and `AuthWorkspaceShell.tsx` exist in the `src/components/` directory.
  - The API client was not wired effectively in a router; instead, local state navigation (`activeTab`) was used in `App.tsx`.
- **README.md**: Lists CI checks that may refer to historical states. GitHub workflow configurations need to be reviewed separately.

### 2. Architecture & Implementation Updates Made
- **Routing**: Replaced local-state navigation (`activeTab` in `App.tsx`) with a mature `react-router-dom` configuration inside `AppRoutes.tsx`.
- **Authentication**: Added `@supabase/supabase-js`. Implemented `AuthProvider` context in `src/auth/AuthProvider.tsx`. We do not spoof authenticated sessions. Without configuration, the app displays a clear configuration error.
- **Workspace Context**: Created `WorkspaceProvider` (`src/providers/WorkspaceProvider.tsx`) handling organization data matching the backend's multi-tenant architecture.
- **Dashboard**: Created `DashboardPage.tsx` which queries the real `/api/v1/organizations/:orgId/targets` and `/api/v1/organizations/:orgId/findings` instead of rendering hardcoded scores.
- **Fake Data**: Removed fake scans, fake repository names, and fake reviewers from the production routing paths.

### 3. Server Configuration
- Preserved the existing CommonJS backend (`server/app.js`).
- Integrated development flow via `concurrently`: `vite` serves the frontend on port 3000 and proxies `/api` to the backend running on port 3001.

### 4. Remaining Blocked / Unverified Modules
- Asset Ingestion, Real repository parsing, Privacy/Accessibility Scanners, and complete AI Governance automation remain disabled or in placeholder state pending further validation.
- All disabled features explicitly render a "Not Yet Available" state.