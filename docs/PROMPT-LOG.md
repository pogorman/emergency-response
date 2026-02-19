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

## 2026-02-18 — Session 6: Phase 6 — Reporting / Power BI Layer

**Prompt Summary:** Implement Phase 6 — create Power BI reporting layer specification files (JSON blueprints). 5 star-schema datasets, 8 reports (~33 pages), shared DAX measures, RLS definition, report definition JSON Schema, 3 new environment variables, 1 new connection reference, and full documentation updates including 5 ADRs.

**Actions Taken:**
- Created `reporting/_schema/report-definition-schema.json` — JSON Schema for dataset, report, page, visual, measure, RLS, and refresh specs
- Created `reporting/README.md` — spec format, translation guide (spec → Power BI Desktop / Service), GCC constraints, PHI compliance policy, RLS strategy, refresh strategy
- Created 5 dataset definitions in `reporting/datasets/`:
  - `incident-analytics.json` — seo_Incident fact + Agency, Jurisdiction, Station, Call, Date dimensions
  - `unit-operations.json` — seo_UnitStatusLog fact + Unit, Apparatus, Station, Agency, Incident, Date dimensions
  - `ems-operations.json` — seo_PatientRecord (de-identified, zero PHI) + Incident, Facility, Unit, Agency, Date dimensions
  - `mutual-aid-cost.json` — seo_MutualAidRequest fact + Agreement, Agency (role-playing requesting/providing), Incident, Date dimensions
  - `outcomes-after-action.json` — seo_AfterActionReport fact + Incident, Agency, Date dimensions
- Created `reporting/measures/shared-measures.json` — 14 shared DAX measures (response time, NFPA compliance, volume, EMS, loss, cost)
- Created `reporting/rls/agency-rls.json` — dynamic RLS with AgencyUserMapping table, 2 roles (Agency Filter, All Agencies), 4 Dataverse-to-RLS role mappings
- Created 8 report definitions in `reporting/reports/`:
  - `response-performance.json` — 4 pages: overview KPIs, turnout vs travel, time-of-day heatmap, agency comparison
  - `incident-operations.json` — 5 pages: volume overview, type distribution, priority & MCI, geographic view, drillthrough
  - `unit-utilization.json` — 4 pages: availability, workload, status breakdown, out-of-service tracking
  - `ems-analytics.json` — 4 pages: triage overview, transport metrics, facility destinations, MCI patient breakdown
  - `mutual-aid-cost.json` — 3 pages: request overview, cost analysis, agreement status
  - `executive-summary.json` — 5 pages: KPI dashboard, agency comparison, YoY trends, top-10 analysis, NFPA compliance
  - `station-management.json` — 4 pages: station workload, apparatus utilization, personnel coverage, inspection status
  - `after-action-outcomes.json` — 4 pages: loss overview, cause analysis, injury/fatality trends, AAR completion
- Added 3 new environment variables to `solution/environment-variables.json`:
  - `seo_PowerBIWorkspaceId` (default: "")
  - `seo_PowerBIDatasetRefreshHours` (default: "4")
  - `seo_NFPAResponseTimeBenchmarkMinutes` (default: "6.33")
- Added 1 new connection reference to `solution/connection-references.json`:
  - `seo_PowerBIConnection` (shared_powerbi, required: false)
- Updated `docs/TECHNICAL.md`:
  - Added Reporting / Power BI Layer section (overview, datasets, reports, measures, RLS, PHI compliance, role access matrix)
  - Added ADR-019 (Import mode), ADR-020 (PHI exclusion), ADR-021 (RLS strategy), ADR-022 (GCC constraints), ADR-023 (Power BI vs MDA)
  - Updated environment variables table with 3 new variables
  - Updated connection references table with Power BI connection
- Updated `docs/USER-GUIDE.md`:
  - Added "For Analysts / Report Consumers" section (report inventory, access instructions, RLS, key metrics, data freshness, PHI policy)
  - Updated table of contents and audience line
- Updated `docs/RELEASE-NOTES.md` — added v0.6.0
- Updated `docs/SESSION-MEMORY.md` — updated project state, session log, key decisions
- Updated `CLAUDE.md` — Phase 6 → COMPLETE

## 2026-02-18 — Session 7: Phase 7 — Deployment + GCC Auth Scripts

**Prompt Summary:** Implement Phase 7 — create TypeScript deployment automation scripts for GCC Dataverse environments. 7-step deployment pipeline, 3 rollback scripts, 2 validation scripts, environment configs (Dev/Test/Prod), 4 GitHub Actions CI/CD workflows, deployment documentation, 4 new ADRs, and full documentation updates.

