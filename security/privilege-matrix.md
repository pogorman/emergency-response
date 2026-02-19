# Privilege Matrix — EmergencyResponseCoordination

> **Single source of truth** for all security role × table × privilege mappings.
> Generated as part of Phase 2 (Security Model + Roles).
>
> **Scope Key:** `O` = Organization, `BU` = Business Unit, `U` = User, `—` = None

---

## How to Read This Matrix

- Each cell shows the **access scope** for that privilege
- `O` (Organization) = can act on records across all BUs
- `BU` (Business Unit) = can act on records within own BU
- `U` (User) = can act on only own records (+ records shared via teams)
- `—` = no privilege granted
- **Append** = can add child records (e.g., add IncidentNote to Incident)
- **AppendTo** = can be set as a lookup target (e.g., Agency can be referenced by other records)
- PHI columns on PatientRecord are controlled separately by the `seo_PHIAccess` field security profile

---

## Core / Reference Tables

### seo_Agency

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | — | — | — | — | — | — | — |
| Read      | O | O | O | O | O | O | O | O |
| Write     | O | — | — | — | — | — | — | — |
| Delete    | O | — | — | — | — | — | — | — |
| Append    | O | — | — | — | — | — | — | — |
| AppendTo  | O | O | O | O | O | O | O | — |
| Assign    | O | — | — | — | — | — | — | — |
| Share     | O | — | — | — | — | — | — | — |

### seo_Jurisdiction

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | — | — | — | — | — | — | — |
| Read      | O | O | O | O | O | O | O | O |
| Write     | O | — | — | — | — | — | — | — |
| Delete    | O | — | — | — | — | — | — | — |
| Append    | O | — | — | — | — | — | — | — |
| AppendTo  | O | O | O | O | O | O | O | — |
| Assign    | O | — | — | — | — | — | — | — |
| Share     | O | — | — | — | — | — | — | — |

### seo_Facility

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | — | — | — | — | — | — | — |
| Read      | O | O | O | O | O | O | O | O |
| Write     | O | — | — | — | — | — | — | — |
| Delete    | O | — | — | — | — | — | — | — |
| Append    | O | — | — | — | — | — | — | — |
| AppendTo  | O | O | O | O | O | O | O | — |
| Assign    | O | — | — | — | — | — | — | — |
| Share     | O | — | — | — | — | — | — | — |

---

## Dispatch / Resource Tables

### seo_Station

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | — | — | — | — | — | — | — |
| Read      | O | BU | BU | BU | BU | BU | BU | BU |
| Write     | O | — | — | — | — | — | BU | — |
| Delete    | O | — | — | — | — | — | — | — |
| Append    | O | — | — | — | — | — | — | — |
| AppendTo  | O | BU | BU | BU | BU | BU | BU | — |
| Assign    | O | — | — | — | — | — | — | — |
| Share     | O | — | — | — | — | — | — | — |

### seo_Apparatus

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | — | — | — | — | — | — | — |
| Read      | O | BU | BU | BU | BU | BU | BU | BU |
| Write     | O | BU | — | — | — | — | BU | — |
| Delete    | O | — | — | — | — | — | — | — |
| Append    | O | — | — | — | — | — | — | — |
| AppendTo  | O | BU | BU | BU | BU | BU | BU | — |
| Assign    | O | — | — | — | — | — | — | — |
| Share     | O | — | — | — | — | — | — | — |

### seo_Unit

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | BU | — | — | — | — | — | — |
| Read      | O | BU | BU | BU | U | U | BU | BU |
| Write     | O | BU | BU | BU | U | U | BU | — |
| Delete    | O | — | — | — | — | — | — | — |
| Append    | O | BU | — | — | — | — | — | — |
| AppendTo  | O | BU | BU | BU | U | U | BU | — |
| Assign    | O | BU | — | — | — | — | — | — |
| Share     | O | BU | — | — | — | — | — | — |

