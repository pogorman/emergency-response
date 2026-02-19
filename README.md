# EmergencyResponseCoordination

> Integrated incident management for fire and EMS agencies on Microsoft Power Platform (GCC)

**Publisher:** StateEmergencyOps | **Prefix:** `seo` | **Platform:** Dataverse (GCC)

---

## What Is This

A complete Power Platform solution for state, city, and local fire/EMS jurisdictions to manage the full lifecycle of emergency incidents — call intake, dispatch, ICS command, EMS patient care, mutual aid coordination, and after-action reporting. Built for multi-agency shared environments with per-agency data isolation via Dataverse Business Units.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    GCC Dataverse                          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │       EmergencyResponseCoordination Solution        │  │
│  │                                                    │  │
│  │  22 Tables  ·  15 Choice Sets  ·  8 Security Roles │  │
│  │  10 Power Automate Flows  ·  18 Env Variables      │  │
│  │  5 Connection References  ·  1 Field Security Prof │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Canvas App (Phase 4)  ·  Model-Driven App (Phase 5)    │
│  Power BI Reports (Phase 6)  ·  GCC Deploy (Phase 7)   │
└──────────────────────────────────────────────────────────┘
```

## Phased Build Plan

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Data model (22 tables, choices, ERD) | **Complete** |
| 2 | Security model (8 roles, BU structure, PHI protection) | **Complete** |
| 3 | Power Automate flows (10 flow specs, 2 tiers) | **Complete** |
| 4 | Canvas app (mobile responder) | **Complete** |
| 5 | Model-driven app (dispatch/supervisor) | **Complete** |
| 6 | Power BI reporting layer | **Complete** |
| 7 | Deployment + GCC auth scripts | **Complete** |

## Deployment

### Solution .zip Generator

The generator reads JSON spec files and outputs a valid Dataverse unmanaged solution .zip:

```bash
cd scripts && npm install
npx tsx generate-solution.ts              # with solution checker
npx tsx generate-solution.ts --skip-check  # without checker
```

Output: `EmergencyResponseCoordination.zip` — import via make.powerapps.com or pac CLI:

```bash
pac auth create --name "GCC-Dev" --cloud UsGov \
  --environment https://your-org.crm9.dynamics.com --deviceCode
pac solution import --path EmergencyResponseCoordination.zip --publish-changes --async
```

### Post-Import Steps
1. **Environment variables** — create 18 env vars manually (not in solution .zip, see `solution/environment-variables.json`)
2. **Calculated fields** — configure `seo_responseTimeMinutes` and `seo_totalDurationMinutes` formulas
3. **Security roles** — create 8 roles per security specs
4. **PHI field security** — configure `seo_PHIAccess` profile on PatientRecord

### Dataverse XML Lessons Learned
See [`docs/DATAVERSE-SOLUTION-XML-GUIDE.md`](docs/DATAVERSE-SOLUTION-XML-GUIDE.md) for 19 documented issues and resolutions from the initial GCC deployment.

## Repository Structure

```
├── CLAUDE.md                    # Project instructions for Claude Code
├── README.md                    # This file
├── datamodel/
│   ├── tables/                  # 22 table definitions (JSON)
│   └── choices/                 # Global choice/option-set definitions
├── security/
│   ├── roles/                   # 8 security role definitions
│   ├── field-security/          # PHI column-level security profile
│   ├── business-units.json      # BU hierarchy and provisioning
│   ├── teams.json               # Owner teams, access teams, mutual aid
│   └── privilege-matrix.md      # Complete role x table x privilege grid
├── flows/
│   ├── _schema/                 # Flow definition JSON Schema
│   ├── README.md                # Flow translation guide
│   ├── tier-1/                  # 5 must-have flow specs
│   └── tier-2/                  # 5 high-value flow specs
├── apps/
│   ├── _schema/                 # Canvas app JSON Schema
│   └── seo_responder-mobile/    # 8 screens, 3 components
├── model-driven-apps/
│   ├── _schema/                 # MDA JSON Schema
│   └── seo_dispatch-console/    # Views, forms, dashboards, BPF
├── reporting/
│   ├── _schema/                 # Report definition JSON Schema
│   ├── datasets/                # 5 star-schema datasets
│   ├── reports/                 # 8 report definitions (~33 pages)
│   ├── measures/                # 14 shared DAX measures
│   └── rls/                     # Row-level security definition
├── deployment/
│   ├── config/                  # Dev/Test/Prod environment configs
│   ├── scripts/                 # 21 TypeScript deployment scripts
│   ├── ci-cd/                   # 4 GitHub Actions workflows
│   └── docs/                    # Deployment, GCC setup, rollback guides
├── scripts/
│   ├── generate-solution.ts     # Solution .zip generator
│   ├── provision-dev.ts         # Direct Web API provisioning
│   └── lib/                     # Shared libraries (auth, spec-reader, metadata)
├── sample-data/                 # 22 sample data files (~178 records)
├── solution/
│   ├── solution.xml             # Solution manifest
│   ├── environment-variables.json
│   └── connection-references.json
└── docs/
    ├── TECHNICAL.md             # Architecture, data dictionary, ERD, security
    ├── USER-GUIDE.md            # End-user documentation
    ├── RELEASE-NOTES.md         # Semver release notes
    ├── DATAVERSE-SOLUTION-XML-GUIDE.md  # 19 XML format lessons learned
    ├── PROMPT-LOG.md            # Build session log
    └── SESSION-MEMORY.md        # Claude session state
