# Reporting / Power BI Layer

> **Phase 6** of EmergencyResponseCoordination
> **Format:** JSON specification files (blueprints) — not live Power BI deployments
> **Audience:** Report builders translating specs into Power BI Desktop / Service

---

## Overview

This directory contains specifications for 5 Power BI datasets and 8 reports (~33 pages) that provide historical analytics, KPIs, and cross-agency analysis. These complement the MDA's real-time dashboards (Phase 5) with trend analysis, benchmarking, and operational intelligence.

**Key distinction:** MDA dashboards = live operational monitoring. Power BI reports = historical analytics and trends.

---

## Directory Structure

```
reporting/
├── _schema/
│   └── report-definition-schema.json    # JSON Schema for all spec files
├── README.md                            # This file
├── datasets/
│   ├── incident-analytics.json          # Core incident metrics
│   ├── unit-operations.json             # Unit utilization & workload
│   ├── ems-operations.json              # EMS metrics (NO PHI)
│   ├── mutual-aid-cost.json             # Mutual aid & cost tracking
│   └── outcomes-after-action.json       # Loss metrics & cause analysis
├── measures/
│   └── shared-measures.json             # DAX measures shared across reports
├── rls/
│   └── agency-rls.json                  # Row-level security definition
└── reports/
    ├── response-performance.json        # NFPA benchmarks, response times
    ├── incident-operations.json         # Incident volume & types
    ├── unit-utilization.json            # Unit availability & workload
    ├── ems-analytics.json               # Triage, transport, facility
    ├── mutual-aid-cost.json             # Agreement utilization & costs
    ├── executive-summary.json           # KPI cards, cross-agency comparison
    ├── station-management.json          # Station workload, apparatus, pre-plans
    └── after-action-outcomes.json       # Loss, cause, injury/fatality trends
```

---

## Spec Format

Each JSON file validates against `_schema/report-definition-schema.json`. The `definitionType` field determines the schema variant:

| `definitionType` | Used In | Description |
|-------------------|---------|-------------|
| `dataset` | `datasets/*.json` | Star-schema data model with tables, columns, relationships, measures, RLS |
| `report` | `reports/*.json` | Report pages, visuals, fields, filters, slicers |
| `sharedMeasures` | `measures/shared-measures.json` | DAX measures referenced across multiple reports |
| `rls` | `rls/agency-rls.json` | Row-level security roles and mapping table |

---

## Translation Guide: Spec → Power BI Desktop

### Step 1: Create a Dataset

1. Open Power BI Desktop
2. **Get Data → Dataverse**
3. Connect to the GCC Dataverse environment
4. For each table in the dataset spec's `tables` array:
   - Select the Dataverse table listed in `source`
   - Include only the columns listed in `columns` (by `sourceColumn`)
   - Apply any `filters` in Power Query Editor
5. Rename columns to match the `name` property
6. Set data types to match `dataType`

### Step 2: Build the Date Dimension

Every dataset includes a shared Date table. Create it in Power Query or DAX:

```dax
Date =
ADDCOLUMNS(
    CALENDAR(DATE(YEAR(TODAY()) - 3, 1, 1), DATE(YEAR(TODAY()), 12, 31)),
    "Year", YEAR([Date]),
    "Quarter", "Q" & FORMAT([Date], "Q"),
    "Month", FORMAT([Date], "MMMM"),
    "MonthNumber", MONTH([Date]),
    "Week", WEEKNUM([Date]),
    "DayOfWeek", FORMAT([Date], "dddd"),
    "DayOfWeekNumber", WEEKDAY([Date]),
    "IsWeekend", IF(WEEKDAY([Date]) IN {1, 7}, TRUE, FALSE),
    "FiscalYear", IF(MONTH([Date]) >= 7, YEAR([Date]) + 1, YEAR([Date]))
)
```

Mark as Date table: **Modeling → Mark as Date Table → Date column**.

### Step 3: Create Relationships

For each relationship in the spec:
1. **Model view → Drag** `fromColumn` to `toColumn`
2. Set cardinality to match `cardinality`
3. Set cross-filter direction to match `crossFilterDirection`
4. Set `isActive` flag

### Step 4: Add Measures

For each measure in the spec (or in `shared-measures.json`):
1. **New Measure** in the appropriate table (or a dedicated `_Measures` table)
2. Paste the DAX `expression`
3. Set the `format` in the Formatting pane
4. Optionally assign to a `folder`

### Step 5: Configure RLS

1. **Modeling → Manage Roles**
2. Create each role from `rls/agency-rls.json`
3. Add the `AgencyUserMapping` table to the dataset
4. Apply the DAX filter from `tableFilters[].daxFilter`
5. **Test with "View as Roles"** before publishing

### Step 6: Build Report Pages