**Actions Taken:**
- Created `deployment/_schema/deployment-definition-schema.json` — JSON Schema for environment config validation with PHI guard for Production
- Created `deployment/README.md` — translation guide, GCC endpoint strategy, compliance matrix, quick start
- Created `deployment/scripts/package.json` — npm deps (@azure/identity 4.7.0, ajv 8.17.1, tsx 4.19.3, typescript 5.7.3)
- Created `deployment/scripts/tsconfig.json` — strict TypeScript config (ES2022, Node16)
- Created 3 type files in `deployment/scripts/src/types/`:
  - `environment-config.ts` — config interfaces, GCC endpoint map, env var/conn ref constants
  - `deployment-context.ts` — shared context, endpoint resolution, context factory
  - `dataverse-api.ts` — Dataverse Web API response types (30+ interfaces)
- Created 5 utility files in `deployment/scripts/src/utils/`:
  - `logger.ts` — structured logging [STEP] [LEVEL] [timestamp] with colors
  - `pac-wrapper.ts` — typed pac CLI wrapper (auth, org, solution, publish)
  - `dataverse-client.ts` — MSAL auth via @azure/identity, Dataverse Web API CRUD
  - `config-loader.ts` — JSON Schema validation, endpoint consistency check, PHI guard
  - `ref-resolver.ts` — @ref: resolution, entity set map, import order (1-22), circular refs
- Created 2 validation scripts in `deployment/scripts/src/validate/`:
  - `validate-specs.ts` — validates all Phase 1-6 JSON specs against their schemas
  - `validate-gcc.ts` — 12-point GCC compliance checker with commercial endpoint scanner
- Created `deployment/config/environments.schema.json` — IDE auto-completion schema
- Created 3 environment config templates:
  - `dev.json` — Sandbox, Unmanaged, sample data + PHI, 3 agencies
  - `test.json` — Sandbox, Managed, sample data + PHI, 3 agencies
  - `prod.json` — Production, Managed, no sample data, PHI blocked, empty agencies
- Created 7 deployment step scripts in `deployment/scripts/src/deploy/`:
  - `01-environment-setup.ts` — pac auth + WhoAmI verification
  - `02-solution-import.ts` — backup existing + import with pac
  - `03-environment-variables.ts` — query definitions + create/update values
  - `04-connection-references.ts` — query refs + bind connection IDs
  - `05-security-provision.ts` — create BUs, 4 teams per agency, Mutual Aid Partners, role assignment
  - `06-sample-data-import.ts` — 22-file import with @ref: resolution, two-pass circular FK, PHI hard block
  - `07-powerbi-setup.ts` — workspace verification, refresh config, RLS instructions
- Created `deployment/scripts/src/deploy/deploy-all.ts` — orchestrator with --env, --dry-run, --skip-step, --verbose
- Created 3 rollback scripts in `deployment/scripts/src/rollback/`:
  - `rollback-solution.ts` — uninstall or restore from backup
  - `rollback-security.ts` — deactivate BUs/teams with orphan warnings
  - `rollback-data.ts` — delete sample data in reverse order (dev/test only, prod blocked)
- Created `deployment/ci-cd/pipeline-config.json` — shared CI/CD settings
- Created 4 GitHub Actions workflows in `deployment/ci-cd/github-actions/`:
  - `validate-pr.yml` — PR validation (build, specs, GCC check)
  - `deploy-dev.yml` — auto-deploy to Dev on merge
  - `promote-test.yml` — manual + approval to Test
  - `promote-prod.yml` — manual + dual approval + DEPLOY-PROD confirmation to Prod
- Created 3 deployment docs in `deployment/docs/`:
  - `DEPLOYMENT.md` — prerequisites, runbook, verification checklist, troubleshooting
  - `GCC-SETUP.md` — tenant, Entra ID app reg, licenses, firewall, gateway, connections
  - `ROLLBACK.md` — decision framework, per-component rollback, post-rollback verification
- Updated `docs/TECHNICAL.md`:
  - Added Deployment Automation section (overview, pipeline, rollback, configs, compliance matrix, CI/CD, endpoint map)
  - Added ADR-024 (pac CLI + Web API), ADR-025 (interactive deployment), ADR-026 (GCC endpoints), ADR-027 (PHI prod guard)
- Updated `docs/USER-GUIDE.md` — added Deployment Scripts section for administrators
- Updated `docs/RELEASE-NOTES.md` — added v0.7.0
- Updated `docs/SESSION-MEMORY.md` — updated project state, session log, key decisions
- Updated `CLAUDE.md` — Phase 7 → COMPLETE

## 2026-02-18 — Session 8: Dev Provisioning Script (Direct Dataverse Web API)

**Prompt Summary:** Create a TypeScript provisioning script that reads the project's JSON spec files and creates everything (publisher, solution, global option sets, 22 tables with columns, ~35 lookup relationships, 18 environment variables, ~178 sample data records) in a live Dataverse dev environment via Web API Metadata endpoints and data APIs. Uses device-code auth (no app registration needed). Supports --dry-run, --skip-data, --commercial flags.

