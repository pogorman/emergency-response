/**
 * Step 2: Import solution (managed or unmanaged) via pac CLI.
 * - Backs up existing solution if present
 * - Imports the solution zip
 * - Publishes customizations
 */

import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { DeploymentContext } from "../types/deployment-context.js";
import type { SolutionRecord } from "../types/dataverse-api.js";
import * as log from "../utils/logger.js";
import * as pac from "../utils/pac-wrapper.js";
import { queryCollection } from "../utils/dataverse-client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run(ctx: DeploymentContext): Promise<void> {
  log.setStep("02-SOLUTION");
  log.header("Step 2: Solution Import");

  const { config, isDryRun } = ctx;
  const { solution } = config;

  // 1. Resolve solution file path
  const solutionPath = solution.solutionFilePath
    ? resolve(__dirname, "..", "..", "..", "..", solution.solutionFilePath)
    : resolve(__dirname, "..", "..", "..", "..", "solution", "EmergencyResponseCoordination.zip");

  if (!isDryRun && !existsSync(solutionPath)) {
    throw new Error(`Solution file not found: ${solutionPath}`);
  }
  log.info(`Solution file: ${solutionPath}`);
  log.info(`Import type: ${solution.importType}`);

  // 2. Check for existing solution
  log.info("Checking for existing solution installation...");
  const existingSolutions = await queryCollection<SolutionRecord>(
    ctx,
    "solutions",
    "solutionid,uniquename,version,ismanaged",
    `uniquename eq '${solution.uniqueName}'`,
    isDryRun
  );

  if (existingSolutions.length > 0) {
    const existing = existingSolutions[0]!;
    log.info(`Existing solution found: ${existing.uniquename} v${existing.version} (managed: ${existing.ismanaged})`);

    // Back up existing solution before overwrite
    log.info("Backing up existing solution...");
    const backupPath = resolve(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      `solution-backup-${new Date().toISOString().slice(0, 10)}.zip`
    );
    pac.solutionExport(solution.uniqueName, backupPath, existing.ismanaged, isDryRun);
    log.success(`Backup saved: ${backupPath}`);
  } else {
    log.info("No existing solution found — fresh install");
  }

  // 3. Import solution
  log.info(`Importing solution (${solution.importType})...`);
  const importResult = pac.solutionImport(
    solutionPath,
    solution.importType,
    solution.publishOnImport,
    solution.overwriteUnmanagedCustomizations,
    isDryRun
  );

  if (importResult.exitCode !== 0 && !isDryRun) {
    throw new Error(`Solution import failed:\n${importResult.stdout}`);
  }

  // 4. Publish customizations (if not already done by import)
  if (!solution.publishOnImport) {
    log.info("Publishing customizations...");
    pac.solutionPublish(isDryRun);
  }

  log.success(`Solution ${solution.uniqueName} imported successfully (${solution.importType})`);
}
