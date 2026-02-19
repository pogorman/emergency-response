# Sample Data

## Overview

Realistic multi-agency sample data for the EmergencyResponseCoordination solution. Covers all 22 Dataverse tables with 5 incident scenarios at different lifecycle stages.

## Agencies

| Agency | Code | Type | Jurisdiction |
|--------|------|------|-------------|
| Metro City Fire Department | MCFD | Combined Fire/EMS | Metro City |
| County Fire Protection District | CFPD | Fire Department | Westside District |
| City EMS Authority | CEMS | EMS Agency | Metro City |

## 5 Incident Scenarios

### 1. Structure Fire — Active, On Scene
- **Location:** 455 Elm St (Sunrise Senior Living)
- **Alarm Level:** 3
- **Units:** E1, L1, E2 (Metro Fire) + E11 (County Fire, mutual aid)
- **ICS:** Command established, 2 divisions (Alpha, Bravo), defensive strategy
- **Pre-plan:** Linked to senior living facility pre-plan
- **Key features:** Mutual aid, ICS divisions, resource request for water supply, safety alerts

### 2. MCI / Multi-Vehicle Accident — Active, Dispatched
- **Location:** Highway 50 at Exit 12
- **Patients:** 7 (2 Red, 3 Yellow, 2 Green)
- **Units:** R2 (Metro Fire), M1, M2 (City EMS)
- **ICS:** Unified command established
- **MCI:** Auto-flagged (patientCount ≥ 5)
- **Key features:** MCI triage, mutual aid request for additional ambulances, patient transport tracking

### 3. Hazmat Spill — Active, Under Control
- **Location:** 800 Industrial Blvd, Loading Dock B
- **Units:** E3 (Metro Fire) + E11 (County Fire, mutual aid)
- **ICS:** Command with hot zone and decon corridor functional groups
- **Key features:** Chlorine release, NFPA 704 hazard data, decon resource request, zone management

### 4. Medical Emergency — Cleared
- **Location:** 220 Park Ave, Apt 4B
- **Units:** M1 (City EMS)
- **Patients:** 1 (STEMI, transported)
- **Key features:** Single-unit EMS response, patient transport, completed timeline

### 5. Brush Fire — Closed
- **Location:** County Road 15, Mile Marker 7
- **Units:** E11, brush crew (County Fire)
- **ICS:** Lt. Walker as IC
- **Key features:** Full lifecycle (Reported → Closed), completed AAR with lessons learned

## Import Order

Import files in this order to satisfy foreign key dependencies:

```
1.  agencies.json           (no dependencies)
2.  jurisdictions.json      (no dependencies — parent references are within file)
3.  facilities.json         (depends: jurisdictions)
4.  stations.json           (depends: agencies)
5.  apparatus.json          (depends: stations, agencies)
6.  personnel.json          (depends: agencies, units*)
7.  units.json              (depends: stations, agencies, apparatus, incidents*)
8.  pre-plans.json          (depends: agencies, jurisdictions)
9.  hazards.json            (depends: pre-plans, incidents)
10. hydrants.json           (depends: jurisdictions)
11. incidents.json          (depends: agencies, jurisdictions, pre-plans, calls*)
12. calls.json              (depends: jurisdictions, personnel)
13. incident-assignments.json (depends: incidents, units, personnel, divisions)
14. incident-commands.json  (depends: incidents, personnel)
15. divisions.json          (depends: incident-commands, personnel)
16. resource-requests.json  (depends: incidents, personnel, units)
17. incident-notes.json     (depends: incidents, personnel)
18. patient-records.json    (depends: incidents, units, facilities, personnel)
19. mutual-aid-agreements.json (depends: agencies)
20. mutual-aid-requests.json   (depends: incidents, agencies, agreements)
21. after-action-reports.json  (depends: incidents, personnel)
22. unit-status-logs.json   (depends: units, personnel, incidents)
```

*Items marked with `*` have circular references — import the entity first with null for the circular FK, then update after the referenced records exist.

**Circular references to resolve:**
- `personnel.json` references `units.json` (currentUnitId) — import personnel first with null currentUnitId, then update
- `units.json` references `incidents.json` (currentIncidentId) — import units first with null currentIncidentId, then update
- `incidents.json` references `calls.json` (callId) — import incidents first with null callId, then update

## Symbolic Reference Format

All foreign key values use the format `@ref:collection-id` (e.g., `@ref:agency-metro-fire`). When importing:

1. Import records in dependency order
2. For each `@ref:` value, look up the actual Dataverse GUID of the referenced record
3. Replace the symbolic reference with the GUID
4. For circular references, perform a two-pass import (create with nulls, then update)

## Record Counts

| File | Entity | Records |
|------|--------|---------|
| agencies.json | seo_Agency | 3 |
| jurisdictions.json | seo_Jurisdiction | 3 |
| facilities.json | seo_Facility | 8 |
| stations.json | seo_Station | 6 |
| apparatus.json | seo_Apparatus | 12 |
| personnel.json | seo_Personnel | 18 |
| units.json | seo_Unit | 8 |
| pre-plans.json | seo_PrePlan | 4 |
| hazards.json | seo_Hazard | 6 |
| hydrants.json | seo_Hydrant | 15 |
| incidents.json | seo_Incident | 5 |
| calls.json | seo_Call | 5 |
| incident-assignments.json | seo_IncidentAssignment | 15 |
| incident-commands.json | seo_IncidentCommand | 3 |
| divisions.json | seo_Division | 4 |
| resource-requests.json | seo_ResourceRequest | 3 |
| incident-notes.json | seo_IncidentNote | 12 |
| patient-records.json | seo_PatientRecord | 8 |
| transports.json | *(reference only)* | 3 |
| mutual-aid-agreements.json | seo_MutualAidAgreement | 2 |
| mutual-aid-requests.json | seo_MutualAidRequest | 2 |
| after-action-reports.json | seo_AfterActionReport | 2 |
| unit-status-logs.json | seo_UnitStatusLog | ~40 |
| **Total** | | **~178** |

## PHI Data Warning

`patient-records.json` contains simulated PHI fields (patient names, ages, clinical data). This data is **fictional** and for testing purposes only. In production, PHI fields are protected by the `seo_PHIAccess` field security profile — only users with EMSProvider or SystemAdmin roles can view these columns.

## Using for Demos

1. Import in the order above
2. Open the Dispatch Console model-driven app
3. The Dispatch Operations dashboard shows the 3 active incidents and unit status distribution
4. Navigate to each incident to see the full scenario data
5. The ICS Command dashboard shows active commands and resource requests
6. The Station Dashboard shows units and pre-plans
7. The Supervisor Overview shows MCI incidents and mutual aid activity
