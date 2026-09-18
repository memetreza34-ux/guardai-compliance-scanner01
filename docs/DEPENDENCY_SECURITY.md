# Dependency Security Review

## Root Package Vulnerabilities

- **fast-uri**:
  - **Version installed**: 3.1.4
  - **Dependency path**: `shadcn` -> `@modelcontextprotocol/sdk` -> `ajv` -> `fast-uri`
  - **Direct/Transitive**: Transitive
  - **Environment**: Production
  - **Advisories**: Multiple high-severity SSRF and host confusion vulnerabilities in fast-uri. (GHSA-7p8r-x3mc-p8w7, GHSA-5jgf-p345-68v8, GHSA-f65p-4m7j-42xc, GHSA-fph4-wmhf-6fwf, GHSA-jqff-g426-hqxp)
  - **Affected versions**: < 3.1.8
  - **Patched version**: 3.1.8
  - **Execution Path**: Used during schema validation (e.g. by `ajv` and MCP SDK in AI tools context).
  - **Mitigation**: Upgraded `fast-uri` to `^3.1.8` which cleanly resolves all high-severity vulnerabilities without breaking dependencies.

## Server Package Vulnerabilities

- **multer**:
  - **Version installed**: 2.2.0
  - **Dependency path**: `multer`
  - **Direct/Transitive**: Direct
  - **Environment**: Production
  - **Advisories**: Denial of Service (DoS) via crafted multipart field names, file descriptor leak on aborted uploads, oversized array index in field names. (GHSA-wc9g-mqfw-jrwm, GHSA-qfvm-cv95-jqjf, GHSA-535w-7cp7-47q4)
  - **Affected versions**: < 2.4.0
  - **Patched version**: 2.4.0
  - **Execution Path**: Executed when handling multipart form uploads (e.g. file and asset ingestion endpoints).
  - **Mitigation**: Upgraded `multer` to `^2.4.0` resolving the high-severity vulnerabilities without requiring code changes.
