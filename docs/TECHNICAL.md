# EmergencyResponseCoordination — Technical Documentation

> **Audience:** Developers, solution architects, Dataverse admins
> **Platform:** Microsoft Power Platform / Dataverse (GCC)
> **Publisher:** StateEmergencyOps | **Prefix:** seo

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Data Model — Entity Relationship Diagram](#data-model--entity-relationship-diagram)
4. [Data Dictionary](#data-dictionary)
5. [Global Choice (Option Set) Definitions](#global-choice-option-set-definitions)
6. [ALM & Deployment](#alm--deployment)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        GCC Dataverse                             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │           EmergencyResponseCoordination Solution            │ │
│  │                                                             │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
│  │  │  Tables   │ │ Choices  │ │ Security │ │  Env Vars /  │  │ │
│  │  │  (20+)   │ │ (Global) │ │  Roles   │ │  Conn Refs   │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Canvas App  │  │ Model-Driven │  │   Power Automate       │  │
│  │ (Responder) │  │ (Dispatch)   │  │   Flows                │  │
│  │ Phase 4     │  │ Phase 5      │  │   Phase 3              │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────┐  ┌─────────────────────────────────┐  │
│  │   Power BI Reports   │  │   GCC Auth / Deployment         │  │
│  │   Phase 6            │  │   Phase 7                       │  │
│  └──────────────────────┘  └─────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Operational Domains

| Domain | Tables | Description |
|--------|--------|-------------|
| **Core** | Agency, Jurisdiction, Facility | Organizational structure and reference data |
| **Call/Incident Intake** | Call, Incident | 911 calls and incident lifecycle management |
| **Dispatch** | Unit, Apparatus, Station, Personnel, IncidentAssignment, UnitStatusLog | Resource management and dispatch operations |
| **ICS Command** | IncidentCommand, Division, ResourceRequest, IncidentNote | Incident Command System structure and communications |
| **EMS** | PatientRecord | Patient care tracking (PHI-protected) |
| **Mutual Aid** | MutualAidAgreement, MutualAidRequest | Inter-agency resource sharing |
| **After-Action** | AfterActionReport | Post-incident analysis and reporting |
| **Planning** | PrePlan, Hazard, Hydrant | Pre-incident planning and reference data |

---

## Architecture Decisions

### ADR-001: Separate Call and Incident Entities
**Decision:** Calls and incidents are separate tables with a 1:N relationship.
**Rationale:** A single 911 call can generate multiple incidents (e.g., MVA with fire and EMS), and multiple calls can report the same incident. Separating them preserves the call intake workflow and enables duplicate-call detection.

### ADR-002: Unit as a Dispatchable Abstraction
**Decision:** Unit is an abstraction separate from Apparatus and Personnel.
**Rationale:** A "unit" in fire/EMS is a crew+apparatus combination that may change between shifts. Engine 1 today may be a different physical apparatus and crew than Engine 1 tomorrow. The Unit entity represents the dispatchable concept, with lookups to the current Apparatus and Personnel.

### ADR-003: UnitStatusLog as Append-Only Audit Trail
**Decision:** Every unit status change creates a new UnitStatusLog row rather than updating a history on the Unit table.
**Rationale:** Provides an immutable audit trail for response-time metrics, ISO accreditation, and legal documentation. The Unit table holds `currentStatus` for quick dispatch queries. Audit is disabled on UnitStatusLog since it IS the audit trail.

### ADR-004: IncidentAssignment as a Flexible Join Table
**Decision:** IncidentAssignment connects Incidents to Units AND/OR Personnel with ICS role and timestamps.
**Rationale:** An assignment can be a unit dispatch (Unit + Incident), a personnel ICS role (Personnel + Incident), or both. This supports both traditional dispatch ("send Engine 1") and ICS structure ("assign Captain Smith as Division A Supervisor").

### ADR-005: PHI Fields Flagged for Column-Level Security
**Decision:** PatientRecord columns containing Protected Health Information are flagged with `"phi": true` in the schema.
**Rationale:** HIPAA compliance requires field-level access control. In Phase 2 (Security), these fields will get Dataverse column-level security profiles restricting access to EMS personnel only.

### ADR-006: Hydrant Entity Included
**Decision:** Include seo_Hydrant as a separate entity.
**Rationale:** Hydrant locations are critical for fire pre-planning and on-scene water supply decisions. They'll display on the mobile app map (Phase 4) and link to pre-plans. Most agencies maintain hydrant data in GIS — we'll support bulk import. Audit disabled since this is reference data.

### ADR-007: Mutual Aid Agreement vs. Request Separation
**Decision:** Standing agreements (MutualAidAgreement) are separate from per-incident requests (MutualAidRequest).
**Rationale:** Agreements are administrative documents that exist independent of incidents (effective dates, terms, cost sharing). Requests are operational records tied to a specific incident. A request may or may not reference a standing agreement.

### ADR-008: ICS Command Structure as Separate Entities
**Decision:** IncidentCommand and Division are separate tables, not embedded in Incident.
**Rationale:** Enables command transfer tracking (multiple IC records per incident), division/group structure modeling, and proper ICS documentation. Small incidents won't use divisions; large incidents will have full ICS structure.

### ADR-009: Calculated Fields — Keep It Lean
**Decision:** Only two calculated fields on Incident (responseTimeMinutes, totalDurationMinutes). No rollup fields in Phase 1.
**Rationale:** Calculated fields in Dataverse have limitations and performance implications. Response time and duration are the most critical metrics and justify the overhead. Additional rollups can be added when needed or handled in Power BI (Phase 6).

### ADR-010: GCC Dataverse Constraints
**Decision:** Design for GCC (Government Community Cloud) from day one.
**Rationale:** GCC has specific connector limitations, geographic residency requirements, and security baselines. Environment variables and connection references are used exclusively for environment-specific configuration to support solution transport between Dev → Test → Prod.

---

## Data Model — Entity Relationship Diagram

```mermaid
erDiagram
    seo_Jurisdiction ||--o{ seo_Agency : "serves"
    seo_Jurisdiction ||--o{ seo_Jurisdiction : "parent"
    seo_Jurisdiction ||--o{ seo_Facility : "located in"
    seo_Jurisdiction ||--o{ seo_Hydrant : "located in"

    seo_Agency ||--o{ seo_Station : "operates"
    seo_Agency ||--o{ seo_Personnel : "employs"
    seo_Agency ||--o{ seo_Apparatus : "owns"
    seo_Agency ||--o{ seo_MutualAidAgreement : "requesting"
    seo_Agency ||--o{ seo_MutualAidAgreement : "providing"
    seo_Agency ||--o{ seo_MutualAidRequest : "requesting"
    seo_Agency ||--o{ seo_MutualAidRequest : "providing"

    seo_Station ||--o{ seo_Apparatus : "houses"
    seo_Station ||--o{ seo_Unit : "home to"

    seo_Apparatus ||--o| seo_Unit : "assigned to"

    seo_Unit ||--o{ seo_IncidentAssignment : "assigned"
    seo_Unit ||--o{ seo_UnitStatusLog : "status history"
    seo_Unit }o--o| seo_Incident : "currently at"

    seo_Personnel ||--o{ seo_IncidentAssignment : "assigned"
    seo_Personnel }o--o| seo_Unit : "current unit"

    seo_Call ||--o{ seo_Incident : "generates"

    seo_Incident ||--o{ seo_IncidentAssignment : "has assignments"
    seo_Incident ||--o{ seo_IncidentNote : "has notes"
    seo_Incident ||--o{ seo_IncidentCommand : "has command"
    seo_Incident ||--o{ seo_ResourceRequest : "has requests"
    seo_Incident ||--o{ seo_PatientRecord : "has patients"
    seo_Incident ||--o{ seo_MutualAidRequest : "has mutual aid"
    seo_Incident ||--o{ seo_Hazard : "has hazards"
    seo_Incident ||--o| seo_AfterActionReport : "has AAR"
    seo_Incident }o--o| seo_PrePlan : "linked to"

    seo_IncidentCommand ||--o{ seo_Division : "has divisions"
    seo_Division ||--o{ seo_IncidentAssignment : "groups"

    seo_MutualAidAgreement ||--o{ seo_MutualAidRequest : "governs"

    seo_PrePlan ||--o{ seo_Hazard : "documents"
    seo_PrePlan ||--o{ seo_Incident : "linked to"

    seo_Facility ||--o{ seo_PatientRecord : "receives patients"

    seo_Incident {
        AutoNumber seo_incidentNumber PK
        Choice seo_incidentType
        Choice seo_priority
        Choice seo_status
        String seo_address
        Float seo_latitude
        Float seo_longitude
        DateTime seo_dispatchedOn
        DateTime seo_firstUnitOnSceneOn
        DateTime seo_clearedOn
        WholeNumber seo_patientCount
        Boolean seo_isMCI
        WholeNumber seo_alarmLevel
        Calculated seo_responseTimeMinutes
    }

    seo_Call {
        AutoNumber seo_callNumber PK
        DateTime seo_receivedOn
        Choice seo_callSource
        Choice seo_reportedIncidentType
        Choice seo_reportedPriority
        String seo_incidentAddress
        String seo_callerName
        String seo_callerPhone
    }

    seo_Unit {
        String seo_name PK
        Choice seo_currentStatus
        Boolean seo_isALS
        WholeNumber seo_personnelCount
        Float seo_latitude
        Float seo_longitude
    }

    seo_Apparatus {
        String seo_name PK
        Choice seo_apparatusType
        Boolean seo_isALS
        WholeNumber seo_pumpCapacityGPM
    }

    seo_Station {
        String seo_name PK
        String seo_stationNumber
        String seo_address
        Float seo_latitude
        Float seo_longitude
    }

    seo_Personnel {
        String seo_fullName PK
        String seo_badgeNumber
        Choice seo_rank
        Boolean seo_isParamedic
    }

    seo_IncidentAssignment {
        String seo_name PK
        Choice seo_icsRole
        DateTime seo_assignedOn
        DateTime seo_onSceneOn
        DateTime seo_clearedOn
        Boolean seo_isMutualAid
    }

    seo_UnitStatusLog {
        String seo_name PK
        Choice seo_status
        Choice seo_previousStatus
        DateTime seo_changedOn
    }

    seo_IncidentNote {
        String seo_name PK
        Choice seo_noteType
        Memo seo_noteBody
        DateTime seo_createdOnOverride
        Boolean seo_isPriority
    }

    seo_IncidentCommand {
        String seo_commandName PK
        DateTime seo_commandEstablishedOn
        Choice seo_strategyMode
        Boolean seo_isUnifiedCommand
        String seo_radioChannel
    }

    seo_Division {
        String seo_name PK
        Choice seo_divisionType
        String seo_radioChannel
    }

    seo_ResourceRequest {
        String seo_name PK
        Choice seo_status
        String seo_resourceType
        WholeNumber seo_quantity
        Choice seo_urgency
    }

    seo_PatientRecord {
        AutoNumber seo_patientIdentifier PK
        Choice seo_triageCategory
        String seo_chiefComplaint
        Boolean seo_isTransported
        Boolean seo_refusedCare
    }

    seo_Facility {
        String seo_name PK
        Choice seo_facilityType
        Choice seo_traumaLevel
        String seo_address
        Boolean seo_hasHelipad
    }

    seo_MutualAidAgreement {
        String seo_name PK
        Choice seo_agreementType
        DateOnly seo_effectiveDate
        DateOnly seo_expirationDate
        Boolean seo_hasCostSharing
    }

    seo_MutualAidRequest {
        String seo_name PK
        Choice seo_status
        Memo seo_resourcesRequested
        Currency seo_estimatedCost
        Currency seo_actualCost
    }

    seo_AfterActionReport {
        String seo_reportTitle PK
        Choice seo_reportStatus
        Choice seo_outcome
        WholeNumber seo_civilianInjuries
        WholeNumber seo_civilianFatalities
        WholeNumber seo_responderInjuries
        Currency seo_estimatedPropertyLoss
    }

    seo_PrePlan {
        String seo_name PK
        Choice seo_occupancyType
        Choice seo_constructionType
        Boolean seo_hasSprinklers
        Boolean seo_hasFDC
    }

    seo_Hazard {
        String seo_name PK
        Choice seo_hazardType
        WholeNumber seo_nfpa704Health
        WholeNumber seo_nfpa704Fire
        WholeNumber seo_nfpa704Reactivity
    }

    seo_Hydrant {
        String seo_hydrantId PK
        Choice seo_status
        WholeNumber seo_flowRateGPM
        Float seo_latitude
        Float seo_longitude
    }

    seo_Agency {
        String seo_name PK
        String seo_code
        Choice seo_agencyType
        String seo_fdid
    }

    seo_Jurisdiction {
        String seo_name PK
        Choice seo_jurisdictionLevel
        String seo_fipsCode
    }
```

---

## Data Dictionary

### seo_Jurisdiction

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_name | String(200) | Yes | Jurisdiction name |
| seo_jurisdictionLevel | Choice | Yes | State, County, City, Town/Township, Fire Protection District, EMS District, Other |
| seo_parentJurisdictionId | Lookup → seo_Jurisdiction | No | Hierarchical parent |
| seo_fipsCode | String(10) | No | Federal Information Processing Standards code |
| seo_boundaryGeoJSON | Memo | No | GeoJSON polygon for geo-dispatch |
| seo_isActive | Boolean | Yes | Default: true |

### seo_Agency

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_name | String(200) | Yes | Full legal name |
| seo_code | String(20) | Yes | Short unique ID (e.g., FDNY) |
| seo_agencyType | Choice | Yes | Fire Department, EMS Agency, Combined Fire/EMS, Rescue Squad, Hazmat Team, Law Enforcement, Other |
| seo_jurisdictionId | Lookup → seo_Jurisdiction | No | Primary jurisdiction |
| seo_address | String(500) | No | HQ address |
| seo_phone | String(20) | No | Phone |
| seo_email | String(200) | No | Email |
| seo_isActive | Boolean | Yes | Default: true |
| seo_fdid | String(10) | No | NFIRS Fire Department ID |

### seo_Station

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_name | String(100) | Yes | Station name |
| seo_stationNumber | String(10) | Yes | Station number |
| seo_agencyId | Lookup → seo_Agency | Yes | Operating agency |
| seo_address | String(500) | Yes | Physical address |
| seo_latitude | Float(6) | No | GPS latitude |
| seo_longitude | Float(6) | No | GPS longitude |
| seo_isActive | Boolean | Yes | Default: true |
| seo_phone | String(20) | No | Station phone |

### seo_Apparatus

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_name | String(50) | Yes | Designator (e.g., Engine 1) |
| seo_apparatusType | Global Choice | Yes | Engine, Ladder/Truck, Rescue/Squad, Ambulance/Medic, etc. |
| seo_stationId | Lookup → seo_Station | Yes | Home station |
| seo_agencyId | Lookup → seo_Agency | Yes | Owning agency |
| seo_vin | String(20) | No | Vehicle ID |
| seo_yearMakeModel | String(100) | No | Year/make/model |
| seo_seatingCapacity | WholeNumber | No | Crew seats |
| seo_pumpCapacityGPM | WholeNumber | No | Pump capacity (GPM) |
| seo_tankCapacityGal | WholeNumber | No | Tank capacity (gallons) |
| seo_isALS | Boolean | No | Advanced Life Support capable. Default: false |
| seo_isInService | Boolean | Yes | Default: true |

### seo_Unit

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_name | String(50) | Yes | Unit designator (e.g., E1, M7) |
| seo_currentStatus | Global Choice | Yes | Available, Dispatched, En Route, On Scene, Transporting, At Hospital, Returning, Out of Service, Staging. Default: Available |
| seo_apparatusId | Lookup → seo_Apparatus | No | Currently assigned apparatus |
| seo_stationId | Lookup → seo_Station | Yes | Home station |
| seo_agencyId | Lookup → seo_Agency | Yes | Agency |
| seo_currentIncidentId | Lookup → seo_Incident | No | Active incident (null if available) |
| seo_personnelCount | WholeNumber | No | Current crew count |
| seo_isALS | Boolean | No | ALS staffed. Default: false |
| seo_latitude | Float(6) | No | GPS lat (mobile-updated) |
| seo_longitude | Float(6) | No | GPS lon (mobile-updated) |
| seo_lastStatusChangeOn | DateTime | No | Most recent status change timestamp |

### seo_Personnel

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_fullName | String(200) | Yes | Full name |
| seo_badgeNumber | String(20) | No | Badge/ID number |
| seo_rank | Global Choice | Yes | Firefighter through Fire Chief, EMT-Basic through Paramedic, Dispatcher, Volunteer |
| seo_agencyId | Lookup → seo_Agency | Yes | Employing agency |
| seo_currentUnitId | Lookup → seo_Unit | No | Current shift unit assignment |
| seo_certifications | String(500) | No | Comma-separated certifications |
| seo_isParamedic | Boolean | No | Default: false |
| seo_email | String(200) | No | Email |
| seo_phone | String(20) | No | Phone |
| seo_systemUserId | Lookup → systemuser | No | Dataverse user for auth |
| seo_isActive | Boolean | Yes | Default: true |

### seo_Call

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_callNumber | AutoNumber | Yes | CALL-{SEQNUM:7} |
| seo_receivedOn | DateTime | Yes | Call receipt timestamp |
| seo_callSource | Global Choice | Yes | 911, Non-Emergency, Radio, Walk-In, Automatic Alarm, Mutual Aid Request, Transfer, Self-Initiated |
| seo_callerName | String(200) | No | Caller's name |
| seo_callerPhone | String(20) | No | Callback number |
| seo_callerAddress | String(500) | No | Caller's address |
| seo_reportedIncidentType | Global Choice | Yes | What the caller reports |
| seo_reportedPriority | Global Choice | Yes | Initial priority assessment |
| seo_incidentAddress | String(500) | Yes | Location of the emergency |
| seo_latitude | Float(6) | No | Geocoded lat |
| seo_longitude | Float(6) | No | Geocoded lon |
| seo_narrativeNotes | Memo | No | Dispatcher notes |
| seo_jurisdictionId | Lookup → seo_Jurisdiction | No | Determined jurisdiction |
| seo_dispatcherId | Lookup → seo_Personnel | No | Dispatcher who took the call |
| seo_isDuplicate | Boolean | No | Duplicate flag. Default: false |
| seo_duplicateOfIncidentId | Lookup → seo_Incident | No | Incident this duplicates |

### seo_Incident

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_incidentNumber | AutoNumber | Yes | INC-{DATEFMT:yyyyMMdd}-{SEQNUM:5} |
| seo_callId | Lookup → seo_Call | No | Originating call |
| seo_incidentType | Global Choice | Yes | Confirmed incident type |
| seo_priority | Global Choice | Yes | Priority level |
| seo_status | Global Choice | Yes | Reported → Dispatched → En Route → On Scene → Under Control → Overhaul → Cleared → Closed. Default: Reported |
| seo_address | String(500) | Yes | Incident location |
| seo_latitude | Float(6) | No | GPS lat |
| seo_longitude | Float(6) | No | GPS lon |
| seo_crossStreet | String(200) | No | Cross street or landmark |
| seo_apartment | String(50) | No | Apt/suite/floor |
| seo_jurisdictionId | Lookup → seo_Jurisdiction | No | Jurisdiction |
| seo_primaryAgencyId | Lookup → seo_Agency | Yes | Agency with primary responsibility |
| seo_dispatchedOn | DateTime | No | Dispatch timestamp |
| seo_firstUnitEnRouteOn | DateTime | No | First unit en route |
| seo_firstUnitOnSceneOn | DateTime | No | First unit on scene — key metric |
| seo_underControlOn | DateTime | No | Under control timestamp |
| seo_clearedOn | DateTime | No | All units cleared |
| seo_closedOn | DateTime | No | Incident closed |
| seo_patientCount | WholeNumber | No | Number of patients. Default: 0 |
| seo_isMCI | Boolean | No | Mass casualty incident. Default: false |
| seo_alarmLevel | WholeNumber | No | Alarm level. Default: 1 |
| seo_narrativeSummary | Memo | No | Incident narrative |
| seo_hazardsOnScene | Memo | No | Known hazards for responding units |
| seo_prePlanId | Lookup → seo_PrePlan | No | Linked pre-plan |
| seo_nfirsCode | String(10) | No | NFIRS incident type code |
| **seo_responseTimeMinutes** | **Calculated** | — | DATEDIFF(dispatchedOn, firstUnitOnSceneOn, min) |
| **seo_totalDurationMinutes** | **Calculated** | — | DATEDIFF(dispatchedOn, clearedOn, min) |

### seo_IncidentAssignment

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_name | String(200) | Yes | Auto: "Unit X - Incident Y" |
| seo_incidentId | Lookup → seo_Incident | Yes | Incident |
| seo_unitId | Lookup → seo_Unit | No | Assigned unit |
| seo_personnelId | Lookup → seo_Personnel | No | Assigned individual |
| seo_icsRole | Global Choice | No | ICS/NIMS role |
| seo_divisionId | Lookup → seo_Division | No | ICS division |
| seo_assignedOn | DateTime | Yes | Assignment timestamp |
| seo_enRouteOn | DateTime | No | En route timestamp |
| seo_onSceneOn | DateTime | No | On scene timestamp |
| seo_clearedOn | DateTime | No | Cleared timestamp |
| seo_assignmentNotes | Memo | No | Tactical details |
| seo_isMutualAid | Boolean | No | Mutual aid resource. Default: false |

### seo_UnitStatusLog

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_name | String(200) | Yes | Auto: "Unit X - Status - Timestamp" |
| seo_unitId | Lookup → seo_Unit | Yes | Unit |
| seo_status | Global Choice | Yes | New status |
| seo_previousStatus | Global Choice | No | Prior status |
| seo_changedOn | DateTime | Yes | Timestamp |
| seo_changedById | Lookup → seo_Personnel | No | Who made the change |
| seo_incidentId | Lookup → seo_Incident | No | Related incident |
| seo_latitude | Float(6) | No | GPS at time of change |
| seo_longitude | Float(6) | No | GPS at time of change |
| seo_source | Local Choice | No | Mobile App, Dispatch Console, CAD Interface, Automated |

Note: Audit disabled on this table — it IS the audit trail. Rows are append-only.

### seo_IncidentNote

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_name | String(200) | Yes | Note title |
| seo_incidentId | Lookup → seo_Incident | Yes | Incident |
| seo_noteType | Global Choice | Yes | Dispatch Update, On-Scene Report, Command Decision, Safety Alert, EMS Update, Resource Update, General Note |
| seo_noteBody | Memo | Yes | Full note text |
| seo_authorId | Lookup → seo_Personnel | No | Author |
| seo_createdOnOverride | DateTime | Yes | Actual note time (supports backdating) |
| seo_isPriority | Boolean | No | Priority flag. Default: false |

### seo_IncidentCommand

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_commandName | String(200) | Yes | e.g., "Main St Command" |
| seo_incidentId | Lookup → seo_Incident | Yes | Incident |
| seo_incidentCommanderId | Lookup → seo_Personnel | Yes | IC |
| seo_commandEstablishedOn | DateTime | Yes | Command start time |
| seo_commandTerminatedOn | DateTime | No | Command end time |
| seo_commandPostAddress | String(500) | No | CP location |
| seo_commandPostLatitude | Float(6) | No | CP GPS lat |
| seo_commandPostLongitude | Float(6) | No | CP GPS lon |
| seo_radioChannel | String(50) | No | Primary radio channel/talkgroup |
| seo_strategyMode | Local Choice | No | Offensive, Defensive, Transitional, Investigation |
| seo_isUnifiedCommand | Boolean | No | Multi-agency UC. Default: false |

### seo_Division

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_name | String(100) | Yes | e.g., Division A, Search Group |
| seo_incidentCommandId | Lookup → seo_IncidentCommand | Yes | Parent command |
| seo_supervisorId | Lookup → seo_Personnel | No | Supervisor |
| seo_divisionType | Local Choice | Yes | Geographic Division, Functional Group, Branch, Strike Team, Task Force |
| seo_radioChannel | String(50) | No | Radio channel |
| seo_objectives | Memo | No | Tactical objectives |

### seo_ResourceRequest

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_name | String(200) | Yes | Request description |
| seo_incidentId | Lookup → seo_Incident | Yes | Incident |
| seo_requestedById | Lookup → seo_Personnel | Yes | Requestor |
| seo_requestedOn | DateTime | Yes | Request timestamp |
| seo_status | Global Choice | Yes | Requested, Approved, Dispatched, En Route, On Scene, Released, Denied, Cancelled. Default: Requested |
| seo_resourceType | String(200) | Yes | What's needed |
| seo_quantity | WholeNumber | Yes | How many. Default: 1 |
| seo_urgency | Local Choice | Yes | Emergency, Urgent, Routine |
| seo_justification | Memo | No | Why it's needed |
| seo_fulfilledById | Lookup → seo_Personnel | No | Who fulfilled it |
| seo_fulfilledOn | DateTime | No | Fulfillment timestamp |
| seo_assignedUnitId | Lookup → seo_Unit | No | Unit dispatched |

### seo_PatientRecord (PHI-SENSITIVE)

| Column | Type | Required | PHI | Description |
|--------|------|----------|-----|-------------|
| seo_patientIdentifier | AutoNumber | Yes | No | PT-{SEQNUM:7} |
| seo_incidentId | Lookup → seo_Incident | Yes | No | Incident |
| seo_triageCategory | Global Choice | Yes | No | Red/Yellow/Green/Black/White (START) |
| seo_patientFirstName | String(100) | No | **Yes** | First name |
| seo_patientLastName | String(100) | No | **Yes** | Last name |
| seo_patientAge | WholeNumber | No | **Yes** | Age |
| seo_patientGender | Local Choice | No | **Yes** | Male, Female, Other, Unknown |
| seo_chiefComplaint | String(500) | No | **Yes** | Primary complaint/injury |
| seo_assessmentNotes | Memo | No | **Yes** | Clinical assessment |
| seo_treatmentNotes | Memo | No | **Yes** | Interventions provided |
| seo_isTransported | Boolean | No | No | Default: false |
| seo_refusedCare | Boolean | No | No | AMA refusal. Default: false |
| seo_transportUnitId | Lookup → seo_Unit | No | No | Transport unit |
| seo_destinationFacilityId | Lookup → seo_Facility | No | No | Destination hospital |
| seo_transportStartedOn | DateTime | No | No | Transport start |
| seo_arrivedAtFacilityOn | DateTime | No | No | Facility arrival |
| seo_attendingPersonnelId | Lookup → seo_Personnel | No | No | Primary EMS provider |

### seo_Facility

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_name | String(200) | Yes | Facility name |
| seo_facilityType | Global Choice | Yes | Hospital, Trauma Center, Burn Center, Pediatric Center, Stroke Center, STEMI Center, Urgent Care, Helipad/LZ, Staging Area, Shelter, Other |
| seo_address | String(500) | Yes | Address |
| seo_latitude | Float(6) | No | GPS lat |
| seo_longitude | Float(6) | No | GPS lon |
| seo_phone | String(20) | No | Phone |
| seo_traumaLevel | Local Choice | No | Level I-IV, N/A |
| seo_hasBurnUnit | Boolean | No | Default: false |
| seo_hasPediatric | Boolean | No | Default: false |
| seo_hasHelipad | Boolean | No | Default: false |
| seo_isActive | Boolean | Yes | Default: true |
| seo_capacity | WholeNumber | No | Bed/occupancy count |
| seo_jurisdictionId | Lookup → seo_Jurisdiction | No | Jurisdiction |

### seo_MutualAidAgreement

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_name | String(200) | Yes | Agreement name |
| seo_requestingAgencyId | Lookup → seo_Agency | Yes | Requesting agency |
| seo_providingAgencyId | Lookup → seo_Agency | Yes | Providing agency |
| seo_agreementType | Local Choice | Yes | Mutual Aid, Automatic Aid, Statewide, EMAC |
| seo_effectiveDate | DateOnly | Yes | Start date |
| seo_expirationDate | DateOnly | No | End date (null = no expiration) |
| seo_terms | Memo | No | Terms summary |
| seo_hasCostSharing | Boolean | No | Default: false |
| seo_costSharingTerms | Memo | No | Cost recovery details |
| seo_isActive | Boolean | Yes | Default: true |

### seo_MutualAidRequest

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_name | String(200) | Yes | Request title |
| seo_incidentId | Lookup → seo_Incident | Yes | Incident |
| seo_agreementId | Lookup → seo_MutualAidAgreement | No | Governing agreement |
| seo_requestingAgencyId | Lookup → seo_Agency | Yes | Requesting agency |
| seo_providingAgencyId | Lookup → seo_Agency | Yes | Providing agency |
| seo_status | Global Choice | Yes | Requested, Approved, Deployed, Returned, Denied, Cancelled. Default: Requested |
| seo_resourcesRequested | Memo | Yes | What's needed |
| seo_resourcesProvided | Memo | No | What was provided |
| seo_requestedOn | DateTime | Yes | Request timestamp |
| seo_deployedOn | DateTime | No | Deployment timestamp |
| seo_returnedOn | DateTime | No | Return timestamp |
| seo_estimatedCost | Currency | No | Estimated cost |
| seo_actualCost | Currency | No | Actual cost |
| seo_costNotes | Memo | No | Cost notes |

### seo_AfterActionReport

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_reportTitle | String(300) | Yes | Report title |
| seo_incidentId | Lookup → seo_Incident | Yes | Incident |
| seo_authorId | Lookup → seo_Personnel | Yes | Report author |
| seo_completedOn | DateTime | No | Completion date |
| seo_reportStatus | Local Choice | Yes | Draft, Under Review, Approved, Final. Default: Draft |
| seo_incidentSummary | Memo | Yes | Narrative summary |
| seo_timelineOfEvents | Memo | No | Chronological timeline |
| seo_outcome | Local Choice | No | Resolved — No/Minimal/Significant/Total Loss, Patient outcomes, Fatality, False Alarm, Cancelled |
| seo_civilianInjuries | WholeNumber | No | Default: 0 |
| seo_civilianFatalities | WholeNumber | No | Default: 0 |
| seo_responderInjuries | WholeNumber | No | Default: 0 |
| seo_responderFatalities | WholeNumber | No | Default: 0 |
| seo_estimatedPropertyLoss | Currency | No | Property loss |
| seo_estimatedContentLoss | Currency | No | Content loss |
| seo_areaOfOrigin | String(200) | No | Fire origin area |
| seo_causeOfFire | Local Choice | No | Accidental, Natural, Incendiary/Arson, Under Investigation, Undetermined, N/A |
| seo_lessonsLearned | Memo | No | Key takeaways |
| seo_improvementActions | Memo | No | Corrective actions |

### seo_PrePlan

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_name | String(200) | Yes | Building/occupancy name |
| seo_address | String(500) | Yes | Address |
| seo_latitude | Float(6) | No | GPS lat |
| seo_longitude | Float(6) | No | GPS lon |
| seo_occupancyType | Local Choice | Yes | Assembly, Business, Educational, Factory/Industrial, High Hazard, Institutional, Mercantile, Residential types, Storage, Utility |
| seo_constructionType | Local Choice | No | Type I-V (NFPA classification) |
| seo_stories | WholeNumber | No | Number of stories |
| seo_squareFootage | WholeNumber | No | Building area |
| seo_hasBasement | Boolean | No | Default: false |
| seo_hasSprinklers | Boolean | No | Default: false |
| seo_hasFireAlarm | Boolean | No | Default: false |
| seo_hasStandpipe | Boolean | No | Default: false |
| seo_hasFDC | Boolean | No | Default: false |
| seo_fdcLocation | String(200) | No | FDC location description |
| seo_knownHazards | Memo | No | Hazmat, processes, conditions |
| seo_accessNotes | Memo | No | Keys, Knox box, gates, access roads |
| seo_tacticalNotes | Memo | No | Recommended strategies |
| seo_occupantCount | WholeNumber | No | Typical occupants |
| seo_emergencyContactName | String(200) | No | Contact name |
| seo_emergencyContactPhone | String(20) | No | Contact phone |
| seo_lastInspectedOn | DateOnly | No | Last inspection date |
| seo_agencyId | Lookup → seo_Agency | No | Responsible agency |
| seo_jurisdictionId | Lookup → seo_Jurisdiction | No | Jurisdiction |

### seo_Hazard

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_name | String(200) | Yes | Hazard description |
| seo_hazardType | Global Choice | Yes | Chemical, Biological, Radiological, Explosive, Structural Collapse, Electrical, Natural Gas, Flammable Liquid, Confined Space, Other |
| seo_prePlanId | Lookup → seo_PrePlan | No | Parent pre-plan |
| seo_incidentId | Lookup → seo_Incident | No | Incident (if discovered on-scene) |
| seo_location | String(500) | No | Where within the site |
| seo_nfpa704Health | WholeNumber | No | NFPA 704 health (0-4) |
| seo_nfpa704Fire | WholeNumber | No | NFPA 704 fire (0-4) |
| seo_nfpa704Reactivity | WholeNumber | No | NFPA 704 reactivity (0-4) |
| seo_nfpa704Special | String(10) | No | Special hazard (W, OX, SA) |
| seo_quantity | String(100) | No | Estimated quantity |
| seo_mitigationNotes | Memo | No | Mitigation guidance |

### seo_Hydrant

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| seo_hydrantId | String(50) | Yes | GIS/utility hydrant ID |
| seo_address | String(500) | No | Address or cross street |
| seo_latitude | Float(6) | Yes | GPS lat |
| seo_longitude | Float(6) | Yes | GPS lon |
| seo_status | Global Choice | Yes | In Service, Out of Service, Needs Inspection, Buried/Inaccessible. Default: In Service |
| seo_flowRateGPM | WholeNumber | No | Rated flow (GPM) |
| seo_staticPressurePSI | WholeNumber | No | Static pressure |
| seo_residualPressurePSI | WholeNumber | No | Residual pressure |
| seo_mainSizeInches | Decimal(1) | No | Water main diameter |
| seo_hydrantColor | Local Choice | No | NFPA 291 color coding: Red (<500), Orange (500-999), Green (1000-1499), Blue (1500+) |
| seo_outletConfiguration | String(100) | No | Outlet sizes and types |
| seo_lastTestedOn | DateOnly | No | Last flow test date |
| seo_waterUtility | String(200) | No | Water utility name |
| seo_jurisdictionId | Lookup → seo_Jurisdiction | No | Jurisdiction |
| seo_notes | Memo | No | Access issues, notes |

Note: Audit disabled — reference data bulk-imported from GIS.

---

## Global Choice (Option Set) Definitions

| Choice Name | Used By | Options |
|-------------|---------|---------|
| seo_IncidentType | Call, Incident | Structure Fire, Wildland Fire, Vehicle Fire, Medical Emergency, Cardiac Arrest, Trauma, Technical Rescue, Water Rescue, Hazmat, MVA, MVA w/ Entrapment, Gas Leak, CO, Alarm Activation, Public Assist, Mutual Aid, Other |
| seo_IncidentPriority | Call, Incident | Priority 1 (Immediate Life Threat), Priority 2 (Urgent), Priority 3 (Non-Urgent), Priority 4 (Scheduled/Low) |
| seo_IncidentStatus | Incident | Reported, Dispatched, En Route, On Scene, Under Control, Overhaul, Cleared, Closed, Cancelled |
| seo_UnitStatus | Unit, UnitStatusLog | Available, Dispatched, En Route, On Scene, Transporting, At Hospital, Returning, Out of Service, Staging |
| seo_TriageCategory | PatientRecord | Red (Immediate), Yellow (Delayed), Green (Minor), Black (Deceased), White (Non-Patient) |
| seo_ApparatusType | Apparatus | Engine, Ladder/Truck, Rescue/Squad, Ambulance/Medic, Battalion Chief, Tanker/Tender, Brush/Wildland, Hazmat Unit, Heavy Rescue, Boat, Air Unit/Helicopter, Command Vehicle, Utility, Other |
| seo_PersonnelRank | Personnel | Firefighter, FF/Paramedic, Engineer/Driver, Lieutenant, Captain, Battalion Chief, Division Chief, Assistant Chief, Deputy Chief, Fire Chief, EMT-Basic, EMT-Advanced, Paramedic, Dispatcher, Volunteer |
| seo_ICSRole | IncidentAssignment | IC, Ops Chief, Planning Chief, Logistics Chief, Finance Chief, Safety Officer, PIO, Liaison, Division Supervisor, Group Supervisor, Strike Team Leader, Task Force Leader, Staging Manager, EMS Branch Director, Fire Attack, Search & Rescue, Ventilation, Water Supply, RIT/FAST |
| seo_ResourceRequestStatus | ResourceRequest | Requested, Approved, Dispatched, En Route, On Scene, Released, Denied, Cancelled |
| seo_MutualAidStatus | MutualAidRequest | Requested, Approved, Deployed, Returned, Denied, Cancelled |
| seo_CallSource | Call | 911, Non-Emergency, Radio, Walk-In, Automatic Alarm, Mutual Aid Request, Transfer from Other PSAP, Self-Initiated |
| seo_NoteType | IncidentNote | Dispatch Update, On-Scene Report, Command Decision, Safety Alert, EMS Update, Resource Update, General Note |
| seo_HazardType | Hazard | Chemical, Biological, Radiological, Explosive, Structural Collapse, Electrical, Natural Gas, Flammable Liquid, Confined Space, Other |
| seo_FacilityType | Facility | Hospital, Trauma Center, Burn Center, Pediatric Center, Stroke Center, STEMI Center, Urgent Care, Helipad/LZ, Staging Area, Shelter, Other |
| seo_HydrantStatus | Hydrant | In Service, Out of Service, Needs Inspection, Buried/Inaccessible |

---

## ALM & Deployment

### Solution Layering
- **Base solution:** EmergencyResponseCoordination (managed) — contains all tables, choices, relationships
- **Customization layer:** EmergencyResponseCoordination_Customizations (unmanaged in dev) — agency-specific views, forms, dashboards
- **Environment strategy:** Dev → Test → Prod (solution transport via managed export/import)

### Environment Variables
| Variable | Type | Description |
|----------|------|-------------|
| seo_DefaultAgencyId | String | GUID of the default agency for new records |
| seo_DefaultJurisdictionId | String | GUID of the default jurisdiction |
| seo_MapDefaultLatitude | String | Default map center latitude |
| seo_MapDefaultLongitude | String | Default map center longitude |
| seo_MapDefaultZoom | String | Default map zoom level |
| seo_EnableMutualAidCostTracking | String | "true"/"false" — enable cost fields on mutual aid |
| seo_PatientRecordRetentionDays | String | Number of days to retain PHI data |

### Connection References
| Reference | Connector | Description |
|-----------|-----------|-------------|
| seo_DataverseConnection | Microsoft Dataverse | Primary data connection |
| seo_Office365UsersConnection | Office 365 Users | User profile lookups |
| seo_SharePointConnection | SharePoint | Document storage (pre-plans, SOPs) |
| seo_OutlookConnection | Office 365 Outlook | Email notifications |

### GCC Considerations
- All data residency within US Government cloud boundaries
- FedRAMP High authorized connectors only
- No custom connectors without security review
- Azure AD (Entra ID) for authentication — GCC tenant
- Power Platform environment must be GCC type