### seo_Personnel

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | — | — | — | — | — | — | — |
| Read      | O | BU | BU | BU | BU | BU | BU | BU |
| Write     | O | BU | — | — | — | — | BU | — |
| Delete    | O | — | — | — | — | — | — | — |
| Append    | O | — | — | — | — | — | — | — |
| AppendTo  | O | BU | BU | BU | BU | BU | BU | — |
| Assign    | O | — | — | — | — | — | — | — |
| Share     | O | — | — | — | — | — | — | — |

---

## Call / Incident Lifecycle

### seo_Call

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | BU | BU | — | — | — | — | — |
| Read      | O | BU | BU | BU | U | U | BU | BU |
| Write     | O | BU | BU | — | — | — | — | — |
| Delete    | O | BU | — | — | — | — | — | — |
| Append    | O | BU | BU | — | — | — | — | — |
| AppendTo  | O | BU | BU | BU | U | U | BU | — |
| Assign    | O | BU | BU | — | — | — | — | — |
| Share     | O | BU | — | — | — | — | — | — |

### seo_Incident

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | BU | BU | — | — | — | — | — |
| Read      | O | BU | BU | BU | U | U | BU | BU |
| Write     | O | BU | BU | BU | — | — | — | — |
| Delete    | O | BU | — | — | — | — | — | — |
| Append    | O | BU | BU | BU | U | U | BU | — |
| AppendTo  | O | BU | BU | BU | U | U | BU | — |
| Assign    | O | BU | BU | — | — | — | — | — |
| Share     | O | BU | BU | BU | — | — | — | — |

### seo_IncidentAssignment

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | BU | BU | BU | — | — | — | — |
| Read      | O | BU | BU | BU | U | U | BU | BU |
| Write     | O | BU | BU | BU | U | U | — | — |
| Delete    | O | BU | BU | BU | — | — | — | — |
| Append    | O | BU | BU | BU | — | — | — | — |
| AppendTo  | O | BU | BU | BU | U | U | BU | — |
| Assign    | O | BU | — | BU | — | — | — | — |
| Share     | O | BU | — | BU | — | — | — | — |

### seo_UnitStatusLog (APPEND-ONLY)

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | BU | BU | BU | U | U | BU | — |
| Read      | O | BU | BU | BU | U | U | BU | BU |
| Write     | **O** | — | — | — | — | — | — | — |
| Delete    | **O** | — | — | — | — | — | — | — |
| Append    | O | BU | BU | BU | U | U | BU | — |
| AppendTo  | O | BU | BU | BU | U | U | BU | — |
| Assign    | O | — | — | — | — | — | — | — |
| Share     | O | — | — | — | — | — | — | — |

> **Note:** Write and Delete are restricted to SystemAdmin only. All other roles can only Create (append) new log entries. This enforces the immutable audit trail per ADR-003.

---

## ICS Command Structure

### seo_IncidentCommand

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | BU | — | BU | — | — | — | — |
| Read      | O | BU | BU | BU | U | U | BU | BU |
| Write     | O | BU | — | BU | — | — | — | — |
| Delete    | O | — | — | — | — | — | — | — |
| Append    | O | BU | — | BU | — | — | — | — |
| AppendTo  | O | BU | BU | BU | U | U | BU | — |
| Assign    | O | BU | — | BU | — | — | — | — |
| Share     | O | BU | — | BU | — | — | — | — |

### seo_Division

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | BU | — | BU | — | — | — | — |
| Read      | O | BU | BU | BU | U | U | BU | BU |
| Write     | O | BU | — | BU | — | — | — | — |
| Delete    | O | BU | — | BU | — | — | — | — |
| Append    | O | BU | — | BU | — | — | — | — |
| AppendTo  | O | BU | BU | BU | U | U | BU | — |
| Assign    | O | BU | — | BU | — | — | — | — |
| Share     | O | BU | — | BU | — | — | — | — |

