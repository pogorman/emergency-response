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

> *Content will be added in Phase 4.*

---

## For Supervisors / ICs

> *Content will be added in Phase 5.*

---

## For Administrators

> *Content will be added in Phase 2 (Security Model) and Phase 7 (Deployment).*

---

## FAQ

> *Content will be added as the solution matures.*
