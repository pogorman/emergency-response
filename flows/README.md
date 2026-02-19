# Power Automate Flow Definitions

> **Phase 3** of EmergencyResponseCoordination

This directory contains JSON specification files for Power Automate cloud flows. These are **blueprints** — not exported flow packages — designed to be translated into the Power Automate designer.

---

## Directory Structure

```
flows/
├── _schema/
│   └── flow-definition-schema.json    # JSON Schema all definitions validate against
├── README.md                          # This file
├── tier-1/                            # Must-have flows (5)
│   ├── seo_unit-status-change-log.json
│   ├── seo_incident-status-progression.json
│   ├── seo_agency-onboarding.json
│   ├── seo_mutual-aid-team-management.json
│   └── seo_incident-sharing.json
└── tier-2/                            # High-value flows (5)
    ├── seo_incident-assignment-auto-name.json
    ├── seo_after-action-report-creation.json
    ├── seo_notify-dispatch-supervisor/
    │   ├── seo_notify-mci-alarm.json
    │   ├── seo_notify-mutual-aid-request.json
    │   └── seo_notify-command-transfer.json
    ├── seo_patient-count-sync.json
    └── seo_mutual-aid-agreement-expiry.json
```

## How to Read a Flow Definition

Each JSON file follows the schema in `_schema/flow-definition-schema.json`. Key sections:

| Section | What It Describes |
|---------|-------------------|
| `flowId` / `displayName` | Unique ID and human-readable name |
| `flowType` | Automated (Dataverse trigger), Scheduled, or Instant |
| `securityContext` | Whether the flow runs as the triggering user or a service account |
| `trigger` | What fires the flow: table change, schedule, or manual |
| `trigger.filterColumns` | Which columns must change to fire — critical for loop prevention |
| `steps` | Ordered list of Power Automate actions |
| `connectionReferences` | Which connectors the flow needs |
| `environmentVariables` | Which env vars the flow reads |
| `circularTriggerPrevention` | How the flow avoids infinite loops with other flows |
| `errorHandling` | Failure strategy and notification config |
| `phiCompliance` | Attestation that the flow does/doesn't access PHI columns |

## Translating Specs to Power Automate Designer

### Step 1: Create the Flow
1. Open Power Automate in the GCC environment
2. Create a new **Cloud flow** matching the `flowType`
3. Add the flow to the **EmergencyResponseCoordination** solution

### Step 2: Configure the Trigger
- Match the `trigger.type` to the appropriate Power Automate trigger
- For Dataverse triggers, set the **table**, **scope**, **filter columns**, and **filter expression** exactly as specified
- Filter columns are comma-separated in the trigger's "Column filter" field

### Step 3: Build the Steps
- Follow the `steps` array in order
- Use the `connector` field to select the correct connection reference
- Map `inputs` to the action's input fields
- For conditions, build the branching logic per the `condition` object
- For loops, use "Apply to each" with the specified `forEach` expression

### Step 4: Configure Security Context
- **TriggeringUser flows:** Leave the default connection (the trigger runs under the modifying user's identity)
- **FlowOwner flows:** Configure the Dataverse connection to use the service account specified in `seo_ServiceAccountUserId`. The service account must have the `seo_SystemAdmin` role.

### Step 5: Error Handling
- For `TryCatch` strategy: wrap the main logic in a Scope, add a parallel Scope with "Configure run after" set to "has failed"
- Set retry policies on Dataverse actions as specified
- Email notifications use `seo_FlowErrorNotificationEmail` environment variable

### Step 6: Test
- Test with the trigger conditions described in the spec
- Verify the flow doesn't trigger itself (check `circularTriggerPrevention`)
- Confirm PHI columns are never accessed (check `phiCompliance`)

## Security Context Summary

| Flow | Runs As | Why |
|------|---------|-----|
| UnitStatusChangeLog | TriggeringUser | Stays within user's BU permissions |
| IncidentStatusProgression | TriggeringUser | Only updates the incident the user modified |
| AgencyOnboarding | FlowOwner | Creates Business Units and teams (requires SystemAdmin) |
| MutualAidTeamManagement | FlowOwner | Manages cross-BU teams and access teams |
| IncidentSharing | FlowOwner | Shares records across teams (requires elevated privileges) |
| IncidentAssignmentAutoName | TriggeringUser | Only updates the assignment the user created |
| AfterActionReportCreation | FlowOwner | Creates AAR records on behalf of the system |
| NotifyDispatchSupervisor (3) | FlowOwner | Reads cross-BU data for notifications |
| PatientCountSync | FlowOwner | Updates incident records across BU boundaries |
| MutualAidAgreementExpiry | FlowOwner | Reads all agreements org-wide for digest |

## Circular Trigger Prevention

All flows use `filterColumns` to scope their triggers to specific column changes. The only intentional cascade is:

```
PatientCountSync (updates seo_Incident.seo_patientCount, seo_isMCI)
    → NotifyMCIAlarm (triggers on seo_Incident.seo_isMCI, seo_alarmLevel)
```

This is a one-hop chain that terminates because NotifyMCIAlarm only sends email — it doesn't update Dataverse rows.

## Environment Variables Used by Flows

| Variable | Used By |
|----------|---------|
| `seo_MCIPatientThreshold` | PatientCountSync |
| `seo_MutualAidExpiryWarningDays` | MutualAidAgreementExpiry |
| `seo_DispatchSupervisorEmail` | NotifyMCIAlarm, NotifyMutualAidRequest, NotifyCommandTransfer |
| `seo_FlowErrorNotificationEmail` | All flows (error handling) |
| `seo_ServiceAccountUserId` | AgencyOnboarding, MutualAidTeamManagement, IncidentSharing, AfterActionReportCreation, PatientCountSync, MutualAidAgreementExpiry, NotifyDispatchSupervisor (3) |