```

## Key Design Decisions

- **Multi-agency isolation** — each agency = 1 Dataverse Business Unit for automatic row-level security
- **22-table data model** across 8 operational domains (Core, Dispatch, ICS, EMS, Mutual Aid, After-Action, Planning, Call/Incident)
- **PHI protection** — 7 columns on PatientRecord secured via field security profile; only EMSProvider + SystemAdmin can access
- **Immutable audit trail** — UnitStatusLog is append-only (no update/delete for non-admin roles)
- **10 automated flows** — from unit status logging to MCI auto-detection to daily agreement expiry digests
- **No PHI in flows** — all 10 flows verified to never read or write PHI columns
- **GCC-first** — designed for FedRAMP High, US data residency, authorized connectors only
- **Solution .zip generator** — TypeScript script reads JSON specs and outputs importable Dataverse solution

## Data Model Highlights

| Domain | Key Tables |
|--------|-----------|
| Core | Agency, Jurisdiction, Facility |
| Call/Incident | Call, Incident (with response time calculations) |
| Dispatch | Unit, Apparatus, Station, Personnel, IncidentAssignment, UnitStatusLog |
| ICS Command | IncidentCommand, Division, ResourceRequest, IncidentNote |
| EMS | PatientRecord (PHI-protected) |
| Mutual Aid | MutualAidAgreement, MutualAidRequest |
| Planning | PrePlan, Hazard, Hydrant |
| After-Action | AfterActionReport |

## Security Model

| Role | Scope | Description |
|------|-------|-------------|
| SystemAdmin | Organization | Full CRUD, BU/team management |
| DispatchSupervisor | Business Unit | Incident lifecycle, all units in BU |
| Dispatcher | Business Unit | Call intake, unit dispatch |
| IncidentCommander | Business Unit | ICS structure, divisions, resources |
| Responder | User + Team Share | Assigned incidents only |
| EMSProvider | User + Team Share | Patient records with PHI access |
| StationOfficer | Business Unit | Station management, AARs |
| ReadOnlyAnalyst | Business Unit | Read-only for reporting |

## Automated Workflows

| Tier | Flow | Trigger |
|------|------|---------|
| 1 | Unit Status Change Log | Unit status modified |
| 1 | Incident Status Progression | Incident timestamps set |
| 1 | Agency Onboarding | Agency created |
| 1 | Mutual Aid Team Management | Mutual aid request status changed |
| 1 | Incident Sharing | Assignment created |
| 2 | Assignment Auto-Name | Assignment created |
| 2 | After-Action Report Creation | Incident closed |
| 2 | Notify: MCI / Alarm Level | isMCI or alarmLevel changed |
| 2 | Notify: Mutual Aid Request | Request status changed |
| 2 | Notify: Command Transfer | Command record created |
| 2 | Patient Count Sync | Patient record created |
| 2 | Agreement Expiry Digest | Daily schedule |

## Documentation

| Document | Audience |
|----------|----------|
| [Technical](docs/TECHNICAL.md) | Developers, architects, Dataverse admins |
| [User Guide](docs/USER-GUIDE.md) | Dispatchers, responders, supervisors |
| [Release Notes](docs/RELEASE-NOTES.md) | All stakeholders |
| [Dataverse XML Guide](docs/DATAVERSE-SOLUTION-XML-GUIDE.md) | Solution builders |
| [Privilege Matrix](security/privilege-matrix.md) | Security reviewers |
| [Flow Specs](flows/README.md) | Flow builders, Power Automate developers |

## GCC Compliance

- FedRAMP High authorized environment
- All data at rest encrypted per GCC requirements
- US Government cloud data residency
- Azure AD (Entra ID) via GCC tenant — no external IdPs
- Only FedRAMP-authorized connectors (Dataverse, Outlook, SharePoint, O365 Users)
- HIPAA-compliant PHI handling via field security profiles + audit logging

## License

Proprietary — StateEmergencyOps
