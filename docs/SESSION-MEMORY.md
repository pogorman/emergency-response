# Session Memory

> Claude reads this file FIRST at the start of every new session.
> Updated at the end of every session.

---

## Last Updated: 2026-02-19 (Session 12)

## Session Log

| Session | Date | Duration | Summary |
|---------|------|----------|---------|
| 1 | 2026-02-18 | ~45 min | Project bootstrap, Phase 1 data model (20+ tables, choices, ERD, data dictionary) |
| 2 | 2026-02-18 | ~30 min | Phase 2 security model (8 roles, PHI profile, BU structure, teams, privilege matrix) |
| 3 | 2026-02-18 | ~40 min | Phase 3 Power Automate flows (10 flow specs, schema, 5 env vars, full docs update) |
| 4 | 2026-02-18 | ~50 min | Phase 4 Canvas app (8 screens, 3 components, schema, 2 env vars, full docs update) |
| 5 | 2026-02-18 | ~60 min | Phase 5 Model-driven app (27 views, 19 forms, 4 dashboards, BPF, command bar, 22 sample data files, schema, 1 env var, full docs update) |
| 6 | 2026-02-18 | ~45 min | Phase 6 Power BI reporting (5 datasets, 8 reports, shared measures, RLS, schema, 3 env vars, 1 conn ref, full docs update) |
| 7 | 2026-02-18 | ~60 min | Phase 7 Deployment automation (21 TS scripts, 4 env configs, 4 CI/CD workflows, 3 deployment docs, 4 ADRs, full docs update) |
| 8 | 2026-02-18 | ~45 min | Dev provisioning script — 6 TS files in scripts/, device-code auth, Dataverse Web API metadata + data import, dry-run support |
| 9 | 2026-02-18 | ~120 min | Solution .zip generator — debugged 19 XML format issues, successfully imported to GCC Dataverse (22 tables, 276 columns, 53 relationships) |
| 10 | 2026-02-18 | ~30 min | Documentation — created DATAVERSE-SOLUTION-XML-GUIDE.md, updated MEMORY.md, CLAUDE.md, README, SESSION-MEMORY, PROMPT-LOG, RELEASE-NOTES |
| 11 | 2026-02-19 | ~45 min | Extended solution generator with 28 views + 19 forms (FetchXML, layoutxml, form tabs/sections/subgrids, deterministic GUIDs, choice value resolution) |
| 12 | 2026-02-19 | ~90 min | Views/forms GCC import (4 bug fixes) + sample data loader (raw device-code OAuth) + 184/184 records loaded |

## Current Project State

### What's Built — ALL 7 PHASES COMPLETE + DEPLOYED + DATA LOADED
- Git repo initialized
- Documentation scaffolding complete (CLAUDE.md + 5 docs files)
- **Phase 1 COMPLETE:** Data model (22 tables across 6 operational domains)
- **Phase 2 COMPLETE:** Security model + roles (8 roles, PHI profile, BU structure)
- **Phase 3 COMPLETE:** Power Automate flows (10 flow specs, 2 tiers)
- **Phase 4 COMPLETE:** Canvas app (Responder Mobile — 8 screens, 3 components)
- **Phase 5 COMPLETE:** Model-driven app (Dispatch Console — 27 views, 19 forms, 4 dashboards, BPF)
- **Phase 6 COMPLETE:** Reporting / Power BI layer (5 datasets, 8 reports, shared measures, RLS)
- **Phase 7 COMPLETE:** Deployment + GCC auth scripts (21 scripts, 4 workflows, 3 configs)

### Dataverse Schema Deployed
- **Solution .zip generator:** `scripts/generate-solution.ts` reads JSON specs → outputs `EmergencyResponseCoordination.zip`
- **Successfully imported** to GCC Dataverse via `pac solution import`
- **22 tables, 276 columns, 53 relationships** deployed
- **28 views, 19 forms** deployed and verified
- **19 XML format issues** documented in `docs/DATAVERSE-SOLUTION-XML-GUIDE.md`
- **4 additional import fixes** for views/forms (section columns, column validation, relative dates, relationship names)

### Sample Data Loaded
- **184/184 records** loaded across 22 entities via `scripts/load-sample-data.ts`
- Raw device-code OAuth (no @azure/identity dependency — works on Node 18)
- Deferred lookups: 10/12 resolved (2 phantom unit refs don't exist in sample data)
- Hydrant jurisdiction lookups not linked when using `--entity` filter

### What's NOT in the Solution .zip
- **Environment variables** — cause generic import errors in GCC; create manually post-import
- **Calculated fields** — `seo_responseTimeMinutes`, `seo_totalDurationMinutes`; configure in maker portal
- **Security roles** — not yet created in Dataverse
- **PHI field security** — not yet configured
- **Power Automate flows** — build manually from flow specs
- **Canvas app** — build manually from app specs
- **Model-driven app** — O'G built this manually from specs
- **Power BI reports** — build manually from report specs
- **Linked entity filters** — cross-table view filters; configure manually
- **Business rules** — form-level business rules; configure manually

### GCC Environment
- **URL:** `https://emergency-response.crm9.dynamics.com/`
- **Org:** `og-emergency-response`
- **User:** `patrick.ogorman@testtestmsftgccfo.onmicrosoft.com`
- **Tenant ID:** `426a6ef4-2476-4eab-ae1c-1c9dc2bfca80` (COMMERCIAL tenant, not GCC)
- **Auth:** Use `--commercial` flag (login.microsoftonline.com, not login.microsoftonline.us)
- **pac CLI:** `C:\Users\pogorman\AppData\Local\Microsoft\PowerAppsCLI\pac.cmd` (v1.49.3)
- **pac auth:** `pac auth create --cloud UsGov --deviceCode`
- **Solution checker:** `pac solution check --geo USGovernment`

### Dataverse Web API Notes
- Property names must be ALL LOWERCASE (logical names, not schema names)
- `startswith()` not supported for Metadata Entity queries — use `LogicalName eq`
- EntityDefinitions query: batch `LogicalName eq '...'` with single-entity fallback
- Dynamics first-party client ID for device code: `51f81489-12ee-4a9e-aaae-a2591f45987d`
- Node 18 on this machine — `@azure/identity` v4.x requires Node 20+

## Key Decisions
1-53. (See previous sessions — all still current)
54. **Raw device-code OAuth** — no @azure/identity dependency; raw fetch calls to Azure AD endpoints work on Node 18
55. **Commercial auth for GCC tenant** — tenant uses `login.microsoftonline.com` despite GCC Dataverse URL
56. **Lowercase all Web API property names** — Dataverse rejects camelCase field names
57. **Hydrant PK alias** — `seo_hydrantId` → `seo_hydrant_name` to avoid collision with auto-generated GUID primary key
58. **Entity filter flag** — `--entity seo_TableName` for targeted re-imports without re-running all 184 records

## Open Questions / Blockers
- None critical

## Next Steps
1. Configure linked entity filters manually for Open Calls view
2. Configure business rules manually (MCI Visual Alert, Locked When Closed)
3. Create security roles in Dataverse (from `security/roles/*.json` specs)
4. Configure PHI field security profile on PatientRecord
5. Create 18 environment variables (from `solution/environment-variables.json`)
6. Build Power Automate flows from `flows/` specs
7. Build canvas app from `apps/seo_responder-mobile/` specs
8. Build Power BI reports from `reporting/` specs
