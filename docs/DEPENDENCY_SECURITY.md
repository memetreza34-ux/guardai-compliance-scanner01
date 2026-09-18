# Dependency Security Review

## Final Security Audit Status
**Phase 2 Website Targets:** All previously identified HIGH-severity vulnerabilities have been explicitly addressed. Production `npm audit --omit=dev` checks report 0 high/critical vulnerabilities across both root and backend contexts.

## Root Package Vulnerabilities (Resolved)

- **fast-uri**:
  - **Previous vulnerable dependency**: `< 3.1.8`
  - **Patched resolved version**: `3.1.8`
  - **Dependency path**: `shadcn` -> `@modelcontextprotocol/sdk` -> `ajv` -> `fast-uri`
  - **Environment**: Production (Transitive)
  - **Advisories**: Multiple high-severity SSRF and host confusion vulnerabilities in fast-uri. (GHSA-7p8r-x3mc-p8w7, GHSA-5jgf-p345-68v8, GHSA-f65p-4m7j-42xc, GHSA-fph4-wmhf-6fwf, GHSA-jqff-g426-hqxp)
  - **Execution Path**: Used during schema validation (e.g. by `ajv` and MCP SDK in AI tools context).
  - **How the fix was applied**: Configured an npm `"overrides"` resolution for `"fast-uri": "^3.1.8"` in the root `package.json` to enforce patched transitive consumption without introducing unused direct dependencies.
  - **Final audit outcome**: 0 High/Critical vulnerabilities in production payload.

## Server Package Vulnerabilities (Resolved)

- **multer**:
  - **Previous vulnerable dependency**: `2.2.0`
  - **Patched resolved version**: `2.4.0`
  - **Dependency path**: `multer`
  - **Environment**: Production (Direct)
  - **Advisories**: Denial of Service (DoS) via crafted multipart field names, file descriptor leak on aborted uploads, oversized array index in field names. (GHSA-wc9g-mqfw-jrwm, GHSA-qfvm-cv95-jqjf, GHSA-535w-7cp7-47q4)
  - **Execution Path**: Executed when handling multipart form uploads (e.g. file and asset ingestion endpoints).
  - **How the fix was applied**: Upgraded the direct dependency `multer` to `^2.4.0` in `server/package.json`.
  - **Final audit outcome**: 0 High/Critical vulnerabilities in production payload.

## Remaining Moderate Vulnerabilities

- **hono** (<= 4.13.4):
  - **Severity**: Moderate
  - **Environment**: Production (Transitive via `shadcn` -> `@modelcontextprotocol/sdk`)
  - **Status**: Production reachable, but the vulnerabilities (e.g., ReDoS in CORS middleware, algorithmic complexity DoS in Language middleware) generally require specific feature usage (like specific middlewares or `toSSG()`) which are not explicitly exposed via standard GuardAI code paths. Kept as accepted moderate risk until an upstream fix is adopted by `@modelcontextprotocol/sdk`.

- **qs** (2.2.5 - 6.15.3):
  - **Severity**: Moderate
  - **Environment**: Production (Transitive via `shadcn` -> `@modelcontextprotocol/sdk` -> `express`)
  - **Status**: Production reachable. Vulnerable to DoS via array-limit bypass and controlled isBuffer checks. Mitigated natively by the backend's explicit input validation/parsing boundaries using Zod, rejecting unexpected complex nesting. Kept as accepted moderate risk.
