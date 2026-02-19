# EmergencyResponseCoordination — User Guide

> **Audience:** Dispatchers, responders, supervisors, analysts, administrators
> **Solution:** EmergencyResponseCoordination for Microsoft Power Platform (GCC)

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Automated Workflows](#automated-workflows)
4. [For Dispatchers](#for-dispatchers)
5. [For Responders](#for-responders)
6. [For Supervisors / ICs](#for-supervisors--ics)
7. [For Administrators](#for-administrators)
8. [For Analysts / Report Consumers](#for-analysts--report-consumers)
9. [FAQ](#faq)

---

## Overview

EmergencyResponseCoordination is an integrated platform for fire and EMS agencies to manage the full lifecycle of emergency incidents — from initial call intake through dispatch, on-scene operations, patient care coordination, mutual aid, and after-action reporting.

### Key Capabilities (planned)
- **Call intake and incident management** — Capture 911/dispatch calls, classify incidents, assign priority
- **Dispatch and unit tracking** — Assign units, track apparatus and personnel status in real time
- **ICS command structure** — Establish incident command, divisions, resource requests
- **EMS workflow** — Patient triage, transport tracking (PHI-protected)
- **Mutual aid coordination** — Request and provide inter-agency resources
- **After-action reporting** — Incident timelines, outcomes, lessons learned

---

## Getting Started

### Two Apps, Two Audiences

The solution includes two apps:

| App | Form Factor | Audience | Purpose |
|-----|------------|----------|---------|
| **Dispatch Console** | Desktop / Tablet | Dispatchers, Supervisors, ICs, Station Officers, Analysts | Incident lifecycle, dispatch, ICS command, planning, administration |
| **Responder Mobile** | Phone (portrait) | Field Responders, EMS Providers | Unit status, incident details, notes, patient triage, maps |

### Accessing the Dispatch Console

1. Open Power Apps from your browser (make.powerapps.com for GCC)
2. Select the **Dispatch Console & Supervisor Dashboard** app
3. Your default landing page is the **Dispatch Operations** dashboard
4. Use the left navigation pane to switch between areas: Dispatch Operations, ICS Command, Planning, Administration

### Accessing Responder Mobile

1. Install the **Power Apps** mobile app on your phone
2. Open the **Responder Mobile** app
3. See the [For Responders](#for-responders) section below

---

## Automated Workflows

The system includes automated workflows (Power Automate flows) that run behind the scenes. You don't need to start them — they trigger automatically based on your actions.

### What Happens Automatically

#### When a Unit Changes Status
Every status change (Available → Dispatched → En Route → On Scene, etc.) is automatically logged in the Unit Status Log. This creates a permanent, tamper-proof record of when each unit changed status, who initiated it, and the unit's GPS location at the time.

#### When Timestamps Are Set on an Incident
The incident's status automatically advances to match the latest operational milestone:
- Set **Dispatched On** → status becomes "Dispatched"
- Set **First Unit On Scene** → status becomes "On Scene"
- Set **Cleared On** → status becomes "Cleared"
- Set **Closed On** → status becomes "Closed"

You don't need to manually update the status dropdown — just populate the timestamps.

#### When a Unit or Person Is Assigned to an Incident
- The incident is automatically shared with your agency's teams so all dispatchers, responders, EMS, and command staff can see it
- The assignment record's name is auto-generated (e.g., "E1 - INC-20260218-00042")
- For mutual aid assignments, the incident is also shared with the providing agency's teams

#### When a New Agency Is Added
A new Business Unit and 4 teams (Dispatchers, Responders, EMS, Command) are automatically created. No manual setup needed.

#### When a Mutual Aid Request Is Approved
- Personnel from the providing agency are automatically added to the Mutual Aid Partners team
- A per-incident access team is created so they can see the specific incident
- When the request status changes to Returned or Cancelled, the access is automatically cleaned up

#### When a Patient Record Is Created
The parent incident's patient count is automatically updated. If the count reaches the MCI threshold (default: 5 patients), the incident is automatically flagged as a Mass Casualty Incident.

#### When an Incident Is Closed
A draft After-Action Report is automatically created with pre-populated fields (incident summary, timeline, author set to the last Incident Commander). The station officer or IC can then complete the remaining fields.

### Supervisor Email Alerts

Dispatch supervisors automatically receive email alerts for critical events:
- **MCI declared or alarm level changed** — high-priority email with incident details
- **Mutual aid request status changes** — tracks the full lifecycle (requested → approved → deployed → returned)
- **Command established or transferred** — includes old and new IC names

### Daily Digest: Mutual Aid Agreement Expiry

Supervisors receive a daily email (7:00 AM ET) listing any mutual aid agreements expiring within the next 30 days. This helps ensure agreements are renewed before they lapse.

### What You Need to Know
- These automations run silently — you'll only notice the email alerts
- If something seems wrong (missing status log, AAR not created), contact your system administrator
- Supervisors can configure the alert email address through environment variables

---

## For Dispatchers

The **Dispatch Console** model-driven app is your primary tool for call intake, incident management, and unit dispatch.

### Call Intake

1. Navigate to **Dispatch Operations → Call Management → Calls**
2. Click **+ New** (or use Quick Create from the top bar)
3. Fill in:
   - **Received On** — auto-populated with current time
   - **Call Source** — 911, Non-Emergency, Radio, etc.
   - **Caller Name / Phone** — for callback
   - **Reported Incident Type** and **Priority** — initial assessment
   - **Incident Address** — location of the emergency
4. Check for duplicates — if this call reports an already-known incident, toggle **Duplicate** and link the existing incident
5. Save the call record

### Creating an Incident

1. From a call record, click **+ New Incident** (Quick Create)
2. Or navigate to **Dispatch Operations → Active Dispatch → Incidents** → **+ New**
3. Required fields: **Incident Type**, **Priority**, **Address**, **Primary Agency**
4. The system auto-generates an incident number (INC-YYYYMMDD-XXXXX)
5. Save — the incident starts in **Reported** status

### Dispatching Units

1. Open the incident record
2. Go to the **Dispatch** tab
3. In the **Assigned Units** subgrid, click **+ New Assignment**
4. Select the **Unit** and set **Assigned On** timestamp
5. Save — the system auto-names the assignment (e.g., "E1 - INC-20260218-00001")
6. The incident status auto-advances to **Dispatched** when you set the Dispatched On timestamp

### Incident Lifecycle (BPF)

The blue process bar at the top of every incident guides you through 6 stages:

| Stage | What to Do | What Advances It |
|-------|------------|-----------------|
| **Reported** | Capture type, priority, address | Fill required fields |
| **Dispatched** | Assign units, set dispatch time | Set Dispatched On + at least 1 assignment |
| **On Scene** | First unit arrives | Set First Unit On Scene timestamp |
| **Under Control** | IC declares under control | Set Under Control On timestamp |
| **Cleared** | All units cleared | Set Cleared On + all assignments have Cleared On |
| **Closed** | Complete narrative | Set Closed On + write incident narrative |

**Tip:** You don't need to manually change the status dropdown — just populate the timestamps and the system advances the status automatically.

### Declaring an MCI

If you're a **Dispatch Supervisor**, the incident command bar shows a **Declare MCI** button when an incident isn't already flagged as MCI. Clicking it:
1. Asks for confirmation
2. Sets `isMCI = true`
3. Triggers a supervisor notification email
4. Cannot be undone from the UI (SystemAdmin can reset if needed)

The system also auto-declares MCI when the patient count reaches 5 (configurable threshold).

### Key Views

| View | What It Shows |
|------|--------------|
| **Active Incidents** | All incidents not Closed or Cancelled — your main working list |
| **Open Calls** | Calls without a linked incident — need attention |
| **Available Units** | Units ready for dispatch |
| **All Units by Status** | Every unit with current status — the dispatch board |

### Dashboard

The **Dispatch Operations Dashboard** is your at-a-glance view:
- **Active Incidents** — list of all open incidents sorted by priority
- **Unit Status Distribution** — pie chart showing how many units are Available, On Scene, etc.
- **Open Calls** — calls awaiting dispatch action
- **Recent Status Changes** — stream of latest unit status updates

---

## For Responders

The **Responder Mobile** app is your primary tool for managing unit status, viewing incident details, and communicating on-scene. It works on your phone in portrait mode and is designed for one-hand use with gloves.

### Getting Started

1. Open the **Responder Mobile** app from your device's Power Apps app
2. The app resolves your identity automatically — your name, rank, and unit assignment display on the Home screen
3. If you see "Not assigned" for your unit, contact your station officer to update your Personnel record

### Home Screen

Your dashboard shows:
- **Unit designator** (e.g., E1, M7) in the header
- **Status banner** — large colored banner showing your current status. Tap to change.
- **Active incident card** — if you're assigned to an incident, it shows here. Tap for details.
- **Quick action buttons** — Notes, Pre-Plan (if available), and Map

The green globe icon (top right) means you're online. An orange warning icon means you're offline — the app still works, and changes sync when you reconnect.

### Changing Your Status

Tap the status banner on Home, or navigate to the Status screen. You'll see large color-coded buttons:

| Status | Color | When to Use |
|--------|-------|-------------|
| **Available** | Green | Ready for dispatch |
| **En Route** | Yellow | Responding to an incident |
| **On Scene** | Red | Arrived at incident |
| **Transporting** | Purple | Transporting a patient (EMS) |
| **At Hospital** | Blue | At the hospital (EMS) |
| **Returning** | Teal | Heading back to station |
| **Out of Service** | Gray | Unavailable (mechanical, training, etc.) |
| **Staging** | Light Orange | At a staging area awaiting assignment |

**What happens when you change status:**
- Your GPS location is captured automatically (if GPS is enabled in Settings)
- The system creates a permanent log entry — this is your official record
- If dispatch has already set you to "Dispatched," you'll see that status; tap "En Route" when you start responding

### Viewing Incident Details

Tap the active incident card on Home to see:
- **Hazard banner** (red) — if hazards are reported, they appear at the top. Read these first!
- **Address and cross street** — tap "Open in Maps" for turn-by-turn directions
- **Timestamps** — dispatched, en route, on scene, under control
- **Assigned units** — all units on this incident, with ICS roles and mutual aid badges
- **ICS command** — command name, incident commander, radio channel, strategy (Offensive/Defensive/Transitional)
- **Action buttons** — Add Note, view Pre-Plan

### Using the Map

The Map screen shows:
- **Red pin** — incident location
- **Colored hydrant pins** — NFPA 291 color coding: Blue (1500+ GPM), Green (1000-1499), Orange (500-999), Red (<500 GPM)
- **Purple pins** — pre-plan building locations
- **Blue dot** — your current GPS position

Tap a hydrant pin to see flow rate, outlet configuration, and status. Toggle hydrant and pre-plan layers on/off with the switches in the header.

### Adding Incident Notes

Navigate to Notes from the bottom bar or the quick action on Home:
1. Tap **+ Note**
2. Select a note type (On-Scene Report, Safety Alert, Command Decision, etc.)
3. Type your note
4. Toggle **Priority** if it's urgent
5. Tap **Save Note**

Notes appear in reverse chronological order. Safety Alert notes display in red. Priority notes show a flag icon.

### Viewing Pre-Plans

If the incident has a linked pre-plan, you can access it from the Incident Detail screen:
- **Building info** — occupancy type, construction type, stories, square footage
- **Fire protection badges** — Sprinkler (green), Alarm (blue), FDC (orange), Standpipe (purple), Basement (red)
- **FDC location** — highlighted in orange for quick identification
- **Tactical notes** — recommended strategies (red header = high priority)
- **Access notes** — Knox box, gates, keys, access roads
- **Known hazards** — NFPA 704 ratings (H:Health, F:Fire, R:Reactivity, S:Special)
- **Emergency contact** — tap the phone number to call

### For EMS Providers: Patient Triage

If you have the EMS Provider role, you'll see a **Patients** tab in the bottom navigation bar.

**Adding a patient:**
1. Tap **+ Patient**
2. Select triage category using the color-coded buttons (RED/YEL/GRN/BLK/WHT)
3. Fill in patient information (name, age, chief complaint, assessment, treatment)
4. If transporting, toggle **Transported** and select the destination hospital
5. Tap **Save Patient**

The triage summary bar at the top shows counts by category — critical for MCI management.

**Important:** When you create a patient record, the system automatically updates the incident's patient count. If the count reaches the MCI threshold (default: 5), the incident is automatically flagged as an MCI and dispatch supervisors are notified.

### Settings

- **GPS toggle** — turn GPS tracking on/off. When on, your location is captured on every status change and updated periodically.
- **Sync status** — shows whether you're online or offline and explains the sync behavior
- **Profile** — your name, rank, badge number, unit assignment, and role

### Working Offline

The app works offline. When you lose connectivity:
- You can still change status, add notes, and create patient records
- Changes are cached on your device
- When connectivity returns, everything syncs automatically
- If dispatch made changes while you were offline, their changes take priority (Server Wins)

The orange warning icon in the header tells you you're offline. The Settings screen provides more detail about sync status.

---

## For Supervisors / ICs

### Dispatch Supervisor

As a dispatch supervisor, you have full access to all four areas of the Dispatch Console.

#### Supervisor Dashboard

Navigate to **Administration → Settings → Supervisor Dashboard** for your overview:
- **MCI Incidents** — any active mass casualty incidents requiring elevated coordination
- **Active Mutual Aid Requests** — cross-agency resource requests in progress
- **Units by Agency** — bar chart of unit counts across all agencies
- **Alarm Level Distribution** — chart of active incidents by alarm level

#### Managing MCIs

When an MCI occurs:
1. Use the **Declare MCI** button on the incident (or let the system auto-flag at 5+ patients)
2. Monitor the **MCI Incidents** view for all active MCIs
3. Coordinate mutual aid via **Planning → Mutual Aid → Mutual Aid Requests**
4. Track patient status via **ICS Command → Patients → Patient Records**

#### Mutual Aid

1. Navigate to **Planning → Mutual Aid → Agreements** to view standing agreements
2. The **Expiring Soon** view highlights agreements within 90 days of expiration
3. To request mutual aid: open the incident → go to **Planning → Mutual Aid Requests** → **+ New**
4. You'll receive email alerts when mutual aid request statuses change

#### Email Alerts You'll Receive

- **MCI declared or alarm level changed** — immediate email with incident details
- **Mutual aid request lifecycle** — status changes (requested → approved → deployed → returned)
- **Command established/transferred** — when ICS command changes
- **Daily digest** — mutual aid agreements expiring within 30 days (7:00 AM ET)

### Incident Commander

The **ICS Command** area is your workspace. Use the **ICS Command Dashboard** for:
- **Active Commands** — your established command posts
- **Active Assignments** — all units/personnel assigned to incidents under your command
- **Resource Requests** — pending and in-progress resource requests
- **Incident Notes** — stream of operational notes from all personnel

#### Establishing Command

1. Navigate to **ICS Command → Command → Commands**
2. Click **+ New** → fill in command name, incident, your name as IC, radio channel, strategy
3. Add divisions from the **Divisions** tab (use Quick Create for speed)
4. Assign personnel to ICS roles via **Incident Assignments** (select the person, set the ICS Role)

#### Resource Requests

1. Open the incident → **ICS** tab → **Resource Requests** subgrid → **+ New**
2. Fill in resource type, quantity, urgency, justification
3. The request flows through: Requested → Approved → Dispatched → On Scene → Released

#### Strategy Mode

Set the strategy on the IncidentCommand record:
- **Offensive** — interior operations, active fire attack
- **Defensive** — exterior operations only, surround and drown
- **Transitional** — shifting between offensive and defensive
- **Investigation** — cause/origin investigation phase

### Station Officer

#### Station Dashboard

Navigate to **Administration → Settings → Station Dashboard** for:
- **Station Units** — your station's units with current status
- **Personnel Roster** — personnel assigned to your station
- **Draft AARs** — after-action reports needing completion
- **Pre-Plans** — facility pre-plans in your area

#### Pre-Plans

1. Navigate to **Planning → Pre-Plans → Pre-Plans**
2. Create new pre-plans with building info, fire protection systems, hazards, tactical notes
3. Link hazards to pre-plans from the **Fire Protection** tab
4. Update the **Last Inspected** date after facility inspections

#### After-Action Reports

When an incident is closed, the system auto-creates a draft AAR. To complete it:
1. Navigate to **Planning → After-Action Reports → AARs**
2. Open the **Draft AARs** view
3. Fill in: timeline of events, outcomes, injuries/fatalities, property loss, cause of fire
4. Complete the **Lessons Learned** and **Improvement Actions** tabs
5. Change status from Draft → Under Review → Approved → Final

---

## For Administrators

### Agency Onboarding

When a new agency joins the system:
1. Create the agency record in **Administration → Agencies → Agencies**
2. The system automatically provisions:
   - A new Business Unit for the agency
   - 4 owner teams: {Agency} Dispatchers, Responders, EMS, Command
3. Assign users to the appropriate BU and security roles
4. Assign personnel records to link Dataverse users to their operational identity

### Security Roles

| Role | Who Gets It | What They Can Do |
|------|------------|-----------------|
| **SystemAdmin** | IT/Platform admins | Full CRUD on everything, BU management |
| **DispatchSupervisor** | Shift supervisors | Full incident lifecycle, MCI declaration, mutual aid |
| **Dispatcher** | Call-takers, dispatchers | Call intake, incident creation, unit dispatch |
| **IncidentCommander** | On-scene ICs | ICS command, divisions, resource requests |
| **Responder** | Firefighters | Unit status (own unit), incident notes |
| **EMSProvider** | Paramedics, EMTs | Patient records with PHI access |
| **StationOfficer** | Station captains | Station management, pre-plans, AARs |
| **ReadOnlyAnalyst** | Reporting staff | Read-only across all tables |

### PHI Access

Patient health information (names, age, clinical data) is restricted to EMSProvider and SystemAdmin roles:
- Other roles see "***" in PHI fields
- The PatientRecord form's "Patient Info (PHI)" tab is only visible to authorized roles
- PatientRecord views intentionally exclude PHI columns

To grant PHI access: assign the `seo_PHIAccess` field security profile to the user in the Dataverse admin center.

### Environment Variables

Key settings configurable per environment:

| Variable | Default | What It Controls |
|----------|---------|-----------------|
| Default Agency ID | *(set per env)* | Pre-populated agency on new records |
| MCI Patient Threshold | 5 | Patient count that auto-flags MCI |
| Dispatch Supervisor Email | *(set per env)* | Recipient for supervisor alert emails |
| GPS Update Interval | 30 seconds | How often mobile app sends GPS updates |
| Offline Sync Interval | 5 minutes | How often mobile app syncs with server |
| Default Dashboard ID | *(set per env)* | Landing page dashboard for Dispatch Console |

Configure in Power Platform Admin Center → Environments → Environment Variables.

### Managing Stations & Apparatus

1. **Administration → Stations & Equipment → Stations** — add/edit fire/EMS stations
2. **Administration → Stations & Equipment → Apparatus** — manage vehicles and their home stations
3. Link apparatus to units for the current shift configuration

### Managing Personnel

1. **Administration → Personnel → Personnel** — add/edit staff records
2. Set **Current Unit** to assign personnel to their shift unit
3. Set **System User** to link the Dataverse login to the personnel record
4. Manage certifications, rank, paramedic status

---

## For Analysts / Report Consumers

### Overview

Power BI reports provide **historical analytics, trends, and KPIs** for supervisors, station officers, and analysts. These complement the MDA's real-time dashboards with deeper analysis — response time benchmarking, cross-agency comparison, and outcome tracking.

**Key difference:** MDA dashboards show *live operational state*. Power BI reports show *historical trends and aggregated metrics* (refreshed every 4 hours).

### Available Reports

| Report | What It Shows | Who Uses It |
|--------|--------------|-------------|
| **Response Performance** | Response times, NFPA 1710 compliance, turnout vs travel breakdown, time-of-day heatmap | Supervisors, Analysts |
| **Incident Operations** | Incident volume trends, type distribution, priority breakdown, MCI summary, geographic heatmap | Supervisors, Analysts |
| **Unit Utilization** | Unit availability %, busy time, calls per unit, out-of-service tracking | Supervisors, Station Officers, Analysts |
| **EMS Analytics** | Triage distribution, transport rate, scene-to-hospital time, facility destinations, MCI patient breakdown | Supervisors, Analysts |
| **Mutual Aid & Cost** | Request volume by agency pair, cost tracking, agreement status | Supervisors, Analysts |
| **Executive Summary** | KPI cards, cross-agency comparison, YoY trends, NFPA compliance, top-10 tables | Analysts, System Admins |
| **Station Management** | Station workload, apparatus utilization, personnel coverage | Station Officers, Analysts |
| **After-Action & Outcomes** | Property/content loss, cause analysis, injury/fatality trends, AAR completion rate | Supervisors, Analysts |

### Accessing Reports

1. Open **Power BI Service** (app.powerbigov.us for GCC)
2. Navigate to the **EmergencyResponseCoordination** workspace
3. Select the report you want to view
4. Use **slicers** (date range, agency, incident type) to filter data
5. Right-click on data points to **drill through** for detail

### Understanding Row-Level Security

Reports automatically filter data based on your agency assignment:

- **Supervisors, Station Officers, Analysts** — see only your own agency's data
- **System Admins** — see all agencies (cross-agency comparison enabled)

You do not need to configure anything — RLS is applied automatically when you open a report.

### Key Metrics Explained

| Metric | What It Means | Target |
|--------|--------------|--------|
| **NFPA 1710 Compliance %** | Percentage of incidents where first unit arrived within 6 minutes 20 seconds of dispatch | ≥ 90% |
| **Avg Response Time** | Average minutes from dispatch to first unit on scene | ≤ 6.33 min |
| **90th Percentile Response** | Response time below which 90% of incidents fall — shows worst-case performance | ≤ 8 min |
| **Turnout Time** | Time from dispatch notification to first unit leaving the station | ≤ 1.33 min (80 sec) |
| **Travel Time** | Time from en route to on scene | ≤ 4 min |
| **Transport Rate %** | Percentage of EMS patients who were transported to a facility | Varies |
| **Scene-to-Hospital (min)** | Average transport time from scene departure to hospital arrival | Varies by distance |
| **Unit Availability %** | Percentage of time units spent in Available status | ≥ 70% |

### Data Freshness

Power BI reports use **Import mode** — data refreshes every **4 hours**. The timestamp of the last refresh appears in the Power BI Service dataset details.

For real-time operational status, use the **Dispatch Console** MDA dashboards instead.

### PHI and Patient Privacy

Power BI reports contain **zero patient-identifying information**. The EMS Analytics report shows only:
- Triage category (e.g., Immediate, Delayed, Minor)
- Transport status (yes/no)
- Transport timestamps
- Destination facility name

Patient names, ages, genders, complaints, and clinical notes are **never** included in Power BI. If you need patient-level detail, use the PatientRecord form in the Dispatch Console (requires EMSProvider or SystemAdmin role).

---

## FAQ

> *Content will be added as the solution matures.*
