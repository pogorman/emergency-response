# Release Notes

## v0.5.0 — Phase 5: Model-Driven App — Dispatch Console & Supervisor Dashboard (2026-02-18)

### Summary
Complete model-driven app specification for the Dispatch Console & Supervisor Dashboard. 4-area sitemap, 27 views, 19 forms, 4 dashboards, 1 business process flow (incident lifecycle), 1 command bar customization (Declare MCI), 22 sample data files with 5 realistic incident scenarios (~178 records), and a JSON schema for MDA specs. Desktop/tablet complement to the Responder Mobile canvas app.

### What's Included
- **MDA definition schema** (`model-driven-apps/_schema/mda-definition-schema.json`):
  - JSON Schema for sitemap, views, forms, dashboards, BPF, and command bar definitions
- **MDA README** (`model-driven-apps/README.md`):
  - Spec format, translation guide to Power Apps maker portal
- **App definition** (`model-driven-apps/seo_dispatch-console/app-definition.json`):
  - 6 security roles mapped, Unified Interface, role-area mapping
- **Sitemap** (`model-driven-apps/seo_dispatch-console/sitemap.json`):
  - 4 areas: Dispatch Operations, ICS Command, Planning, Administration
- **27 views** across 13 files (`views/`):
  - Incident (4), Call (3), Unit (3), Assignment (2), Status Log (2), Command (1), Note (2), Patient (2, no PHI), Pre-Plan (2), Mutual Aid Agreement (2), Mutual Aid Request (1), AAR (2), Personnel (2)
- **19 forms** across 14 files (`forms/`):
  - Main forms with tabs, sections, subgrids, business rules
  - Quick Create forms for rapid data entry
  - PatientRecord form with PHI-restricted tab (EMSProvider + SystemAdmin only)
  - Incident form with 5 tabs, MCI alert business rule, locked-when-closed rule
- **4 dashboards** (`dashboards/`):
  - Dispatch Operations (dispatcher), Supervisor Overview (supervisor), ICS Command (IC), Station (station officer)
- **Business Process Flow** (`business-process-flows/incident-lifecycle-bpf.json`):
  - 6 stages: Reported → Dispatched → On Scene → Under Control → Cleared → Closed
  - Stage gates: ≥1 assignment for Dispatched, all assignments cleared for Cleared
- **Command bar** (`command-bar/incident-command-bar.json`):
  - "Declare MCI" button with role/field visibility rules and confirmation dialog
- **22 sample data files** (`sample-data/`):
  - 3 agencies, 3 jurisdictions, 6 stations, 12 apparatus, 18 personnel, 8 units
  - 8 facilities, 4 pre-plans, 6 hazards, 15 hydrants
  - 5 incidents, 5 calls, 15 assignments, 3 commands, 4 divisions, 3 resource requests
  - 12 notes, 8 patients (with PHI), 2 mutual aid agreements, 2 requests, 2 AARs, ~40 status logs
- **Sample data README** (`sample-data/README.md`):
  - Import order (FK dependency chain), scenario descriptions, symbolic reference format
- **1 new environment variable** (`solution/environment-variables.json`):
  - `seo_DefaultDashboardId` (default: "")
- **3 new ADRs** in TECHNICAL.md:
  - ADR-016: Model-Driven App for Dispatch, Canvas App for Field
  - ADR-017: Business Process Flow for Incident Lifecycle
  - ADR-018: Sample Data Strategy
- **TECHNICAL.md updated** with Model-Driven App section
- **USER-GUIDE.md updated** with For Dispatchers, For Supervisors / ICs, For Administrators sections

### 5 Sample Data Scenarios
1. **Structure Fire (On Scene)** — 3-alarm, 4 units, ICS with 2 divisions, mutual aid, pre-plan linked
2. **MCI / MVA (Dispatched)** — 7 patients, mutual aid requested, unified command
3. **Hazmat Spill (Under Control)** — chlorine release, hot/decon zones, resource request
4. **Medical Emergency (Cleared)** — single ALS unit, STEMI patient transported
5. **Brush Fire (Closed)** — full lifecycle, completed AAR with lessons learned

### Key Design Decisions
- MDA for dispatch (data-heavy desktop), Canvas for field (mobile-optimized) — ADR-016
- 4-area sitemap mirrors operational workflow: dispatch → ICS → planning → admin
- BPF guides dispatchers through 6-stage incident lifecycle with stage gates — ADR-017
- PHI contained: PatientRecord views exclude PHI columns; form PHI tab restricted by field security
- "Declare MCI" command button gives supervisors manual override before patient threshold
- Sample data uses symbolic FK references for import flexibility — ADR-018
- ~178 records across all 22 tables ensures comprehensive demo coverage

### Breaking Changes
None (additive — new app specs, sample data, and environment variable).

### Dependencies
- v0.4.0 (canvas app specs for complete app ecosystem)
- v0.3.0 (flows — BPF coexists with IncidentStatusProgression flow)
- v0.2.0 (security roles — MDA roles must be configured)
- v0.1.0 (data model — all 22 tables must be deployed)

---

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
