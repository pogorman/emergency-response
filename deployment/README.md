# Deployment / GCC Auth Scripts

> **Phase 7** of EmergencyResponseCoordination
> **Format:** TypeScript scripts + JSON config templates + CI/CD workflows
> **Audience:** Platform admins deploying the solution to GCC Dataverse environments

---

## Overview

This directory contains the deployment automation layer for EmergencyResponseCoordination. Scripts are admin-run CLI tools with `--dry-run` support — not zero-touch automation (ADR-025). CI/CD provides structure with manual approval gates.

**Key components:**
- **Environment configs** — JSON templates for Dev/Test/Prod with all env vars + connection refs
- **TypeScript scripts** — 7-step deployment pipeline + 3 rollback scripts + 2 validators
- **CI/CD templates** — GitHub Actions workflows for PR validation and environment promotion
- **Documentation** — Step-by-step runbook, GCC setup guide, rollback procedures

---

## Directory Structure

```
deployment/
├── _schema/
│   └── deployment-definition-schema.json    # JSON Schema for env config files
├── README.md                                # This file
├── config/
│   ├── environments.schema.json             # IDE auto-completion schema
│   ├── dev.json                             # Dev (Sandbox, Unmanaged, sample data)
│   ├── test.json                            # Test (Sandbox, Managed, sample data)
│   └── prod.json                            # Prod (Production, Managed, NO sample data)
├── scripts/
│   ├── package.json                         # npm dependencies (exact versions)
│   ├── tsconfig.json                        # Strict TypeScript config
│   └── src/
│       ├── types/                           # TypeScript interfaces
│       │   ├── environment-config.ts        # Env config JSON types + GCC endpoints
│       │   ├── deployment-context.ts        # Shared context between steps
│       │   └── dataverse-api.ts             # Dataverse Web API response types
│       ├── utils/                           # Shared utilities
│       │   ├── logger.ts                    # Structured logging [STEP] [LEVEL] [timestamp]
│       │   ├── pac-wrapper.ts               # Typed wrapper for pac CLI (--cloud UsGov)
│       │   ├── dataverse-client.ts          # Web API client (MSAL auth, GCC endpoints)
│       │   ├── config-loader.ts             # Config loading + JSON Schema validation
│       │   └── ref-resolver.ts              # @ref: symbolic FK → GUID resolution
│       ├── validate/                        # Validation scripts
│       │   ├── validate-specs.ts            # Validate all Phase 1-6 JSON specs
│       │   └── validate-gcc.ts              # 12-point GCC compliance checker
│       ├── deploy/                          # Deployment pipeline
│       │   ├── 01-environment-setup.ts      # Verify environment, authenticate
│       │   ├── 02-solution-import.ts        # Import solution (managed/unmanaged)
│       │   ├── 03-environment-variables.ts  # Set 18 env var values
│       │   ├── 04-connection-references.ts  # Bind 5 connection references
│       │   ├── 05-security-provision.ts     # Create BUs, teams, assign roles
│       │   ├── 06-sample-data-import.ts     # Import 22 files with @ref: resolution
│       │   ├── 07-powerbi-setup.ts          # Power BI workspace + RLS setup
│       │   └── deploy-all.ts               # Orchestrator (--env, --dry-run, --skip-step)
│       └── rollback/                        # Rollback scripts
│           ├── rollback-solution.ts         # Uninstall or revert solution
│           ├── rollback-security.ts         # Deactivate BUs/teams
│           └── rollback-data.ts             # Delete sample data (reverse order)
├── ci-cd/
│   ├── pipeline-config.json                 # Shared CI/CD settings
│   └── github-actions/
│       ├── validate-pr.yml                  # PR: build, validate, lint
│       ├── deploy-dev.yml                   # Merge to main → deploy Dev
│       ├── promote-test.yml                 # Manual + approval → Test
│       └── promote-prod.yml                 # Manual + dual approval → Prod
└── docs/
    ├── DEPLOYMENT.md                        # Full deployment runbook
    ├── GCC-SETUP.md                         # Tenant, app reg, gateway, firewall
    └── ROLLBACK.md                          # Rollback decision tree + procedures
```

