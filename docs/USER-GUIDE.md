# EmergencyResponseCoordination — User Guide

> **Audience:** Dispatchers, responders, supervisors, administrators
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
8. [FAQ](#faq)

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

> *Content will be added in Phase 4 (Canvas App) and Phase 5 (Model-Driven App).*

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

> *Content will be added in Phase 4-5.*

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

> *Content will be added in Phase 5.*

---

## For Administrators

> *Content will be added in Phase 2 (Security Model) and Phase 7 (Deployment).*

---

## FAQ

> *Content will be added as the solution matures.*
