# Release Notes

## v0.4.0 — Phase 4: Canvas App — Responder Mobile (2026-02-18)

### Summary
Complete canvas app specification for the Responder Mobile phone app. 8 screen definitions, 3 reusable components, app-level configuration with offline-first architecture, and a JSON schema for canvas app specs. Single app serving both Responder and EMS Provider roles with role-conditional Patient Triage screen.

### What's Included
- **Canvas app definition schema** (`apps/_schema/canvas-app-definition-schema.json`):
  - JSON Schema for app, screen, and component definition validation
  - Covers data source bindings, offline profiles, theme config, control trees, PHI compliance
- **Apps README** (`apps/README.md`):
  - Spec format explanation, control naming conventions, variable conventions
  - Step-by-step translation guide: spec → Power Apps Studio
- **App-level definition** (`apps/seo_responder-mobile/app-definition.json`):
  - 12 Dataverse data sources with access levels and sync filters
  - Offline profile: Server Wins conflict resolution, configurable sync interval
  - Dark high-contrast theme with status/priority/triage color maps
  - 9 global variables (current user, personnel, unit, incident, role check, GPS)
  - Bottom tab bar navigation with 8 screens (5 in nav bar)
  - 4 GCC constraints documented with mitigations
- **3 reusable components** (`apps/seo_responder-mobile/components/`):
  - `cmpNavigationBar` — 4-5 tab bottom bar (Patients tab visible for EMS only)
  - `cmpStatusButtonGroup` — 8 status buttons (60px height), GPS capture on every tap
  - `cmpIncidentCard` — compact incident card with priority band, MCI badge, timestamps
- **8 screen definitions** (`apps/seo_responder-mobile/screens/`):
  - `scrHome` — dashboard: status banner, active incident card, GPS timer, quick actions
  - `scrUnitStatus` — full-screen status buttons + status history timeline
  - `scrIncidentDetail` — hazard banner, address, timestamps, assigned units, ICS command
  - `scrMap` — Map PCF with hydrant pins (NFPA 291 colors), pre-plan pins, GCC fallback
  - `scrNotes` — incident note timeline + create form (type, priority, offline support)
  - `scrPatientTriage` — **EMS only**: triage buttons (START), PHI form, transport tracking
  - `scrPrePlan` — building info, fire protection badges, NFPA 704 hazards, emergency contact
  - `scrSettings` — profile, GPS toggle (persisted), sync status, app info
- **2 new environment variables** (`solution/environment-variables.json`):
  - `seo_GPSUpdateIntervalSeconds` (default: "30")
  - `seo_OfflineSyncIntervalMinutes` (default: "5")
- **3 new ADRs** in TECHNICAL.md:
  - ADR-013: Offline-First Mobile Architecture (Server Wins)
  - ADR-014: GCC Map Fallback (PCF + native device maps)
  - ADR-015: Phone Layout (one-hand use, 44px touch targets, dark theme)
- **TECHNICAL.md updated** with Canvas App section
- **USER-GUIDE.md updated** with complete "For Responders" walkthrough

### Key Design Decisions
- Single app for both roles — Patient Triage screen gated by role check (gblIsEMSProvider)
- PHI contained to one screen (scrPatientTriage) with UI gate + field security double protection
- Offline-first with Server Wins — dispatch changes take priority on sync conflict
- GPS captured on every status change + periodic timer updates (configurable interval)
- Dark high-contrast theme for outdoor/nighttime visibility, WCAG AA compliant
- Map uses NFPA 291 hydrant color coding: Red (<500), Orange (500-999), Green (1000-1499), Blue (1500+ GPM)
- Dispatched status omitted from status buttons — responders don't self-dispatch
- All interactive controls ≥ 44px touch target for gloved use

### Breaking Changes
None (additive — new app specs and environment variables).

### Dependencies
- v0.3.0 (flows must be in place — app actions trigger UnitStatusChangeLog, PatientCountSync)
- v0.2.0 (security roles and PHI profile must be configured)
- v0.1.0 (data model must be deployed)
- Device location permission for GPS features
- GCC environment with Dataverse offline mode enabled

---

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