---

## Quick Start

```bash
cd deployment/scripts
npm install

# Validate everything
npx tsc --noEmit
npx tsx src/validate/validate-specs.ts
npx tsx src/validate/validate-gcc.ts --env ../config/dev.json

# Dry-run deployment
export SEO_CLIENT_SECRET="your-service-principal-secret"
npx tsx src/deploy/deploy-all.ts --env ../config/dev.json --dry-run --verbose

# Real deployment
npx tsx src/deploy/deploy-all.ts --env ../config/dev.json --verbose
```

---

## Translation Guide: Config → Power Platform

### Environment Config → Dataverse Environment

| Config Field | Where It Goes |
|-------------|---------------|
| `environmentUrl` | Power Platform Admin Center → Environment URL |
| `tenantId` | Entra ID → Tenant ID |
| `authentication.clientId` | Entra ID → App registration → Client ID |
| `solution.importType` | Solutions → Import → Managed or Unmanaged toggle |
| `environmentVariables.*` | Solutions → Environment Variables → Current Value |
| `connectionReferences.*` | Solutions → Connection References → Connection dropdown |
| `agencies[]` | Settings → Business Units (one BU per agency) |
| `sampleData.importSampleData` | Whether to populate tables with demo data |
| `powerBI.workspaceId` | Power BI Service → Workspace → Settings → Workspace ID |

### GCC Endpoint Strategy (ADR-026)

All scripts use `cloudType` to select endpoints. No commercial endpoints exist in any script file.

| Cloud Type | Dataverse | Auth | Power BI | Graph |
|-----------|-----------|------|----------|-------|
| GCC | `.crm9.dynamics.com` | `login.microsoftonline.us` | `api.powerbigov.us` | `graph.microsoft.us` |
| GCC High | `.crm.microsoftdynamics.us` | `login.microsoftonline.us` | `api.powerbigov.us` | `graph.microsoft.us` |

### PHI Production Guard (ADR-027)

`06-sample-data-import.ts` has a **hard code-level block** on `patient-records.json` when the target is Production:
- Config-level: `prod.json` has `includePhiRecords: false`
- Code-level: Script throws an error for Production regardless of config
- Manual path: Admin uses Dataverse Import Wizard with explicit PHI awareness

---

## GCC Compliance Matrix

The `validate-gcc.ts` script checks 12 compliance points:

| # | Check | Severity | What It Validates |
|---|-------|----------|-------------------|
| 1 | Cloud type | ERROR | `cloudType` is GCC or GCCHigh |
| 2 | API endpoint | ERROR | URL matches `.crm9` (GCC) or `.microsoftdynamics.us` (High) |
| 3 | Auth endpoint | ERROR | Authority uses `login.microsoftonline.us` |
| 4 | Connector audit | ERROR | All 5 connectors are FedRAMP authorized |
| 5 | Custom connectors | WARNING | No unapproved custom connectors |
| 6 | Environment type | WARNING | Matches config (Sandbox/Production) |
| 7 | Data residency | ERROR | GCC guarantees US Government residency |
| 8 | PHI guard (prod) | ERROR | `includePhiRecords === false` for Production |
| 9 | Power BI endpoint | WARNING | Scripts use `api.powerbigov.us` |
| 10 | Audit enabled | WARNING | Requires live check post-deployment |
| 11 | TLS version | ERROR | Node 18+ enforces TLS 1.2+ |
| 12 | Service account role | ERROR | `seo_ServiceAccountUserId` is set |

---

## Architecture Decisions

- **ADR-024:** pac CLI for solution ALM, Web API for BU/team/record operations
- **ADR-025:** Interactive admin-run scripts, not zero-touch CI/CD
- **ADR-026:** GCC endpoint selection via `cloudType` config value
- **ADR-027:** Hard block on PHI sample data in Production environments

See `docs/TECHNICAL.md` for full ADR documentation.