**Actions Taken:**
- Created `scripts/package.json` — npm project with @azure/identity 4.7.0, tsx 4.19.3, exact versions
- Created `scripts/tsconfig.json` — ES2022, strict, bundler module resolution
- Created `scripts/lib/auth.ts` — Device-code auth via DeviceCodeCredential, GCC + commercial endpoints, returns DataverseClient with auto-token fetch wrapper
- Created `scripts/lib/spec-reader.ts` — Reads all JSON specs (15 global choices, 22 tables, 18 env vars, 22 sample data files), returns typed ProjectSpecs
- Created `scripts/lib/metadata.ts` (~380 lines) — Dataverse Metadata API helpers:
  - whoAmI, ensurePublisher, ensureSolution (idempotent create-or-find)
  - createGlobalOptionSet (OptionSetMetadata with check-first)
  - buildColumnMetadata (13 type mappings: String→StringAttributeMetadata, Memo→MemoAttributeMetadata, etc.)
  - createTable (entity with primary name column only)
  - createTableColumns (non-lookup, non-calculated columns)
  - createRelationship (OneToManyRelationshipMetadata with CascadeConfiguration)
  - setAutoNumberFormat (PATCH after creation)
  - addComponentToSolution (AddSolutionComponent action)
  - createEnvironmentVariable (definition + value)
  - getEntitySetNames (query for data API URLs)
  - publishAll (PublishAllXml)
- Created `scripts/lib/data-loader.ts` (~290 lines) — Sample data import:
  - IMPORT_ORDER: 22 entities in FK dependency order
  - FIELD_ALIASES: maps sample data field mismatches (seo_gpsLatitude→seo_latitude, etc.)
  - CHOICE_LABEL_ALIASES: maps short labels to full option labels (Priority 1→Priority 1 — Immediate Life Threat, etc.)
  - resolveChoiceValue: exact → prefix → contains fuzzy matching
  - importSampleData: two-pass (create records, then PATCH deferred lookups for circular refs)
  - Handles @ref: symbolic FK resolution, array→CSV conversion, null skipping
- Created `scripts/provision-dev.ts` (~182 lines) — CLI orchestrator:
  - 14-step execution: read specs → auth → WhoAmI → publisher → solution → global option sets → tables → columns → relationships → AutoNumber → solution components → env vars → PublishAllXml → sample data
  - Flags: --url, --tenant-id, --dry-run, --skip-data, --commercial
- Fixed orphaned Lookup columns: Step 9 rewritten to iterate ALL Lookup columns (not just explicit N:1 relationships), since some table specs define Lookup columns without matching N:1 entries
- Fixed misleading variable name: `unresolvedDeferred` → `readyDeferred`
- Verified TypeScript compilation (tsc --noEmit, zero errors)
- Verified spec reader loads all specs correctly (15 choices, 22 tables, 18 env vars, 22 sample data files)
- Updated all documentation files (SESSION-MEMORY, PROMPT-LOG, RELEASE-NOTES, TECHNICAL, USER-GUIDE)

## 2026-02-18 — Session 9: Solution .zip Generator + GCC Deployment

**Prompt Summary:** Generate a valid Dataverse unmanaged solution .zip from JSON specs and import it to GCC Dataverse. Debugged 19 XML format issues through iterative import attempts. Used CaseManagement reference solution from Downloads as authoritative XML format guide.

**Actions Taken:**
- Created `scripts/generate-solution.ts` (~700 lines) — reads JSON specs via `lib/spec-reader.ts`, generates 3 XML files (`[Content_Types].xml`, `solution.xml`, `customizations.xml`), zips with PowerShell
- Authenticated pac CLI to GCC: `pac auth create --cloud UsGov --deviceCode`
- Ran solution checker: `pac solution check --geo USGovernment` — 0 issues
- Debugged 19 XML format issues through iterative import/fix cycles:
  - Entity `<Name>` must contain logical name as text content (not child elements)
  - `<ObjectTypeCode>` must be omitted for new entities (0 is invalid)
  - Every `<attribute>` needs `<Name>` child element
  - `OrgOwned` not `OrganizationOwned` for OwnershipTypeMask
  - `<LocalizedCollectionName>` not `<LocalizedName>` inside `<LocalizedCollectionNames>`
  - `<EntitySetName>` required after `<attributes>`
  - `<HasRelatedNotes>True</HasRelatedNotes>` not `<HasNotes>1</HasNotes>`
  - Format values lowercase: `text`, `datetime`, `date`, `none`
  - Extensive entity and attribute properties required (Is*, CanModify*, CanCreate*)
  - customizations.xml root attributes differ from solution.xml
  - Required empty sections: `<Roles>`, `<Workflows>`, `<FieldSecurityProfiles>`, etc.
  - Environment variables cause generic "Unexpected Error" in GCC — removed
  - Relationships must be in root-level `<EntityRelationships>`, not inside entities
  - Global option set name collision with column names — converted to local inline option sets
  - Column name collision with auto-generated primary key — auto-rename detection
  - Boolean columns need full option set structure with bit OptionSetType
  - Publisher address fields use explicit close tags
  - GCC auth requires `--cloud UsGov`, solution checker requires `--geo USGovernment`
