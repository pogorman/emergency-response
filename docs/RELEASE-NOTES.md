# Release Notes

## v0.1.0 — Phase 1: Solution Foundation + Data Model (2026-02-18)

### Summary
Initial project scaffolding, documentation framework, and complete Dataverse data model for the EmergencyResponseCoordination solution.

### What's Included
- **Documentation framework:** CLAUDE.md, PROMPT-LOG, RELEASE-NOTES, TECHNICAL, USER-GUIDE, SESSION-MEMORY
- **Data model (20+ entities):**
  - Core: Incident, Call, Agency, Jurisdiction, Facility
  - Dispatch: Unit, Apparatus, Station, Personnel, IncidentAssignment, UnitStatusLog
  - ICS: IncidentCommand, Division, ResourceRequest, IncidentNote
  - EMS: PatientRecord, Transport
  - Mutual Aid: MutualAidRequest, MutualAidAgreement
  - After-Action: AfterActionReport
  - Planning: PrePlan, Hazard, Hydrant
- **Choice/option-set definitions** for all status, type, priority, and category fields
- **Solution definition files:** solution.xml, environment variables, connection references
- **Mermaid ERD** documenting all relationships
- **Complete data dictionary** with column types, requiredness, descriptions, and rationale

### Breaking Changes
None (initial release).

### Dependencies
- Microsoft Dataverse (GCC environment)
- Power Platform solution framework
