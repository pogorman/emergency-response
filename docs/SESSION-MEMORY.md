# Session Memory

> Claude reads this file FIRST at the start of every new session.
> Updated at the end of every session.

---

## Last Updated: 2026-02-18 (Session 1)

## Current Project State

### What's Built
- Git repo initialized
- Documentation scaffolding complete (CLAUDE.md + 5 docs files)
- Complete Phase 1 data model designed (20+ entities across 6 operational domains)
- Data model definition files created in `/datamodel/` (JSON schema per table)
- Choice/option-set definitions in `/datamodel/choices/`
- Solution definition files in `/solution/` (solution.xml, env vars, connection refs)
- Full data dictionary and Mermaid ERD documented in TECHNICAL.md
- v0.1.0 release notes written

### What's Pending
- Phase 2: Security model + roles (next)
- Phase 3: Power Automate flows
- Phase 4: Canvas app (mobile responder)
- Phase 5: Model-driven app (dispatch/supervisor)
- Phase 6: Reporting / Power BI
- Phase 7: Deployment + GCC auth scripts

## Key Decisions
1. **20+ entity model** covering all six operational domains per O'G's requirements
2. **seo_ prefix** on all tables and columns per publisher convention
3. **PHI-sensitive fields flagged** on PatientRecord and Transport entities — these need column-level security in Phase 2
4. **Hydrant entity included** — adds value for fire pre-planning and on-scene water supply
5. **UnitStatusLog as separate entity** — provides full audit trail of unit status changes vs. just current status on Unit
6. **IncidentAssignment as join table** — connects incidents to units AND personnel with role, timestamps, enabling flexible ICS-style assignments
7. **MutualAidAgreement separate from MutualAidRequest** — agreements are standing documents, requests are per-incident
8. **AfterActionReport as single entity with rollup-ready fields** — keeps it lean; detailed narrative in rich text column

## Open Questions / Blockers
- None currently — ready for O'G to review Phase 1 and greenlight Phase 2

## Next Steps
1. O'G reviews data model and documentation
2. Begin Phase 2: Security model (roles, business units, field-level security for PHI)
