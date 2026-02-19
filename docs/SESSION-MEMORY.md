# Session Memory

> Claude reads this file FIRST at the start of every new session.
> Updated at the end of every session.

---

## Last Updated: 2026-02-18 (Session 8)

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

## Current Project State

### What's Built — ALL 7 PHASES COMPLETE
- Git repo initialized
- Documentation scaffolding complete (CLAUDE.md + 5 docs files)
- **Phase 1 COMPLETE:** Data model (22 tables across 6 operational domains)
  - Table definition files in `/datamodel/tables/` (JSON schema per table)
  - Choice/option-set definitions in `/datamodel/choices/`
  - Solution definition files in `/solution/` (solution.xml, env vars, connection refs)
  - Full data dictionary and Mermaid ERD in TECHNICAL.md
- **Phase 2 COMPLETE:** Security model + roles
  - 8 security role definitions in `/security/roles/`
  - PHI field security profile in `/security/field-security/`
  - Business unit structure in `/security/business-units.json`
  - Team definitions in `/security/teams.json`
  - Complete privilege matrix in `/security/privilege-matrix.md`
  - Security model documented in TECHNICAL.md
- **Phase 3 COMPLETE:** Power Automate flow definitions
  - Flow definition JSON Schema in `/flows/_schema/`
  - Flow README with translation guide in `/flows/README.md`
  - 5 Tier 1 flows in `/flows/tier-1/` (must-have automations)
  - 5 Tier 2 flows in `/flows/tier-2/` (high-value automations, 3 sub-flows)
  - 5 new environment variables added to `/solution/environment-variables.json`
  - ADR-011 (flow security context) and ADR-012 (notification architecture) in TECHNICAL.md
- **Phase 4 COMPLETE:** Canvas app (mobile responder)
  - Canvas app definition JSON Schema in `/apps/_schema/`
  - Apps README with translation guide in `/apps/README.md`
  - App-level definition in `/apps/seo_responder-mobile/app-definition.json`
  - 3 reusable components in `/apps/seo_responder-mobile/components/`
  - 8 screen definitions in `/apps/seo_responder-mobile/screens/`
  - 2 new environment variables (GPS interval, offline sync interval)
  - ADR-013 (offline-first), ADR-014 (GCC map fallback), ADR-015 (phone layout)
  - USER-GUIDE.md "For Responders" section populated
- **Phase 5 COMPLETE:** Model-driven app (dispatch console / supervisor dashboard)
  - MDA definition JSON Schema in `/model-driven-apps/_schema/`
  - MDA README with translation guide in `/model-driven-apps/README.md`
  - App definition in `/model-driven-apps/seo_dispatch-console/app-definition.json`
  - 4-area sitemap in `/model-driven-apps/seo_dispatch-console/sitemap.json`
  - 13 view files (27 views) in `/model-driven-apps/seo_dispatch-console/views/`
  - 14 form files (19 forms) in `/model-driven-apps/seo_dispatch-console/forms/`
  - 4 dashboards in `/model-driven-apps/seo_dispatch-console/dashboards/`
  - 1 BPF (incident lifecycle, 6 stages) in `/model-driven-apps/seo_dispatch-console/business-process-flows/`
  - 1 command bar (Declare MCI) in `/model-driven-apps/seo_dispatch-console/command-bar/`
  - 22 sample data files (~178 records, 5 scenarios) in `/sample-data/`
  - Sample data README with import order and FK resolution guide
  - 1 new environment variable (seo_DefaultDashboardId)
  - ADR-016 (MDA vs Canvas split), ADR-017 (BPF for incident lifecycle), ADR-018 (sample data strategy)
  - USER-GUIDE.md "For Dispatchers", "For Supervisors / ICs", "For Administrators" sections populated
- **Phase 6 COMPLETE:** Reporting / Power BI layer
  - Report definition JSON Schema in `/reporting/_schema/`
  - Reporting README with translation guide in `/reporting/README.md`
  - 5 dataset definitions in `/reporting/datasets/` (star-schema, Import mode, shared Date dimension)
  - 14 shared DAX measures in `/reporting/measures/shared-measures.json`
  - RLS definition in `/reporting/rls/agency-rls.json` (dynamic AgencyUserMapping)
  - 8 report definitions (~33 pages) in `/reporting/reports/`
  - 3 new environment variables (PowerBI workspace, refresh hours, NFPA benchmark)
  - 1 new connection reference (seo_PowerBIConnection)
  - ADR-019 (Import mode), ADR-020 (PHI exclusion), ADR-021 (RLS), ADR-022 (GCC constraints), ADR-023 (PBI vs MDA)
  - USER-GUIDE.md "For Analysts / Report Consumers" section populated
- **Phase 7 COMPLETE:** Deployment + GCC auth scripts
  - Deployment definition JSON Schema in `/deployment/_schema/`
  - Deployment README with translation guide in `/deployment/README.md`
  - 3 environment config templates in `/deployment/config/` (dev, test, prod)
  - Project scaffolding: `package.json` + `tsconfig.json` in `/deployment/scripts/`
  - 3 TypeScript type files in `/deployment/scripts/src/types/`
  - 5 utility files in `/deployment/scripts/src/utils/` (logger, pac-wrapper, dataverse-client, config-loader, ref-resolver)
  - 2 validation scripts in `/deployment/scripts/src/validate/` (spec validator, GCC compliance checker)
  - 7 deployment step scripts in `/deployment/scripts/src/deploy/` (01-07 + orchestrator)
  - 3 rollback scripts in `/deployment/scripts/src/rollback/` (solution, security, data)
  - CI/CD pipeline config + 4 GitHub Actions workflows in `/deployment/ci-cd/`
  - 3 deployment docs in `/deployment/docs/` (DEPLOYMENT.md, GCC-SETUP.md, ROLLBACK.md)
  - ADR-024 (pac CLI + Web API), ADR-025 (interactive deployment), ADR-026 (GCC endpoints), ADR-027 (PHI prod guard)
  - TECHNICAL.md Deployment Automation section added
  - USER-GUIDE.md Deployment Scripts section for administrators added