- Used CaseManagement_1_0_7.zip from Downloads as reference for correct XML format
- Tested with minimal 1-entity solution before full 22-entity generation
- **Successfully imported** solution to GCC Dataverse: 22 tables, 276 columns, 53 relationships
- Solution published with `--publish-changes`

## 2026-02-18 — Session 10: Documentation Update

**Prompt Summary:** Document all Dataverse XML issues and update all project documentation (MEMORY.md, CLAUDE.md, README, SESSION-MEMORY, PROMPT-LOG, RELEASE-NOTES) for future reference and reproducibility.

**Actions Taken:**
- Created `docs/DATAVERSE-SOLUTION-XML-GUIDE.md` — 19 documented issues with root causes, error messages, and XML examples
- Updated `MEMORY.md` with Dataverse patterns, deployment state, and key patterns for future projects
- Updated `CLAUDE.md` with Solution Generator section and known limitations
- Updated `README.md` — all phases marked Complete, added Deployment section with generator instructions, post-import steps, repo structure updated with new directories
- Updated `docs/SESSION-MEMORY.md` — session 9+10 logged, deployment state documented, GCC environment details, next steps
- Updated `docs/PROMPT-LOG.md` — sessions 9+10 logged
- Updated `docs/RELEASE-NOTES.md` — v0.9.0 entry for solution generator + GCC deployment

## 2026-02-19 — Session 11: Views + Forms in Solution Generator

**Prompt Summary:** Extend the solution .zip generator to include custom views (28 views from 13 spec files) and forms (19 forms from 14 spec files) in the generated Dataverse solution. Views generate `<SavedQueries>` XML with FetchXML filters and layoutxml columns. Forms generate `<FormXml>` XML with tabs, sections, fields, subgrids, headers, and footers.

**Actions Taken:**
- Extended `scripts/lib/spec-reader.ts`:
  - Added 12 new TypeScript interfaces: `ViewColumn`, `ViewFilterCondition`, `ViewFilter`, `ViewSortOrder`, `ViewDef`, `FormField`, `SubgridDef`, `FormSection`, `FormTab`, `FormDef`
  - Added `readViewSpecs()` — loads 13 JSON files from `model-driven-apps/seo_dispatch-console/views/`
  - Added `readFormSpecs()` — loads 14 JSON files from `model-driven-apps/seo_dispatch-console/forms/`
  - Extended `ProjectSpecs` with `views: Map<string, ViewDef[]>` and `forms: Map<string, FormDef[]>`
- Extended `scripts/generate-solution.ts` (~700 → ~1050 lines):
  - Added `deterministicGuid(seed)` — MD5-based GUID for idempotent re-imports
  - Added `buildChoiceValueMap()` — 3-level Map resolving choice labels to numeric values
  - Added `generateSavedQueriesXml()` — `<SavedQueries>` with fetchxml, layoutxml, sort, filters
  - Added `generateFetchFilterXml()` — handles eq, not-in, in, null, not-null, today, last-x-days, eq-businessid, on-or-before, on-or-after operators
  - Added `generateFormXmlBlock()` — wraps main + quick create forms in `<FormXml>`
  - Added `generateSystemFormXml()` — main forms with tabs, header, footer
  - Added `generateQuickCreateFormXml()` — quick create with single wrapper tab
  - Added `generateSectionXml()` — multi-column layout with subgrids
  - Added `generateFieldCellXml()` — field cells with label resolution from table defs
  - Added `generateSubgridCellXml()` — subgrid cells with relationship parameters
  - Added control ClassIDs: Standard, Lookup, Subgrid
  - Modified `generateEntityXml()` to insert FormXml + SavedQueries after `</EntityInfo>`
  - Sets `IsQuickCreateEnabled=1` for entities with quick create form specs
- Verified output: 22 tables, 276 columns, 53 relationships, 28 views, 19 forms
- Extracted zip and verified XML structure for views (fetchxml filters, layoutxml) and forms (tabs, sections, cells, subgrids)
- Linked entity filters (e.g., `seo_incidentId.seo_status` in call-views.json) skipped with warning — requires manual post-import configuration
- Updated all documentation files, committed, and pushed
