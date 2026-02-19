# GCC Environment Setup Guide

> **Audience:** IT administrators setting up the GCC infrastructure for EmergencyResponseCoordination
> **Prerequisite:** Access to the organization's Azure GCC tenant

---

## 1. GCC Tenant Provisioning

### Verify GCC Tenant Type

The organization must have an **Azure Government** (GCC or GCC High) tenant. Commercial Azure tenants cannot host GCC Dataverse environments.

```
Commercial:  *.onmicrosoft.com     → login.microsoftonline.com
GCC:         *.onmicrosoft.us      → login.microsoftonline.us
GCC High:    *.onmicrosoft.us      → login.microsoftonline.us
```

### Required Licenses
- Microsoft 365 GCC (G3 or G5)
- Power Apps per-user or per-app plan (GCC)
- Power Automate per-user plan (GCC) — for flow execution
- Power BI Pro or Premium Per User (GCC) — for report consumers
- Dataverse database capacity (1 GB minimum recommended)

---

## 2. Entra ID App Registration

Create a service principal for deployment automation.

### Step-by-Step

1. Sign in to the **Azure Government Portal** (portal.azure.us)
2. Navigate to **Entra ID → App registrations → New registration**
3. Configure:
   - **Name:** `SEO-Deployment-ServicePrincipal`
   - **Supported account types:** Single tenant
   - **Redirect URI:** Leave blank (no interactive auth)
4. Note the **Application (client) ID** — this is `authentication.clientId` in config
5. Note the **Directory (tenant) ID** — this is `tenantId` in config

### Client Secret

1. Go to **Certificates & secrets → New client secret**
2. Description: `SEO deployment`
3. Expiry: 6 months (rotate on schedule)
4. Copy the secret value — this is `SEO_CLIENT_SECRET`

**Security:** Store the secret in GitHub Secrets or Azure Key Vault. Never commit to source control.

### API Permissions

Add the following API permissions:

| API | Permission | Type | Purpose |
|-----|-----------|------|---------|
| Dynamics CRM | `user_impersonation` | Delegated | Dataverse Web API access |
| Power BI Service | `Tenant.ReadWrite.All` | Application | Power BI workspace management |

Grant admin consent for the tenant.

---

## 3. Dataverse Application User

Register the service principal as an application user in each Dataverse environment.

### For Each Environment (Dev, Test, Prod):

1. Open **Power Platform Admin Center** (admin.powerplatform.microsoft.us for GCC)
2. Select the environment → **Settings → Users + permissions → Application users**
3. Click **+ New app user**
4. Select the app registration created above
5. Set **Business Unit:** Root BU (State Emergency Operations)
6. Assign **Security Role:** `seo_SystemAdmin`

### Verify Access

```bash
export SEO_CLIENT_SECRET="your-secret"
pac auth create \
  --tenant <tenant-id> \
  --applicationId <client-id> \
  --clientSecret "$SEO_CLIENT_SECRET" \
  --cloud UsGov

pac org select --environment https://seo-dev.crm9.dynamics.com
pac org who
```

---

## 4. Environment Provisioning

### Create Environments

In Power Platform Admin Center:

| Environment | Type | URL Pattern | Purpose |
|-------------|------|-------------|---------|
| SEO Dev | Sandbox | `seo-dev.crm9.dynamics.com` | Development + testing |
| SEO Test | Sandbox | `seo-test.crm9.dynamics.com` | UAT + staging |
| SEO Prod | Production | `seo-prod.crm9.dynamics.com` | Live operations |

**Important:** Select **United States — Government** as the region for all environments.

### Enable Audit

For each environment:
1. Settings → Audit → Global Audit Settings
2. Enable **Start Auditing** and **Audit user access**
3. Set audit retention to your organization's policy (minimum 1 year recommended)

### Enable Dataverse Offline Mode

For the Responder Mobile app:
1. Settings → Features → Offline mode
2. Enable **Allow mobile offline mode**

---

