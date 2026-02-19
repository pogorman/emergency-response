# Deployment Guide

> **Audience:** Platform admins deploying EmergencyResponseCoordination to GCC Dataverse
> **Prerequisites:** GCC tenant, Dataverse environments provisioned, service principal configured

---

## Prerequisites

### Infrastructure
- [ ] Azure GCC tenant with Entra ID (Azure AD)
- [ ] 3 Dataverse environments provisioned (Dev, Test, Prod) — all GCC type
- [ ] Power Platform license assignments (per-user or per-app)
- [ ] On-premises data gateway installed and configured (for Power BI)

### Service Principal
- [ ] Entra ID app registration created (see [GCC-SETUP.md](GCC-SETUP.md))
- [ ] Client secret or certificate generated
- [ ] Service principal added as Dataverse application user in each environment
- [ ] `seo_SystemAdmin` security role assigned to the application user

### Local Tools
- [ ] Node.js 18+ installed
- [ ] Power Platform CLI (`pac`) installed: `npm install -g @microsoft/powerplatform-cli`
- [ ] Git access to this repository
- [ ] Environment variable `SEO_CLIENT_SECRET` set in your shell

### Solution Package
- [ ] Solution .zip file exported from Dev (or built from source)
- [ ] Managed .zip for Test/Prod, Unmanaged .zip for Dev

---

## Step-by-Step Runbook

### 1. Clone and Install

```bash
git clone <repo-url>
cd deployment/scripts
npm install
```

### 2. Configure Environment

Edit the appropriate config file in `deployment/config/`:
- `dev.json` — Development (Sandbox, Unmanaged)
- `test.json` — Test (Sandbox, Managed)
- `prod.json` — Production (Production, Managed)

**Required edits:**
1. Set `tenantId` to your GCC tenant GUID
2. Set `environmentUrl` to your Dataverse URL (e.g., `https://seo-dev.crm9.dynamics.com`)
3. Set `authentication.clientId` to your app registration client ID
4. Set `authentication.authority` to `https://login.microsoftonline.us/{tenantId}`
5. Set connection reference binding IDs (get from Power Platform Admin Center)
6. Set environment variable values per environment

### 3. Validate

```bash
# Compile TypeScript
npx tsc --noEmit

# Validate all spec files against schemas
npx tsx src/validate/validate-specs.ts

# Run GCC compliance check
npx tsx src/validate/validate-gcc.ts --env ../config/dev.json
```

### 4. Dry Run

```bash
export SEO_CLIENT_SECRET="your-client-secret"
npx tsx src/deploy/deploy-all.ts --env ../config/dev.json --dry-run --verbose
```

Review the output. No changes are made in dry-run mode.

### 5. Deploy

```bash
# Full deployment
npx tsx src/deploy/deploy-all.ts --env ../config/dev.json --verbose

# Skip specific steps
npx tsx src/deploy/deploy-all.ts --env ../config/dev.json --skip-step sample-data-import

# Production (sample data always skipped)
npx tsx src/deploy/deploy-all.ts --env ../config/prod.json --skip-step sample-data-import
```

### 6. Verify

After deployment, verify in the Power Platform Admin Center:

- [ ] Solution appears in Solutions list with correct version
- [ ] All 22 tables exist with correct columns
- [ ] 8 security roles are present
- [ ] Business Units created for each agency
- [ ] 4 teams per agency BU + Mutual Aid Partners team
- [ ] Environment variables set to correct values
- [ ] Connection references bound to correct connections
- [ ] Power Automate flows are On (enable manually if needed)
- [ ] Canvas app accessible in Power Apps mobile
- [ ] Model-driven app accessible in browser

---

## Deployment Steps Reference

| Step | Script | What It Does |
|------|--------|-------------|
| 1 | `01-environment-setup.ts` | Authenticates, verifies environment connectivity |
| 2 | `02-solution-import.ts` | Imports solution .zip (backs up existing first) |
| 3 | `03-environment-variables.ts` | Sets all 18 env var values |
| 4 | `04-connection-references.ts` | Binds 5 connection references |
| 5 | `05-security-provision.ts` | Creates BUs, teams, assigns roles |
| 6 | `06-sample-data-import.ts` | Imports 22 sample data files with @ref: resolution |
| 7 | `07-powerbi-setup.ts` | Configures Power BI workspace and documents RLS |

---

## Environment Promotion Path

```
Dev (Unmanaged) → Test (Managed) → Prod (Managed)
```

1. **Dev → Test:** Export managed solution from Dev, import to Test
2. **Test → Prod:** Same managed .zip, import to Prod with `--skip-step sample-data-import`

**Never import Unmanaged to Test or Prod.**

---

## Verification Checklist

### Post-Deployment Smoke Test

| # | Check | How to Verify |
|---|-------|---------------|
| 1 | Solution installed | Solutions list in Admin Center |
| 2 | Tables created | Data → Tables in maker portal |
| 3 | Roles available | Settings → Security → Security Roles |
| 4 | BUs created | Settings → Security → Business Units |
| 5 | Teams created | Settings → Security → Teams |
| 6 | Env vars set | Solutions → EmergencyResponseCoordination → Environment Variables |
| 7 | Connections bound | Solutions → EmergencyResponseCoordination → Connection References |
| 8 | Flows enabled | Solutions → Cloud Flows — verify all 10 are On |
| 9 | Canvas app loads | Power Apps mobile → Responder Mobile |
| 10 | MDA loads | Power Apps → Dispatch Console |
| 11 | Sample data visible | Open Active Incidents view — 5 scenarios |
| 12 | PHI protected | Log in as Responder — PHI fields show "***" |

---

## Troubleshooting

### Authentication Failures

**Symptom:** "AADSTS7000215: Invalid client secret"
- Rotate the client secret in Entra ID
- Update `SEO_CLIENT_SECRET` environment variable

**Symptom:** "AADSTS50126: Error validating credentials"
- Verify the service principal is a Dataverse application user
- Verify it has `seo_SystemAdmin` role in the target environment

### Solution Import Failures

**Symptom:** "Missing dependency"
- Import the base Dataverse solution components first
- Check that no required managed solutions are missing

**Symptom:** "Solution import timeout"
- Large solutions may take 10-15 minutes
- Increase timeout in pac-wrapper.ts if needed

### Connection Reference Errors

**Symptom:** "Connection not found"
- Create the connection in Power Platform Admin Center first
- Copy the connection ID to the config file
- Connection must be created by the same service principal or shared

### Sample Data Import Errors

**Symptom:** "Unresolved reference"
- Check import order matches sample-data/README.md
- Circular refs should be null in pass 1 and resolved in pass 2
- If a ref file is missing, the dependent record will have null FK

### Power BI Issues

**Symptom:** "Gateway required"
- Install and configure the on-premises data gateway
- Bind datasets to the gateway in Power BI Service
- See [GCC-SETUP.md](GCC-SETUP.md) for gateway setup