### seo_ResourceRequest

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | BU | BU | BU | — | — | — | — |
| Read      | O | BU | BU | BU | U | U | BU | BU |
| Write     | O | BU | BU | BU | — | — | — | — |
| Delete    | O | BU | — | BU | — | — | — | — |
| Append    | O | BU | BU | BU | — | — | — | — |
| AppendTo  | O | BU | BU | BU | U | U | BU | — |
| Assign    | O | BU | — | BU | — | — | — | — |
| Share     | O | BU | — | BU | — | — | — | — |

### seo_IncidentNote

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | BU | BU | BU | U | U | BU | — |
| Read      | O | BU | BU | BU | U | U | BU | BU |
| Write     | O | BU | BU | BU | U | U | BU | — |
| Delete    | O | BU | — | BU | — | — | — | — |
| Append    | O | BU | BU | BU | U | U | BU | — |
| AppendTo  | O | BU | BU | BU | U | U | BU | — |
| Assign    | O | BU | — | — | — | — | — | — |
| Share     | O | BU | — | — | — | — | — | — |

---

## EMS (PHI-Protected)

### seo_PatientRecord

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | BU | — | — | — | **U** | — | — |
| Read      | O | BU | BU | BU | — | **U** | BU | BU |
| Write     | O | BU | — | — | — | **U** | — | — |
| Delete    | O | — | — | — | — | — | — | — |
| Append    | O | BU | — | — | — | **U** | — | — |
| AppendTo  | O | BU | BU | BU | — | **U** | BU | — |
| Assign    | O | — | — | — | — | — | — | — |
| Share     | O | — | — | — | — | — | — | — |

> **PHI Column Access** (via `seo_PHIAccess` field security profile):
>
> | Column | SystemAdmin | EMSProvider | All Other Roles |
> |--------|:-----------:|:-----------:|:---------------:|
> | seo_patientFirstName | Read+Write | Read+Write | **Blocked** |
> | seo_patientLastName | Read+Write | Read+Write | **Blocked** |
> | seo_patientAge | Read+Write | Read+Write | **Blocked** |
> | seo_patientGender | Read+Write | Read+Write | **Blocked** |
> | seo_chiefComplaint | Read+Write | Read+Write | **Blocked** |
> | seo_assessmentNotes | Read+Write | Read+Write | **Blocked** |
> | seo_treatmentNotes | Read+Write | Read+Write | **Blocked** |
>
> Non-PHI columns (triageCategory, isTransported, refusedCare, destinationFacilityId, etc.) are accessible per the table-level privileges above.

---

## Mutual Aid

### seo_MutualAidAgreement

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | BU | — | — | — | — | — | — |
| Read      | O | BU | O | O | — | — | BU | BU |
| Write     | O | BU | — | — | — | — | — | — |
| Delete    | O | — | — | — | — | — | — | — |
| Append    | O | BU | — | — | — | — | — | — |
| AppendTo  | O | BU | O | O | — | — | BU | — |
| Assign    | O | — | — | — | — | — | — | — |
| Share     | O | BU | — | — | — | — | — | — |

### seo_MutualAidRequest

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | BU | BU | BU | — | — | — | — |
| Read      | O | BU | BU | BU | U | U | BU | BU |
| Write     | O | BU | BU | BU | — | — | — | — |
| Delete    | O | — | — | — | — | — | — | — |
| Append    | O | BU | BU | BU | — | — | — | — |
| AppendTo  | O | BU | BU | BU | U | U | BU | — |
| Assign    | O | BU | — | — | — | — | — | — |
| Share     | O | BU | — | BU | — | — | — | — |

---

## Planning / Reference

### seo_PrePlan

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | — | — | — | — | — | BU | — |
| Read      | O | O | O | O | O | O | O | O |
| Write     | O | — | — | — | — | — | BU | — |
| Delete    | O | — | — | — | — | — | — | — |
| Append    | O | — | — | — | — | — | BU | — |
| AppendTo  | O | O | O | O | O | O | O | — |
| Assign    | O | — | — | — | — | — | — | — |
| Share     | O | — | — | — | — | — | — | — |

