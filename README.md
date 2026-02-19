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
│  │  10 Power Automate Flows  ·  12 Env Variables      │  │
│  │  4 Connection References  ·  1 Field Security Prof │  │
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
| 4 | Canvas app (mobile responder) | Pending |
| 5 | Model-driven app (dispatch/supervisor) | Pending |
| 6 | Power BI reporting layer | Pending |
| 7 | Deployment + GCC auth scripts | Pending |

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
│   └── privilege-matrix.md      # Complete role × table × privilege grid
├── flows/
│   ├── _schema/                 # Flow definition JSON Schema
│   ├── README.md                # Flow translation guide
│   ├── tier-1/                  # 5 must-have flow specs
│   └── tier-2/                  # 5 high-value flow specs
├── solution/
│   ├── solution.xml             # Solution manifest
│   ├── environment-variables.json
│   └── connection-references.json
└── docs/
    ├── TECHNICAL.md             # Architecture, data dictionary, ERD, security model
    ├── USER-GUIDE.md            # End-user documentation
    ├── RELEASE-NOTES.md         # Semver release notes
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

## Automated Workflows (Phase 3)

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
