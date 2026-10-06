# GuardAI Planning Document Status

Last reviewed: 2026-10-06

GuardAI intentionally separates **product direction** from **repository truth**.

| Document | Status | Purpose |
|---|---|---|
| `CURRENT_STATE.md` | CANONICAL — IMPLEMENTATION STATUS | What the repository actually supports now. |
| `docs/GUARDAI_MASTER_BUILD_GUIDE.md` | CANONICAL — ENGINEERING DIRECTION | Long-term architecture, safety principles and build order. It links to CURRENT_STATE instead of duplicating current implementation truth. |
| Market/competitor research from October 2026 | SUPPORTING — PRODUCT STRATEGY | Establishes the Evidence-first Technical GRC positioning and competitive context. It does not prove implementation. |
| Phase trackers / historical build matrices | SUPPORTING or HISTORICAL | Useful context only. Any feature-completeness statement that conflicts with source/CI/CURRENT_STATE is stale. |

## Product north star

```text
Target / Asset
→ Scan
→ Observation
→ Evidence + Provenance
→ Finding
→ Remediation
→ Re-Test
→ Verified Resolved
→ Control
→ Framework Requirement
→ Risk
→ Monitoring / Drift
→ Report / Audit / Trust
```

Later governance domains (Policies, Vendors, Access Reviews, AI Governance, Questionnaires) should attach to the same canonical evidence/control/risk graph instead of becoming isolated truth systems.

## Change rule

A planning document may propose a future capability, but only source + tests + validation may move it to IMPLEMENTED or VERIFIED.