### seo_Hazard

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | BU | — | BU | — | — | BU | — |
| Read      | O | O | O | O | O | O | O | O |
| Write     | O | BU | — | BU | — | — | BU | — |
| Delete    | O | — | — | — | — | — | — | — |
| Append    | O | BU | — | BU | — | — | BU | — |
| AppendTo  | O | O | O | O | O | O | O | — |
| Assign    | O | — | — | — | — | — | — | — |
| Share     | O | — | — | — | — | — | — | — |

### seo_Hydrant

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | — | — | — | — | — | — | — |
| Read      | O | O | O | O | O | O | O | O |
| Write     | O | — | — | — | — | — | — | — |
| Delete    | O | — | — | — | — | — | — | — |
| Append    | O | — | — | — | — | — | — | — |
| AppendTo  | O | O | O | O | O | O | O | — |
| Assign    | O | — | — | — | — | — | — | — |
| Share     | O | — | — | — | — | — | — | — |

---

## After-Action

### seo_AfterActionReport

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Create    | O | BU | — | BU | — | — | BU | — |
| Read      | O | BU | BU | BU | U | U | BU | BU |
| Write     | O | BU | — | BU | — | — | BU | — |
| Delete    | O | — | — | — | — | — | — | — |
| Append    | O | BU | — | BU | — | — | BU | — |
| AppendTo  | O | BU | BU | BU | U | U | BU | — |
| Assign    | O | BU | — | BU | — | — | BU | — |
| Share     | O | BU | — | BU | — | — | BU | — |

---

## Miscellaneous Privileges Summary

| Privilege | SystemAdmin | DispatchSupervisor | Dispatcher | IncidentCommander | Responder | EMSProvider | StationOfficer | ReadOnlyAnalyst |
|-----------|:-----------:|:------------------:|:----------:|:-----------------:|:---------:|:-----------:|:--------------:|:---------------:|
| Bulk Delete | Yes | — | — | — | — | — | — | — |
| Export to Excel | Yes | Yes | Yes | Yes | — | — | Yes | Yes |
| Import Data | Yes | — | — | — | — | — | — | — |
| Publish Customizations | Yes | — | — | — | — | — | — | — |
| Manage Security Roles | Yes | — | — | — | — | — | — | — |
| Manage Business Units | Yes | — | — | — | — | — | — | — |
| Manage Users | Yes | — | — | — | — | — | — | — |
| Manage Teams | Yes | — | — | — | — | — | — | — |
| Manage Field Security | Yes | — | — | — | — | — | — | — |
| Audit Log Access | Yes | Yes | — | — | — | — | — | Yes |
| Go Offline (Mobile) | — | — | — | — | Yes | Yes | Yes | — |

---

## Verification Checklist

- [x] **Every table has at least one role with full CRUD:** SystemAdmin has Organization-level CRUD on all 22 tables
- [x] **PHI columns restricted:** Only EMSProvider and SystemAdmin have Read+Write on the 7 PHI columns via field security profile
- [x] **Mutual aid doesn't leak PHI:** Cross-BU sharing via Mutual Aid Partners team and access teams does NOT grant PHI column access. Cross-agency EMS providers must have the field security profile individually assigned.
- [x] **UnitStatusLog is append-only:** All roles except SystemAdmin have Create-only (no Write or Delete). Immutable audit trail enforced.
- [x] **Reference tables are org-wide read:** Agency, Jurisdiction, Facility, PrePlan, Hazard, and Hydrant have Organization-level Read for all roles (or BU-level minimum)
- [x] **Responder/EMSProvider use User scope + team sharing:** Base privileges are User-level; incident access comes from owner team sharing
- [x] **PatientRecord delete restricted:** Only SystemAdmin can delete patient records (HIPAA retention compliance)
- [x] **Go Offline:** Enabled only for field roles (Responder, EMSProvider, StationOfficer) who need mobile offline capability
