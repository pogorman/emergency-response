# Canvas App Definitions

> **Phase 4** of EmergencyResponseCoordination

This directory contains JSON specification files for Power Apps canvas apps. These are **blueprints** — not exported .msapp packages — designed to be translated into the Power Apps Studio designer.

---

## Directory Structure

```
apps/
├── _schema/
│   └── canvas-app-definition-schema.json    # JSON Schema all definitions validate against
├── README.md                                # This file
└── seo_responder-mobile/
    ├── app-definition.json                  # App-level config: data sources, offline, theme, globals
    ├── screens/
    │   ├── home-screen.json                 # Dashboard: status badge, active incident, quick actions
    │   ├── unit-status-screen.json          # Full-screen status change with GPS capture
    │   ├── incident-detail-screen.json      # Incident info, assigned units, hazards, ICS command
    │   ├── map-screen.json                  # Incident pin, hydrant pins, pre-plan pins, GPS dot
    │   ├── notes-screen.json                # Incident note timeline + create new note
    │   ├── patient-triage-screen.json       # EMS only — patient list, triage form, transport
    │   ├── pre-plan-screen.json             # Building info, NFPA 704 diamonds, tactical notes
    │   └── settings-screen.json             # User profile, GPS toggle, sync status
    └── components/
        ├── navigation-bar.json              # Bottom tab bar (Home, Map, Notes, Settings)
        ├── status-button-group.json         # Unit status button strip with GPS capture
        └── incident-card.json               # Incident summary card for galleries
```

## How to Read a Spec File

Each JSON file follows the schema in `_schema/canvas-app-definition-schema.json`. Key sections:

### App Definition (`app-definition.json`)

| Section | What It Describes |
|---------|-------------------|
| `appId` / `displayName` | Unique ID and human-readable name |
| `formFactor` | Phone or Tablet layout |
| `targetRoles` | Security roles this app serves |
| `dataSources` | Dataverse tables, access level, offline sync filters |
| `offlineProfile` | Offline-first config, conflict resolution, sync interval |
| `theme` | Colors, fonts, min touch target, status color map |
| `globalVariables` | Variables set on App.OnStart (current user, unit, etc.) |
| `navigation` | Screen list, tab bar config, role-gated screens |
| `gccConstraints` | GCC-specific limitations and mitigations |

### Screen Definition (`screens/*.json`)

| Section | What It Describes |
|---------|-------------------|
| `screenId` | Power Apps screen name (scr prefix) |
| `roleAccess` | Which roles can see this screen |
| `onVisible` | Screen.OnVisible formula |
| `dataSources` | Tables this screen reads/writes |
| `contextVariables` | Screen-local variables (loc prefix) |
| `controls` | Hierarchical control tree with Power Fx formulas |
| `phiCompliance` | Whether this screen accesses PHI columns |
| `flowInteractions` | Which Power Automate flows are triggered by actions here |

### Component Definition (`components/*.json`)

| Section | What It Describes |
|---------|-------------------|
| `componentId` | Component name (cmp prefix) |
| `customProperties` | Input/output properties (like function parameters) |
| `controls` | Internal control tree |

## Control Naming Convention

All controls follow Power Apps standard prefixes:

| Prefix | Control Type | Example |
|--------|-------------|---------|
| `lbl` | Label | `lblIncidentNumber` |
| `btn` | Button | `btnChangeStatus` |
| `gal` | Gallery | `galAssignedUnits` |
| `txt` | TextInput | `txtNoteBody` |
| `drp` | Dropdown | `drpNoteType` |
| `frm` | Form / EditForm | `frmPatientRecord` |
| `ico` | Icon | `icoNavHome` |
| `img` | Image | `imgPrePlanPhoto` |
| `cmp` | Component | `cmpNavigationBar` |
| `shp` | Shape / Rectangle | `shpStatusBadge` |
| `tmr` | Timer | `tmrGPSUpdate` |
| `tgl` | Toggle | `tglGPSEnabled` |
| `cnt` | Container | `cntHeader` |
| `map` | Map control | `mapIncident` |

## Variable Naming Convention

| Prefix | Scope | Example |
|--------|-------|---------|
| `gbl` | Global (Set across app) | `gblCurrentPersonnel`, `gblCurrentUnit` |
| `loc` | Context (Screen-local) | `locSelectedIncident`, `locIsEditing` |

## Translating Specs to Power Apps Studio

### Step 1: Create the App
1. Open Power Apps Studio (make.powerapps.com — GCC endpoint)
2. Create a new **Canvas app** → **Phone layout**
3. Add the app to the **EmergencyResponseCoordination** solution

### Step 2: Configure Data Sources
- Add all Dataverse tables listed in `app-definition.json → dataSources`
- Use the `seo_DataverseConnection` connection reference
- Enable offline mode per the `offlineProfile` section

### Step 3: Set Up App.OnStart
- Implement the `onStart` formula from `app-definition.json`
- This resolves the current user's Personnel record and Unit assignment

### Step 4: Build Components First
- Create each component from `components/*.json`
- Define custom properties per the `customProperties` array
- Build the internal control tree

### Step 5: Build Screens
- Create screens in the order listed in `navigation.screens`
- Set `OnVisible` per the `onVisible` formula in each screen spec
- Build controls from the `controls` array (nested hierarchy)
- Wire up navigation using `Navigate()` calls per the spec

### Step 6: Configure Offline
- In Power Apps Studio → Settings → General → enable offline
- Configure the offline profile per `offlineProfile.offlineTables`
- Set sync filters to limit cached data

### Step 7: Test
- Verify role gating (Patient Triage hidden for non-EMS users)
- Test offline mode (toggle airplane mode)
- Verify GPS capture on status change
- Confirm no PHI columns visible outside Patient Triage screen
- Test on physical device with gloves (touch target ≥ 44px)

## Security Boundaries

- **Patient Triage screen** is the ONLY screen that accesses PHI columns
- PHI is protected at two layers: screen-level role gate + Dataverse field security profile
- The app never creates UnitStatusLog rows — the `seo_UnitStatusChangeLog` flow handles that
- Offline sync respects Dataverse security — users only cache rows they can see

## Environment Variables Used

| Variable | Used For |
|----------|----------|
| `seo_MapDefaultLatitude` | Initial map center |
| `seo_MapDefaultLongitude` | Initial map center |
| `seo_MapDefaultZoom` | Initial zoom level |
| `seo_GPSUpdateIntervalSeconds` | GPS timer interval |
| `seo_OfflineSyncIntervalMinutes` | Offline cache sync interval |
| `seo_MCIPatientThreshold` | MCI badge threshold display |
