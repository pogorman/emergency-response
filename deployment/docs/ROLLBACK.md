# Rollback Procedures

> **Audience:** Platform admins performing rollback operations
> **When to use:** Deployment failures, broken functionality, or data quality issues

---

## Decision Framework

| Scenario | Recommended Action | Script |
|----------|--------------------|--------|
| Solution import failed mid-way | Restore from backup | `rollback-solution.ts --restore-from` |
| Solution works but needs downgrade | Restore previous version | `rollback-solution.ts --restore-from` |
| Solution needs complete removal | Uninstall solution | `rollback-solution.ts` |
| Security config incorrect | Deactivate BUs/teams | `rollback-security.ts` |
| Sample data needs cleanup | Delete all sample data | `rollback-data.ts` |
| Single step failed | Re-run deployment with `--skip-step` for completed steps | `deploy-all.ts` |

---

## Rollback Scripts

### Solution Rollback

```bash
# Uninstall the solution (preserves table data)
npx tsx src/rollback/rollback-solution.ts --env ../config/dev.json

# Restore from a backup zip
npx tsx src/rollback/rollback-solution.ts --env ../config/dev.json --restore-from ./solution-backup-2026-02-18.zip

# Dry run
npx tsx src/rollback/rollback-solution.ts --env ../config/dev.json --dry-run
```

**What it does:**
- Without `--restore-from`: Runs `pac solution delete` to uninstall the solution
- With `--restore-from`: Re-imports the specified solution .zip file

**What it preserves:**
- Table data (records) — uninstalling a solution does NOT delete data
- Custom views/forms not part of the solution

**What it removes:**
- Solution components (tables, forms, views, flows, apps)
- Security roles defined in the solution
- Environment variable definitions

### Security Rollback

```bash
npx tsx src/rollback/rollback-security.ts --env ../config/dev.json
npx tsx src/rollback/rollback-security.ts --env ../config/dev.json --dry-run
```

**What it does:**
- Disables (not deletes) agency Business Units
- Identifies teams that may need manual cleanup
- Warns about records owned by teams/BUs that will be orphaned

**Important:** Dataverse does not allow deleting teams that own records. You must reassign record ownership before deleting teams. The script warns about this.

### Data Rollback

```bash
npx tsx src/rollback/rollback-data.ts --env ../config/dev.json
npx tsx src/rollback/rollback-data.ts --env ../config/dev.json --dry-run
```

**What it does:**
- Deletes all records from sample data tables in reverse dependency order
- Handles FK constraints by deleting child records before parents

**Restrictions:**
- Blocked for Production environments (code-level block)
- Dev/Test only

---

## Per-Component Rollback Procedures

### Environment Variables

**Manual rollback:** Reset values in Power Platform Admin Center → Environment Variables.

Or re-run step 3 with corrected config:
```bash
npx tsx src/deploy/deploy-all.ts --env ../config/dev.json \
  --skip-step environment-setup \
  --skip-step solution-import \
  --skip-step connection-references \
  --skip-step security-provision \
  --skip-step sample-data-import \
  --skip-step powerbi-setup
```

### Connection References

**Manual rollback:** Edit connection references in Solutions → EmergencyResponseCoordination → Connection References. Select the correct connection for each.

### Power Automate Flows

If a flow is causing issues:
1. Navigate to Solutions → Cloud Flows
2. Turn off the specific flow
3. Fix the underlying issue
4. Turn the flow back on

**Bulk disable:** Turn off all flows, then re-enable one by one during troubleshooting.

### Power BI

1. Delete datasets/reports from the Power BI workspace
2. Re-publish from Power BI Desktop after fixing issues
3. Re-configure RLS role assignments
4. Re-bind gateway connections

---

## Post-Rollback Verification

After any rollback:

| # | Check | How |
|---|-------|-----|
| 1 | Solution state correct | Solutions list in Admin Center |
| 2 | No orphaned records | Check tables for records without valid FKs |
| 3 | Flows in correct state | Cloud Flows list — all should be On or intentionally Off |
| 4 | Users can still log in | Test each security role |
| 5 | Apps load correctly | Open both Canvas and MDA apps |
| 6 | Audit trail intact | Check UnitStatusLog and system audit logs |

---

## Recovery from Partial Deployment

If deployment fails mid-step, use `--skip-step` to resume:

```bash
# Example: Steps 1-3 completed, step 4 failed
npx tsx src/deploy/deploy-all.ts --env ../config/dev.json \
  --skip-step environment-setup \
  --skip-step solution-import \
  --skip-step environment-variables \
  --verbose
```

The orchestrator shows which steps completed, failed, or were skipped in the summary output.

---

## Emergency Contacts

| Role | Responsibility |
|------|---------------|
| Platform Admin | Solution deployment, environment management |
| Security Officer | Role assignments, PHI access, audit review |
| Power BI Admin | Report publishing, RLS, gateway management |
| Microsoft GCC Support | Environment issues, service health |