## 5. GCC Endpoint Reference

| Service | GCC URL | GCC High URL |
|---------|---------|-------------|
| **Dataverse API** | `https://{org}.crm9.dynamics.com/api/data/v9.2` | `https://{org}.crm.microsoftdynamics.us/api/data/v9.2` |
| **Auth (Entra ID)** | `https://login.microsoftonline.us/{tenant}` | `https://login.microsoftonline.us/{tenant}` |
| **Power Platform Admin** | `https://admin.powerplatform.microsoft.us` | `https://admin.powerplatform.microsoft.us` |
| **Power Apps Maker** | `https://make.powerapps.us` | `https://make.powerapps.us` |
| **Power Automate** | `https://flow.microsoft.us` | `https://flow.microsoft.us` |
| **Power BI Service** | `https://app.powerbigov.us` | `https://app.powerbigov.us` |
| **Power BI API** | `https://api.powerbigov.us` | `https://api.powerbigov.us` |
| **Microsoft Graph** | `https://graph.microsoft.us` | `https://graph.microsoft.us` |

**Critical:** Never use commercial endpoints (`.com`) in GCC environments. All scripts validate this automatically.

---

## 6. Firewall / Network Requirements

If your network has outbound firewall rules, allow the following:

| Destination | Port | Purpose |
|-------------|------|---------|
| `*.crm9.dynamics.com` | 443 | Dataverse API |
| `login.microsoftonline.us` | 443 | Entra ID authentication |
| `graph.microsoft.us` | 443 | Microsoft Graph |
| `api.powerbigov.us` | 443 | Power BI API |
| `admin.powerplatform.microsoft.us` | 443 | Admin center |
| `make.powerapps.us` | 443 | Maker portal |
| `flow.microsoft.us` | 443 | Power Automate |

For GCC High, replace `.crm9.dynamics.com` with `.crm.microsoftdynamics.us`.

---

## 7. On-Premises Data Gateway

Required for Power BI Import mode from Dataverse in GCC.

### Installation

1. Download from the Power BI Service (app.powerbigov.us) → Settings → Manage gateways
2. Install on a server with network access to both GCC services and your organization network
3. Register the gateway with your GCC Power BI tenant

### Configuration

1. Open the gateway app → sign in with a GCC Power BI Pro account
2. Add a data source:
   - **Type:** Dataverse
   - **Server:** `seo-prod.crm9.dynamics.com` (your environment)
   - **Authentication:** Service Principal
3. Bind Power BI datasets to this gateway in Power BI Service → Settings → Datasets → Gateway connection

### High Availability

For production, install the gateway in **cluster mode** on 2+ servers for failover.

---

## 8. Connection Setup

Before deployment, create these connections in Power Platform Admin Center:

| Connection | Connector | Setup |
|-----------|-----------|-------|
| Dataverse | Microsoft Dataverse | Auto-created per environment |
| Office 365 Users | Office 365 Users | Service account or shared connection |
| SharePoint | SharePoint Online | Document library URL required |
| Outlook | Office 365 Outlook | Shared mailbox for notifications |
| Power BI | Power BI | Service principal with Power BI Admin |

For each connection, note the **Connection ID** (GUID) and add it to the environment config file.

---

## 9. Security Checklist

| # | Item | Verified |
|---|------|----------|
| 1 | GCC tenant confirmed (not commercial) | [ ] |
| 2 | Service principal uses client secret rotation (≤90 days) | [ ] |
| 3 | Service principal has minimum required permissions | [ ] |
| 4 | Audit logging enabled on all environments | [ ] |
| 5 | TLS 1.2+ enforced (GCC default) | [ ] |
| 6 | No custom connectors without FedRAMP approval | [ ] |
| 7 | PHI sample data blocked for production (ADR-027) | [ ] |
| 8 | Power BI RLS configured per agency | [ ] |
| 9 | Client secret stored in GitHub Secrets (not in code) | [ ] |
| 10 | Dataverse environments in US Government region | [ ] |
