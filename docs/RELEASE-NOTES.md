# Release Notes

## v0.3.0 — Phase 3: Power Automate Flow Definitions (2026-02-18)

### Summary
10 Power Automate flow specification files covering the critical automation layer: immutable audit logging, incident lifecycle progression, agency onboarding (BU + team provisioning), mutual aid team management, incident sharing, auto-naming, after-action report creation, supervisor notifications, patient count sync with MCI auto-detection, and agreement expiry monitoring.

### What's Included
- **Flow definition schema** (`flows/_schema/flow-definition-schema.json`):
  - JSON Schema for validating all flow specification files
  - Covers trigger config, step definitions, security context, PHI compliance, circular trigger prevention
- **Flow README** (`flows/README.md`):
  - Translation guide: spec → Power Automate designer
  - Security context summary for all 10 flows
  - Circular trigger prevention analysis
  - Environment variable mapping
- **5 Tier 1 flows** (`flows/tier-1/`) — must-have automations:
  - `seo_UnitStatusChangeLog` — immutable audit trail per ADR-003
  - `seo_IncidentStatusProgression` — auto-advance status from timestamps
  - `seo_AgencyOnboarding` — BU + 4 owner teams on Agency create
  - `seo_MutualAidTeamManagement` — cross-BU team membership + access teams
  - `seo_IncidentSharing` — share incidents with agency teams on assignment
- **5 Tier 2 flows** (`flows/tier-2/`) — high-value automations:
  - `seo_IncidentAssignmentAutoName` — auto-name "Unit X - Incident Y"
  - `seo_AfterActionReportCreation` — draft AAR on incident close
  - `seo_NotifyDispatchSupervisor` (3 sub-flows):
    - `seo_NotifyMCIAlarm` — MCI flag / alarm level alerts
    - `seo_NotifyMutualAidRequest` — mutual aid lifecycle alerts
    - `seo_NotifyCommandTransfer` — command establishment/transfer alerts
  - `seo_PatientCountSync` — patient count rollup + MCI auto-flag
  - `seo_MutualAidAgreementExpiry` — daily expiry digest email
- **5 new environment variables** (`solution/environment-variables.json`):
  - `seo_MCIPatientThreshold` (default: "5")
  - `seo_MutualAidExpiryWarningDays` (default: "30")
  - `seo_DispatchSupervisorEmail`
  - `seo_FlowErrorNotificationEmail`
  - `seo_ServiceAccountUserId`
- **2 new ADRs** in TECHNICAL.md:
  - ADR-011: Flow Security Context (TriggeringUser vs FlowOwner)
  - ADR-012: Notification Architecture (sub-flow pattern)
- **TECHNICAL.md updated** with Power Automate Flows section
- **USER-GUIDE.md updated** with Automated Workflows section

### Key Design Decisions
- TriggeringUser for flows that stay within the user's BU (status log, status progression, auto-name)
- FlowOwner (service account with SystemAdmin) for BU/team management and cross-BU operations
- filterColumns on all triggers prevents circular firing; one intentional cascade (PatientCountSync → NotifyMCIAlarm)
- No flow reads or writes PHI columns — verified for all 10 flows
- Access teams are deactivated (not deleted) when mutual aid ends — preserves audit trail
- MCI flag is one-directional (auto-set to true, never auto-cleared)

### Breaking Changes
None (additive — new flow specs and environment variables).

### Dependencies
- v0.2.0 (security model must be in place — flows reference roles, teams, BU structure)
- Service account with seo_SystemAdmin role for FlowOwner flows
- Office 365 Outlook connector for notification flows
- GCC environment with Dataverse connection

---

## v0.2.0 — Phase 2: Security Model + Roles (2026-02-18)

### Summary
Complete security layer for the multi-agency GCC Dataverse deployment. Defines 8 granular security roles, column-level PHI protection, business unit structure for per-agency data isolation, and team-based sharing for incident-level access control.

### What's Included
- **8 security role definitions** (`security/roles/`):
  - SystemAdmin (Org), DispatchSupervisor (BU), Dispatcher (BU), IncidentCommander (BU)
  - Responder (User+share), EMSProvider (User+share), StationOfficer (BU), ReadOnlyAnalyst (BU)
- **PHI field security profile** (`security/field-security/seo_phi-profile.json`):
  - 7 columns on PatientRecord secured (name, age, gender, complaint, assessment, treatment)
  - Only EMSProvider + SystemAdmin can read/write PHI
- **Business unit structure** (`security/business-units.json`):
  - Root BU: State Emergency Operations
  - Child BUs: one per agency for automatic row-level isolation
- **Team definitions** (`security/teams.json`):
  - 4 owner teams per agency BU (Dispatchers, Responders, EMS, Command)
  - Cross-BU Mutual Aid Partners team
  - Per-incident access team pattern for mutual aid
- **Privilege matrix** (`security/privilege-matrix.md`):
  - Complete 22-table × 8-role × 8-privilege grid
  - Verification checklist for security gaps
- **TECHNICAL.md updated** with Security Model section

### Key Design Decisions
- UnitStatusLog is append-only (Create only, no Write/Delete) for all non-admin roles
- PatientRecord delete restricted to SystemAdmin only (HIPAA retention)
- Responder/EMSProvider use User-level scope + team sharing (least privilege)
- Cross-BU mutual aid never leaks PHI — field security profile must be individually assigned
- Reference tables (Jurisdiction, Facility, Hydrant, PrePlan) have Org-wide Read for all roles

### Breaking Changes
None (additive — new security artifacts).

### Dependencies
- v0.1.0 (data model must be in place before applying security roles)
- Dataverse Admin Center access for BU and team provisioning

---

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
