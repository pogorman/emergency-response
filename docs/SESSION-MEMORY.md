# Session Memory

> Claude reads this file FIRST at the start of every new session.
> Updated at the end of every session.

---

## Last Updated: 2026-02-18 (Session 2)

## Session Log

| Session | Date | Duration | Summary |
|---------|------|----------|---------|
| 1 | 2026-02-18 | ~45 min | Project bootstrap, Phase 1 data model (20+ tables, choices, ERD, data dictionary) |
| 2 | 2026-02-18 | ~30 min | Phase 2 security model (8 roles, PHI profile, BU structure, teams, privilege matrix) |

## Current Project State

### What's Built
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

### What's Pending
- Phase 3: Power Automate flows (next)
- Phase 4: Canvas app (mobile responder)
- Phase 5: Model-driven app (dispatch/supervisor)
- Phase 6: Reporting / Power BI
- Phase 7: Deployment + GCC auth scripts

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
10. **8 security roles** with granular per-table privileges: SystemAdmin, DispatchSupervisor, Dispatcher, IC, Responder, EMSProvider, StationOfficer, ReadOnlyAnalyst
11. **User-scope + team sharing** for Responder and EMSProvider — least privilege, incident access via owner teams
12. **Cross-BU mutual aid** via access teams + Mutual Aid Partners org-scoped team, with PHI never leaking across BUs

## Open Questions / Blockers
- None currently — ready for O'G to review Phase 2 and greenlight Phase 3

## Next Steps
1. O'G reviews security model and privilege matrix
2. Begin Phase 3: Power Automate flows (BU provisioning, status notifications, mutual aid workflows)
