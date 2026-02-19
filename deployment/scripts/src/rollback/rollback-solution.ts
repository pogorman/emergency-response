/**
 * Rollback: Uninstall solution or revert to a previous version.
 *
 * Usage:
 *   npx tsx src/rollback/rollback-solution.ts --env ../../config/dev.json
 *   npx tsx src/rollback/rollback-solution.ts --env ../../config/dev.json --dry-run
 *   npx tsx src/rollback/rollback-solution.ts --env ../../config/dev.json --restore-from backup.zip
 */

import { existsSync } from "node:fs";
import { loadEnvironmentConfig } from "../utils/config-loader.js";
import { createDeploymentContext } from "../types/deployment-context.js";
import * as log from "../utils/logger.js";
import * as pac from "../utils/pac-wrapper.js";

async function main(): Promise<void> {
  log.setStep("ROLLBACK-SOLUTION");
  log.header("Rollback: Solution");

  const args = process.argv.slice(2);
  const envArg = args.find((a) => a.startsWith("--env="))?.split("=")[1]
    ?? args[args.indexOf("--env") + 1];
  const isDryRun = args.includes("--dry-run");
  const restoreFrom = args.find((a) => a.startsWith("--restore-from="))?.split("=")[1]
    ?? args[args.indexOf("--restore-from") + 1];

  if (!envArg) {
    log.error("Usage: npx tsx src/rollback/rollback-solution.ts --env <config-file> [--dry-run] [--restore-from <backup.zip>]");
    process.exit(1);
  }

  const config = loadEnvironmentConfig(envArg);
  const ctx = createDeploymentContext(config, {
    envFile: envArg,
    isDryRun,
    skipSteps: [],
    verbose: false,
  });

  // Authenticate
  log.info("Authenticating...");
  const clientSecret = process.env[config.authentication.clientSecretEnvVar];
  if (!clientSecret && !isDryRun) {
    throw new Error(`Missing environment variable: ${config.authentication.clientSecretEnvVar}`);
  }

  pac.authCreateServicePrincipal(
    config.tenantId,
    config.authentication.clientId,
    clientSecret ?? "dry-run-placeholder",
    config.cloudType,
    isDryRun
  );
  pac.orgSelect(config.environmentUrl, isDryRun);

  if (restoreFrom) {
    // Restore from backup
    if (!existsSync(restoreFrom) && !isDryRun) {
      throw new Error(`Backup file not found: ${restoreFrom}`);
    }

    log.info(`Restoring solution from backup: ${restoreFrom}`);
    log.warn("This will overwrite the current solution installation.");

    const result = pac.solutionImport(
      restoreFrom,
      config.solution.importType,
      true,
      true,
      isDryRun
    );

    if (result.exitCode !== 0 && !isDryRun) {
      throw new Error("Solution restore failed");
    }

    log.success("Solution restored from backup");
  } else {
    // Uninstall solution
    log.warn(`Uninstalling solution: ${config.solution.uniqueName}`);
    log.warn("This will remove all solution components. Data in tables will be preserved.");

    const result = pac.solutionDelete(config.solution.uniqueName, isDryRun);

    if (result.exitCode !== 0 && !isDryRun) {
      throw new Error("Solution uninstall failed");
    }

    log.success(`Solution ${config.solution.uniqueName} uninstalled`);
  }
}

main().catch((err) => {
  log.error(`Rollback failed: ${err}`);
  process.exit(1);
});