For each page in the report spec:
1. Add a new page, rename to `displayName`
2. Add slicers from the `slicers` array
3. Add each visual from the `visuals` array:
   - Select the visual type matching `type`
   - Drag fields from `fields` into the appropriate wells (Values, Axis, Legend, etc.)
   - Set title from `title`
   - Apply conditional formatting from `conditionalFormatting`
   - Configure sort from `sortBy`

### Step 7: Publish to Power BI Service (GCC)

1. **File → Publish → Select workspace** (use `seo_PowerBIWorkspaceId` env var)
2. In Power BI Service:
   - Configure scheduled refresh (per `refreshSchedule`)
   - Set up the Dataverse gateway connection
   - Assign RLS members to roles
   - Share reports with appropriate security groups

---

## GCC Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| No DirectQuery to Dataverse | Must use Import mode | Scheduled refresh every 4 hours (configurable) |
| No Power BI Embedded | Cannot embed in Power Apps | Use native Power BI Service URLs; link from MDA sitemap |
| No uncertified custom visuals | AppSource marketplace restricted | All specs use standard Power BI visuals only |
| No AI visuals | Q&A, Key Influencers unavailable | Not referenced in any report spec |
| Gateway required | Dataverse connector needs gateway in GCC | Document gateway setup in deployment guide (Phase 7) |
| Dataflows supported | Can use for ETL if needed | Not required for initial deployment |

---

## PHI Compliance

### Policy: Zero PHI in Power BI

The 7 PHI columns on `seo_PatientRecord` are **completely excluded** from all Power BI datasets. They are not filtered, not hidden, not masked — they are **never imported**.

**Excluded PHI columns:**
1. `seo_patientFirstName`
2. `seo_patientLastName`
3. `seo_patientAge`
4. `seo_patientGender`
5. `seo_chiefComplaint`
6. `seo_assessmentNotes`
7. `seo_treatmentNotes`

**Safe columns used in EMS Analytics dataset:**
- `seo_triageCategory` — triage classification (no patient identity)
- `seo_isTransported` — transport yes/no
- `seo_refusedCare` — refusal yes/no
- `seo_transportStartedOn` — transport timestamp
- `seo_arrivedAtFacilityOn` — arrival timestamp
- `seo_destinationFacilityId` — facility FK (resolved to facility name)
- `seo_incidentId` — incident FK

**Rationale:** Power BI datasets are cached extracts stored outside Dataverse's field-level security boundary. Even with RLS, including PHI would create an uncontrolled copy. This approach is the only way to guarantee HIPAA compliance in the reporting layer.

**If patient-level detail is needed:** Use the MDA PatientRecord form (PHI tab, gated by `seo_PHIAccess` field security profile).

---

## Row-Level Security

RLS mirrors the Dataverse BU-based isolation. Each agency sees only their own data.

| RLS Role | Filter | Assigned To |
|----------|--------|-------------|
| Agency Filter | Dynamic filter on Agency dimension via AgencyUserMapping table | DispatchSupervisor, StationOfficer, ReadOnlyAnalyst |
| All Agencies | No filter (sees all data) | SystemAdmin, designated cross-agency analysts |

### AgencyUserMapping Table

Each dataset includes an `AgencyUserMapping` table that maps agency GUIDs to user UPNs:

| Column | Description |
|--------|-------------|
| `AgencyId` | seo_Agency GUID |
| `UserPrincipalName` | Azure AD UPN (user@agency.gov) |

This table is populated during deployment and maintained as users change agencies (aligned with `seo_AgencyOnboarding` flow).

---

## Report → Audience Matrix

| Report | DispatchSupervisor | StationOfficer | ReadOnlyAnalyst | SystemAdmin |
|--------|-------------------|----------------|-----------------|-------------|
| Response Performance | Own agency | — | Own agency | All agencies |
| Incident Operations | Own agency | — | Own agency | All agencies |
| Unit Utilization | Own agency | Own agency | Own agency | All agencies |
| EMS Analytics | Own agency | — | Own agency | All agencies |
| Mutual Aid & Cost | Own agency | — | Own agency | All agencies |
| Executive Summary | — | — | Own agency | All agencies |
| Station Management | — | Own agency | Own agency | All agencies |
| After-Action & Outcomes | Own agency | — | Own agency | All agencies |

Dispatchers, ICs, Responders, and EMSProviders use MDA dashboards and the canvas app — not Power BI.

---

## Refresh Strategy

- **Mode:** Import (scheduled refresh) — ADR-019
- **Default interval:** Every 4 hours (configurable via `seo_PowerBIDatasetRefreshHours`)
- **Data staleness:** Up to 4 hours — acceptable for trend/analytics reports
- **Real-time needs:** Handled by MDA dashboards (Phase 5)
- **Gateway:** Required for Dataverse connector in GCC environments