- **Session 8 COMPLETE:** Dev provisioning script (direct Dataverse Web API)
  - 6 TypeScript files in `/scripts/` (package.json, tsconfig.json, auth.ts, spec-reader.ts, metadata.ts, data-loader.ts, provision-dev.ts)
  - Device-code auth via `@azure/identity` (GCC + commercial)
  - 14-step orchestration: publisher → solution → global option sets → tables → columns → relationships → AutoNumber → solution components → env vars → PublishAllXml → sample data
  - Sample data import with @ref: symbolic FK resolution, two-pass for circular refs
  - Field alias mapping + choice label fuzzy matching for sample data mismatches
  - Supports `--dry-run`, `--skip-data`, `--commercial` flags
  - No app registration needed — uses interactive device-code flow

### What's Pending
- All 7 phases complete + dev provisioning script ready to run
- Next: O'G provides a Dataverse dev environment URL and tenant ID to run the script

## Key Decisions
1. **20+ entity model** covering all six operational domains per O'G's requirements
2. **seo_ prefix** on all tables and columns per publisher convention
3. **PHI-sensitive fields flagged** on PatientRecord — 7 columns secured by seo_PHIAccess field security profile
4. **Hydrant entity included** — adds value for fire pre-planning and on-scene water supply
5. **UnitStatusLog as separate entity** — append-only audit trail, immutable for all roles except SystemAdmin
6. **IncidentAssignment as join table** — connects incidents to units AND personnel with role, timestamps
7. **MutualAidAgreement separate from MutualAidRequest** — agreements are standing documents, requests are per-incident
8. **AfterActionReport as single entity with rollup-ready fields**
9. **Multi-agency shared environment** — each agency = 1 Dataverse Business Unit for automatic row-level isolation
10. **8 security roles** with granular per-table privileges
11. **User-scope + team sharing** for Responder and EMSProvider — least privilege
12. **Cross-BU mutual aid** via access teams + Mutual Aid Partners org-scoped team
13. **Flow security context split:** TriggeringUser for simple; FlowOwner for BU/team/cross-BU
14. **Circular trigger prevention:** filterColumns on all Dataverse triggers
15. **Notification architecture:** 3 sub-flows for dispatch supervisor alerts
16. **No PHI in flows:** All 10 flows verified
17. **Single canvas app for Responder + EMSProvider** — Patient Triage gated by role
18. **Phone layout, offline-first** — dark high-contrast, 44px touch targets, Server Wins
19. **GCC map fallback** — PCF + Launch() to native device maps
20. **GPS on every status change** — patches seo_Unit on each status tap
21. **MDA for dispatch, Canvas for field** — ADR-016
22. **BPF for incident lifecycle** — 6 stages with gates (≥1 assignment, all cleared) — ADR-017
23. **Declare MCI button** — manual supervisor override, separate from PatientCountSync auto-detection
24. **PHI containment in MDA** — dedicated tab on PatientRecord form, no PHI in views
25. **4-area sitemap** — mirrors operational workflow (Dispatch → ICS → Planning → Admin)
26. **Sample data with symbolic FK references** — @ref: format, import order documented — ADR-018
27. **Import mode for Power BI** — GCC Dataverse does not support DirectQuery, 4-hour refresh — ADR-019
28. **Zero PHI in Power BI** — all 7 PHI columns excluded at dataset level, not filtered/hidden — ADR-020
29. **Dynamic RLS with AgencyUserMapping** — mirrors Dataverse BU isolation in Power BI — ADR-021
30. **GCC Power BI constraints** — standard visuals only, no AI visuals, no Embedded — ADR-022
31. **Power BI for analytics, MDA for real-time** — no dashboard duplication — ADR-023
32. **NFPA 1710 benchmark configurable** — 6.33 min default via env var
33. **Role-playing dimensions** — Mutual Aid dataset uses separate RequestingAgency/ProvidingAgency tables
34. **pac CLI + Dataverse Web API** — pac for solution ALM, Web API for BU/team/record operations — ADR-024
35. **Interactive deployment, not zero-touch** — admin-run scripts with --dry-run, manual approval gates — ADR-025
36. **GCC endpoint strategy** — cloudType-driven endpoint selection, no commercial endpoints — ADR-026
37. **PHI hard block for Production** — code-level block on patient-records.json import to prod — ADR-027

38. **Device-code auth for dev provisioning** — no Entra app registration needed, interactive login
39. **Direct Web API for dev provisioning** — bypasses pac CLI, creates schema + data via Metadata API + OData
40. **Two-pass sample data import** — handles circular FKs (Unit↔Incident) via deferred lookup resolution
41. **Field alias mapping** — bridges sample data field names to table definition schema names
42. **Choice label fuzzy matching** — exact → prefix → contains matching for sample data choice labels

## Open Questions / Blockers
- None — all 7 phases complete + dev provisioning script ready

## Next Steps
1. O'G provides Dataverse dev environment URL + tenant ID
2. Run `npx tsx provision-dev.ts --url <URL> --tenant-id <GUID>` to create schema + sample data
3. Verify in make.powerapps.com: 22 tables, columns, relationships, sample data
4. Begin building model-driven app and canvas app from specs
