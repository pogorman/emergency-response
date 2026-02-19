/**
 * Rollback: Delete sample data in reverse dependency order.
 *
 * Usage:
 *   npx tsx src/rollback/rollback-data.ts --env ../../config/dev.json
 *   npx tsx src/rollback/rollback-data.ts --env ../../config/dev.json --dry-run
 */

import { loadEnvironmentConfig } from "../utils/config-loader.js";
import { createDeploymentContext } from "../types/deployment-context.js";
import type { ODataCollection, GenericRecord } from "../types/dataverse-api.js";
import * as log from "../utils/logger.js";
import { apiGet, apiDelete } from "../utils/dataverse-client.js";
import { IMPORT_ORDER, ENTITY_SET_MAP } from "../utils/ref-resolver.js";

/** Reverse dependency order for safe deletion */
const DELETE_ORDER = [...IMPORT_ORDER].reverse();

async function main(): Promise<void> {
  log.setStep("ROLLBACK-DATA");
  log.header("Rollback: Sample Data");

  const args = process.argv.slice(2);
  const envArg = args.find((a) => a.startsWith("--env="))?.split("=")[1]
    ?? args[args.indexOf("--env") + 1];
  const isDryRun = args.includes("--dry-run");

  if (!envArg) {
    log.error("Usage: npx tsx src/rollback/rollback-data.ts --env <config-file> [--dry-run]");
    process.exit(1);
  }

  const config = loadEnvironmentConfig(envArg);

  if (config.environmentType === "Production") {
    log.error("BLOCKED: Data rollback is not allowed for Production environments.");
    log.error("Use the Dataverse Admin Center for production data management.");
    process.exit(1);
  }

  const ctx = createDeploymentContext(config, {
    envFile: envArg,
    isDryRun,
    skipSteps: [],
    verbose: false,
  });

  log.warn("This will DELETE all records from sample data tables.");
  log.warn("This operation is irreversible. Only for dev/test environments.\n");

  let totalDeleted = 0;

  for (const fileName of DELETE_ORDER) {
    const entitySet = ENTITY_SET_MAP[fileName];
    if (!entitySet) continue;

    log.info(`Deleting from ${entitySet} (${fileName})...`);

    if (isDryRun) {
      log.dryRun(`Would delete all records from ${entitySet}`);
      continue;
    }

    // Query all records (paginated)
    let hasMore = true;
    let pageUrl = `${entitySet}?$select=${getIdColumn(entitySet)}`;
    let deletedCount = 0;

    while (hasMore) {
      const result = await apiGet<ODataCollection<GenericRecord>>(ctx, pageUrl, isDryRun);
      const records = result.value ?? [];

      for (const record of records) {
        const idColumn = getIdColumn(entitySet);
        const recordId = record[idColumn] as string;

        if (recordId) {
          await apiDelete(ctx, `${entitySet}(${recordId})`, isDryRun);
          deletedCount++;
        }
      }

      if (result["@odata.nextLink"]) {
        pageUrl = result["@odata.nextLink"];
      } else {
        hasMore = false;
      }
    }

    log.info(`  Deleted ${deletedCount} records`);
    totalDeleted += deletedCount;
  }

  log.success(`Data rollback complete: ${totalDeleted} records deleted`);
}

/**
 * Get the primary key column name for an entity set.
 */
function getIdColumn(entitySet: string): string {
  // Dataverse convention: entity set name (plural) → singular + "id"
  const singular = entitySet.replace(/s$/, "").replace(/ie$/, "y");
  return `${singular}id`;
}

main().catch((err) => {
  log.error(`Rollback failed: ${err}`);
  process.exit(1);
});
