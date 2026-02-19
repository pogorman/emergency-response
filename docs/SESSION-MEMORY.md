# Session Memory

> Claude reads this file FIRST at the start of every new session.
> Updated at the end of every session.

---

## Last Updated: 2026-02-18 (Session 10)

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

## Current Project State

### What's Built — ALL 7 PHASES COMPLETE + DEPLOYED
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
- **19 XML format issues** documented in `docs/DATAVERSE-SOLUTION-XML-GUIDE.md`

### What's NOT in the Solution .zip
- **Environment variables** — cause generic import errors in GCC; create manually post-import
- **Calculated fields** — `seo_responseTimeMinutes`, `seo_totalDurationMinutes`; configure in maker portal
- **Security roles** — not yet created in Dataverse
- **PHI field security** — not yet configured
- **Sample data** — not imported via solution; use provisioning script or Dataverse import wizard
- **Power Automate flows** — build manually from flow specs
- **Canvas app / MDA** — build manually from app specs
- **Power BI reports** — build manually from report specs

### GCC Environment
- **URL:** `https://emergency-response.crm9.dynamics.com/`
- **Org:** `og-emergency-response`
- **User:** `patrick.ogorman@testtestmsftgccfo.onmicrosoft.com`
- **pac CLI:** `C:\Users\pogorman\AppData\Local\Microsoft\PowerAppsCLI\pac.cmd` (v1.49.3)
- **Auth:** `pac auth create --cloud UsGov --deviceCode`
- **Solution checker:** `pac solution check --geo USGovernment`

## Key Decisions
1-42. (See previous sessions — all still current)
43. **Solution .zip generator** — TypeScript script generates Dataverse solution XML from JSON specs
44. **Local inline option sets** — all choice columns use local option sets to avoid name collisions with global option sets
45. **Entity primary key collision detection** — auto-rename columns that collide with `{entity}id` auto-generated PK
46. **Environment variables excluded** — GCC import fails with generic error when env var definitions are in customizations.xml
47. **Root-level relationships** — all EntityRelationship definitions must be in root-level section, not inside individual entities
48. **Reference solution as format guide** — used CaseManagement_1_0_7.zip from Downloads as authoritative XML format reference

## Open Questions / Blockers
- None — schema deployed, documentation complete

## Next Steps
1. Create security roles in Dataverse (from `security/roles/*.json` specs)
2. Configure PHI field security profile on PatientRecord
3. Create 18 environment variables (from `solution/environment-variables.json`)
4. Build Power Automate flows from `flows/` specs
5. Build canvas app from `apps/seo_responder-mobile/` specs
6. Build model-driven app from `model-driven-apps/seo_dispatch-console/` specs
7. Build Power BI reports from `reporting/` specs
8. Import sample data
