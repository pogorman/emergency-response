# Prompt Log

Running log of all prompts and actions taken. Append-only — never overwrite previous entries.

---

## 2026-02-18 — Session 1: Project Bootstrap + Phase 1 Kickoff

**Prompt Summary:** Set up documentation standards, project scaffolding, CLAUDE.md, and build the complete Phase 1 data model for EmergencyResponseCoordination (Power Platform / Dataverse, GCC). Phased approach defined (Phases 1-7). Data model covers: call/incident intake, dispatch/unit assignment, ICS command structure, EMS workflow, mutual aid, after-action reporting.

**Actions Taken:**
- Initialized git repository
- Created `/docs` directory
- Created `CLAUDE.md` at project root with solution identity, phased plan, documentation standards, conventions
- Created `docs/PROMPT-LOG.md` (this file)
- Created `docs/RELEASE-NOTES.md` with v0.1.0 skeleton
- Created `docs/TECHNICAL.md` with full data model, data dictionary, ERD, architecture decisions
- Created `docs/USER-GUIDE.md` skeleton
- Created `docs/SESSION-MEMORY.md` with current project state
- Created `datamodel/` directory with table definition files (JSON schema per table)
- Created `datamodel/choices/` with all choice/option-set definitions
- Created `solution/` directory with solution.xml, environment variables, connection references
- Designed 20+ entity data model covering all six operational domains
- Documented complete data dictionary and Mermaid ERD in TECHNICAL.md

## 2026-02-18 — Session 2: Phase 2 — Security Model + Roles

**Prompt Summary:** Implement Phase 2 security model. Create 8 security role definitions, PHI field security profile, business unit structure, team definitions, privilege matrix, and update all documentation. Add session duration tracking to SESSION-MEMORY.md.

**Actions Taken:**
- Created `security/roles/` directory with 8 role definition JSON files:
  - `seo_system-admin.json` — Organization-scope full CRUD
  - `seo_dispatch-supervisor.json` — BU-scope incident lifecycle management
  - `seo_dispatcher.json` — BU-scope call intake and unit dispatch
  - `seo_incident-commander.json` — BU-scope ICS command structure
  - `seo_responder.json` — User-scope with team sharing for incidents
  - `seo_ems-provider.json` — User-scope with PHI access via field security
  - `seo_station-officer.json` — BU-scope station management
  - `seo_read-only-analyst.json` — BU-scope read-only for reporting
- Created `security/field-security/seo_phi-profile.json` — column-level security for 7 PHI fields on PatientRecord
- Created `security/business-units.json` — BU hierarchy and provisioning process
- Created `security/teams.json` — owner teams per agency, cross-BU mutual aid team, access team pattern
- Created `security/privilege-matrix.md` — complete role × table × privilege grid (22 tables × 8 roles × 8 privileges)
- Updated `docs/TECHNICAL.md` — added Security Model section covering BU strategy, roles, column security, team sharing, RLS patterns, GCC compliance
- Updated `docs/RELEASE-NOTES.md` — added v0.2.0 entry
- Updated `docs/SESSION-MEMORY.md` — updated project state, added session duration tracking
- Updated `CLAUDE.md` — Phase 1 → COMPLETE, Phase 2 → COMPLETE

## 2026-02-18 — Session 3: Phase 3 — Power Automate Flow Definitions

**Prompt Summary:** Implement Phase 3 — create Power Automate flow specification files (JSON blueprints), flow definition schema, 5 new environment variables, 10 flow definitions across 2 tiers, and update all documentation.

**Actions Taken:**
- Created `flows/_schema/flow-definition-schema.json` — JSON Schema for flow definition validation
- Created `flows/README.md` — explains spec format, security contexts, circular trigger prevention, translation guide
- Added 5 new environment variables to `solution/environment-variables.json`:
  - `seo_MCIPatientThreshold` (default: "5")
  - `seo_MutualAidExpiryWarningDays` (default: "30")
  - `seo_DispatchSupervisorEmail` (default: "")
  - `seo_FlowErrorNotificationEmail` (default: "")
  - `seo_ServiceAccountUserId` (default: "")
- Created 5 Tier 1 flow definitions in `flows/tier-1/`:
  - `seo_unit-status-change-log.json` — Immutable UnitStatusLog on status change (ADR-003)
  - `seo_incident-status-progression.json` — Auto-advance status from timestamps
  - `seo_agency-onboarding.json` — Auto-provision BU + 4 owner teams on Agency create
  - `seo_mutual-aid-team-management.json` — Cross-BU team/access team management
  - `seo_incident-sharing.json` — Share incidents with agency teams on assignment
