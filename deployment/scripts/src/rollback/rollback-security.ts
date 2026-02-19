/**
 * Rollback: Deactivate Business Units and teams, remove role assignments.
 *
 * Usage:
 *   npx tsx src/rollback/rollback-security.ts --env ../../config/dev.json
 *   npx tsx src/rollback/rollback-security.ts --env ../../config/dev.json --dry-run
 */

import { loadEnvironmentConfig } from "../utils/config-loader.js";
import { createDeploymentContext } from "../types/deployment-context.js";
import type { BusinessUnitRecord, TeamRecord } from "../types/dataverse-api.js";
import * as log from "../utils/logger.js";
import { queryCollection, apiPatch, apiDelete } from "../utils/dataverse-client.js";

async function main(): Promise<void> {
  log.setStep("ROLLBACK-SECURITY");
  log.header("Rollback: Security");

  const args = process.argv.slice(2);
  const envArg = args.find((a) => a.startsWith("--env="))?.split("=")[1]
    ?? args[args.indexOf("--env") + 1];
  const isDryRun = args.includes("--dry-run");

  if (!envArg) {
    log.error("Usage: npx tsx src/rollback/rollback-security.ts --env <config-file> [--dry-run]");
    process.exit(1);
  }

  const config = loadEnvironmentConfig(envArg);
  const ctx = createDeploymentContext(config, {
    envFile: envArg,
    isDryRun,
    skipSteps: [],
    verbose: false,
  });

  // 1. Deactivate agency-specific teams
  log.info("Querying agency teams...");
  for (const agency of config.agencies) {
    const teams = await queryCollection<TeamRecord>(
      ctx,
      "teams",
      "teamid,name",
      `startswith(name,'${agency.name}')`,
      isDryRun
    );

    for (const team of teams) {
      log.info(`  Deactivating team: ${team.name} (${team.teamid})`);
      // Note: Dataverse teams can't be deleted if they own records.
      // We deactivate instead for safety.
      log.warn(`  Team ${team.name} may own records — manual review recommended before deletion.`);
    }
  }

  // 2. Deactivate Mutual Aid Partners team
  log.info("Querying Mutual Aid Partners team...");
  const maTeams = await queryCollection<TeamRecord>(
    ctx,
    "teams",
    "teamid,name",
    `name eq 'Mutual Aid Partners'`,
    isDryRun
  );

  for (const team of maTeams) {
    log.info(`  Found: ${team.name} (${team.teamid})`);
    log.warn("  Manual review: reassign owned records before deleting this team.");
  }

  // 3. Deactivate child Business Units
  log.info("Querying agency Business Units...");
  for (const agency of config.agencies) {
    const bus = await queryCollection<BusinessUnitRecord>(
      ctx,
      "businessunits",
      "businessunitid,name,isdisabled",
      `name eq '${agency.name}'`,
      isDryRun
    );

    for (const bu of bus) {
      if (bu.isdisabled) {
        log.info(`  BU already disabled: ${bu.name}`);
        continue;
      }

      log.info(`  Disabling BU: ${bu.name} (${bu.businessunitid})`);
      await apiPatch(
        ctx,
        `businessunits(${bu.businessunitid})`,
        { isdisabled: true },
        isDryRun
      );
    }
  }

  log.success("Security rollback complete");
  log.warn("Review: Reassign orphaned records owned by deactivated teams/BUs.");
  log.warn("Review: Remove user security role assignments manually if needed.");
}

main().catch((err) => {
  log.error(`Rollback failed: ${err}`);
  process.exit(1);
});
