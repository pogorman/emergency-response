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

## 2026-02-18 — Session 5: Phase 5 — Model-Driven App (Dispatch Console & Supervisor Dashboard)

**Prompt Summary:** Implement Phase 5 — create model-driven app specification files (JSON blueprints) for the Dispatch Console & Supervisor Dashboard. 4-area sitemap, 27 views, 19 forms, 4 dashboards, 1 BPF (incident lifecycle), 1 command bar customization (Declare MCI), 22 sample data files with 5 incident scenarios (~178 records), 1 new environment variable, MDA definition schema, and full documentation updates.

**Actions Taken:**
- Created `model-driven-apps/_schema/mda-definition-schema.json` — JSON Schema for sitemap, views, forms, dashboards, BPF, and command bar specs
- Created `model-driven-apps/README.md` — spec format explanation and translation guide to Power Apps maker portal
- Created `model-driven-apps/seo_dispatch-console/app-definition.json` — app config, 6 security roles, feature flags, role-area mapping
- Created `model-driven-apps/seo_dispatch-console/sitemap.json` — 4-area sitemap (Dispatch Operations, ICS Command, Planning, Administration)
- Created 13 view definition files in `model-driven-apps/seo_dispatch-console/views/`:
  - `incident-views.json` — 4 views (Active, My Agency, MCI, Closed last 30d)
  - `call-views.json` — 3 views (Open, Today's, Unassigned)
  - `unit-views.json` — 3 views (All by Status, Available, Out of Service)
  - `incident-assignment-views.json` — 2 views (By Incident, Active)
  - `unit-status-log-views.json` — 2 views (By Unit, By Incident)
  - `incident-command-views.json` — 1 view (Active Commands)
  - `incident-note-views.json` — 2 views (By Incident, Priority)
  - `patient-record-views.json` — 2 views (By Incident, Transport Tracking) — NO PHI columns
  - `pre-plan-views.json` — 2 views (All, With Hazards)
  - `mutual-aid-agreement-views.json` — 2 views (Active, Expiring Soon)
  - `mutual-aid-request-views.json` — 1 view (Active Requests)
  - `after-action-report-views.json` — 2 views (Draft, Completed)
  - `personnel-views.json` — 2 views (Agency Personnel, By Rank)
- Created 14 form definition files in `model-driven-apps/seo_dispatch-console/forms/`:
  - `incident-forms.json` — Main (5 tabs: Details, Dispatch, ICS, Patients, Timeline) + Quick Create
  - `call-forms.json` — Main (3 tabs: Caller Info, Nature/Location, Disposition) + Quick Create
  - `unit-form.json` — Main (2 tabs: Unit Info, History)
  - `incident-assignment-forms.json` — Main + Quick Create
  - `incident-command-form.json` — Main (2 tabs: Command, Divisions)
  - `division-form.json` — Quick Create
  - `resource-request-forms.json` — Main + Quick Create
  - `incident-note-form.json` — Quick Create
  - `patient-record-form.json` — Main (3 tabs: Triage, Patient Info PHI, Transport) — PHI tab restricted
  - `mutual-aid-agreement-form.json` — Main (3 tabs: Agreement, Cost Sharing, Related Requests)
  - `mutual-aid-request-forms.json` — Main (3 tabs) + Quick Create
  - `after-action-report-form.json` — Main (3 tabs: Report, Details, Lessons Learned)
  - `pre-plan-form.json` — Main (4 tabs: Building, Fire Protection, Tactical, Linked Incidents)
  - `personnel-form.json` — Main (2 tabs: Personnel Info, History)
- Created 4 dashboard definitions in `model-driven-apps/seo_dispatch-console/dashboards/`:
  - `dispatch-operations-dashboard.json` — Active Incidents, Unit Status pie chart, Open Calls, Status Changes stream
  - `supervisor-overview-dashboard.json` — MCI Incidents, Mutual Aid Requests, Agency Unit Counts bar chart, Alarm Level chart
  - `ics-command-dashboard.json` — Active Commands, Assignments, Resource Requests, Notes stream
  - `station-dashboard.json` — Station Units, Personnel Roster, Draft AARs, Pre-Plans
- Created `model-driven-apps/seo_dispatch-console/business-process-flows/incident-lifecycle-bpf.json` — 6-stage BPF with gates
- Created `model-driven-apps/seo_dispatch-console/command-bar/incident-command-bar.json` — Declare MCI button
- Created 22 sample data files in `sample-data/`:
  - `agencies.json` (3), `jurisdictions.json` (3), `facilities.json` (8), `stations.json` (6), `apparatus.json` (12)
  - `personnel.json` (18), `units.json` (8), `pre-plans.json` (4), `hazards.json` (6), `hydrants.json` (15)
  - `incidents.json` (5), `calls.json` (5), `incident-assignments.json` (15), `incident-commands.json` (3)
  - `divisions.json` (4), `resource-requests.json` (3), `incident-notes.json` (12), `patient-records.json` (8)
  - `transports.json` (3 reference), `mutual-aid-agreements.json` (2), `mutual-aid-requests.json` (2), `after-action-reports.json` (2)
  - `unit-status-logs.json` (~40)
- Created `sample-data/README.md` — import order, scenario descriptions, symbolic reference resolution, record counts
- Added 1 new environment variable to `solution/environment-variables.json`: `seo_DefaultDashboardId`
- Updated `docs/TECHNICAL.md`:
  - Added Model-Driven App section (overview, sitemap, role mapping, view/form/dashboard inventories, BPF, command bar, PHI containment, sample data)
  - Added ADR-016 (MDA vs Canvas split), ADR-017 (BPF for incident lifecycle), ADR-018 (sample data strategy)
  - Updated environment variables table with new variable
- Updated `docs/USER-GUIDE.md`:
  - Updated Getting Started section with two-app overview and access instructions
  - Populated "For Dispatchers" section (call intake, incident creation, dispatching, BPF walkthrough, MCI, views, dashboard)
  - Populated "For Supervisors / ICs" section (supervisor dashboard, MCI management, mutual aid, email alerts, ICS command, resource requests, station officer workflows)
  - Populated "For Administrators" section (agency onboarding, security roles, PHI access, env vars, station/apparatus/personnel management)
- Updated `docs/RELEASE-NOTES.md` — added v0.5.0
- Updated `docs/SESSION-MEMORY.md` — updated project state
- Updated `CLAUDE.md` — Phase 5 → COMPLETE