- Created 5 Tier 2 flow definitions in `flows/tier-2/`:
  - `seo_incident-assignment-auto-name.json` — Auto-name "Unit X - Incident Y"
  - `seo_after-action-report-creation.json` — Draft AAR on incident close
  - `seo_notify-dispatch-supervisor/seo_notify-mci-alarm.json` — MCI/alarm email
  - `seo_notify-dispatch-supervisor/seo_notify-mutual-aid-request.json` — Mutual aid status email
  - `seo_notify-dispatch-supervisor/seo_notify-command-transfer.json` — Command transfer email
  - `seo_patient-count-sync.json` — Patient count rollup + MCI auto-flag
  - `seo_mutual-aid-agreement-expiry.json` — Daily digest of expiring agreements
- Updated `docs/TECHNICAL.md` — added Power Automate Flows section, ADR-011 (flow security context), ADR-012 (notification architecture)
- Updated `docs/USER-GUIDE.md` — added Automated Workflows section
- Updated `docs/RELEASE-NOTES.md` — added v0.3.0 entry
- Updated `docs/SESSION-MEMORY.md` — updated project state, session log, key decisions
- Updated `CLAUDE.md` — Phase 3 → COMPLETE

## 2026-02-18 — Session 4: Phase 4 — Canvas App (Mobile Responder)

**Prompt Summary:** Implement Phase 4 — create canvas app specification files (JSON blueprints) for the Responder Mobile app. Single app for both Responder + EMSProvider roles. Phone layout. 8 screens, 3 reusable components, 2 new environment variables, canvas app definition schema, and full documentation updates.

**Actions Taken:**
- Created `apps/_schema/canvas-app-definition-schema.json` — JSON Schema for canvas app, screen, and component definitions
- Created `apps/README.md` — explains spec format, control naming, variable conventions, translation guide
- Created `apps/seo_responder-mobile/app-definition.json` — app-level config: 12 data sources, offline profile (Server Wins), dark high-contrast theme, 9 global variables, 8-screen navigation model, GCC constraints
- Created 3 reusable component definitions in `apps/seo_responder-mobile/components/`:
  - `navigation-bar.json` — bottom tab bar (4-5 tabs, role-conditional Patients tab)
  - `status-button-group.json` — 8 large status buttons with GPS capture on every change
  - `incident-card.json` — incident summary card with priority color band and MCI badge
- Created 8 screen definitions in `apps/seo_responder-mobile/screens/`:
  - `home-screen.json` — dashboard with status banner, active incident, GPS timer, connectivity indicator
  - `unit-status-screen.json` — full-screen status change with history timeline
  - `incident-detail-screen.json` — incident info, hazard banner, assigned units, ICS command, NFPA 704 hazards
  - `map-screen.json` — Map PCF control with hydrant pins (NFPA 291 colors), pre-plan pins, GCC fallback gallery
  - `notes-screen.json` — note timeline + create form with note type, priority flag, offline support
  - `patient-triage-screen.json` — EMS only: triage category buttons (START), PHI form, transport tracking, facility picker
  - `pre-plan-screen.json` — building info, fire protection badges, FDC location, NFPA 704 diamonds, emergency contact dialer
  - `settings-screen.json` — profile, GPS toggle with SaveData persistence, sync status, app info
- Added 2 new environment variables to `solution/environment-variables.json`:
  - `seo_GPSUpdateIntervalSeconds` (default: "30")
  - `seo_OfflineSyncIntervalMinutes` (default: "5")
- Updated `docs/TECHNICAL.md`:
  - Added Canvas App section (overview, screen inventory, components, data sources, offline architecture, PHI containment, flow interactions, GCC constraints)
  - Added ADR-013 (offline-first mobile architecture — Server Wins)
  - Added ADR-014 (GCC map fallback — PCF + Launch() to native maps)
  - Added ADR-015 (phone layout — one-hand use, 44px min touch targets, dark theme)
  - Updated environment variables table with 2 new variables
- Updated `docs/USER-GUIDE.md` — populated "For Responders" section with complete app walkthrough
- Updated `docs/RELEASE-NOTES.md` — added v0.4.0 entry
- Updated `docs/SESSION-MEMORY.md` — updated project state, session log, key decisions
- Updated `CLAUDE.md` — Phase 4 → COMPLETE
