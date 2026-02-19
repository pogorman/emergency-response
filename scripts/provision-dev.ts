#!/usr/bin/env node

import { parseArgs } from "node:util";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { authenticate } from "./lib/auth.js";
import { readSpecs } from "./lib/spec-reader.js";
import {
  whoAmI,
  ensurePublisher,
  ensureSolution,
  createGlobalOptionSet,
  createTable,
  createTableColumns,
  createRelationship,
  setAutoNumberFormat,
  addEntitiesToSolution,
  addOptionSetsToSolution,
  createEnvironmentVariable,
  getEntitySetNames,
  publishAll,
  logicalName,
} from "./lib/metadata.js";
import { importSampleData } from "./lib/data-loader.js";

// ── CLI Args ───────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    url: { type: "string" },
    "tenant-id": { type: "string" },
    "dry-run": { type: "boolean", default: false },
    "skip-data": { type: "boolean", default: false },
    commercial: { type: "boolean", default: false },
  },
  strict: true,
});

if (!values.url || !values["tenant-id"]) {
  console.error(
    "Usage: npx tsx provision-dev.ts --url <env-url> --tenant-id <guid> [--dry-run] [--skip-data] [--commercial]",
  );
  console.error("");
  console.error("Options:");
  console.error("  --url           Dataverse environment URL (e.g., https://org.crm9.dynamics.com)");
  console.error("  --tenant-id     Entra tenant ID (GUID)");
  console.error("  --dry-run       Log actions without creating anything");
  console.error("  --skip-data     Schema only — skip sample data import");
  console.error("  --commercial    Use commercial auth endpoints (default: GCC)");
  process.exit(1);
}

const dryRun = values["dry-run"] ?? false;
const skipData = values["skip-data"] ?? false;
const isCommercial = values.commercial ?? false;

// ── Resolve project root ───────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// ── Main ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startTime = Date.now();

  if (dryRun) {
    console.log("=== DRY RUN MODE — no changes will be made ===\n");
  }

  // Step 1: Read specs
  console.log("Step 1: Reading project specs...");
  const specs = readSpecs(projectRoot);
  console.log(
    `  ${specs.globalChoices.length} global choices, ${specs.tables.length} tables, ` +
      `${specs.envVars.length} env vars, ${specs.sampleData.size} sample data files`,
  );

  // Step 2: Authenticate
  console.log("\nStep 2: Authenticating...");
  const client = await authenticate({
    envUrl: values.url!,
    tenantId: values["tenant-id"]!,
    isCommercial,
  });

  // Step 3: WhoAmI
  console.log("\nStep 3: Verifying connectivity (WhoAmI)...");
  const identity = await whoAmI(client);
  console.log(`  User: ${identity.userId}`);
  console.log(`  Org:  ${identity.orgId}`);

  // Step 4: Publisher
  console.log("\nStep 4: Ensuring publisher...");
  const publisherId = await ensurePublisher(client);
  console.log(`  Publisher ID: ${publisherId}`);

  // Step 5: Solution
  console.log("\nStep 5: Ensuring solution...");
  const solutionId = await ensureSolution(client, publisherId);
  console.log(`  Solution ID: ${solutionId}`);

  // Step 6: Global option sets
  console.log("\nStep 6: Creating global option sets...");
  const globalChoiceMap = new Map<string, string>();
  for (const choice of specs.globalChoices) {
    const metadataId = await createGlobalOptionSet(client, choice, dryRun);
    globalChoiceMap.set(choice.schemaName, metadataId);
  }
  console.log(`  ${globalChoiceMap.size} global option sets processed.`);

  // Step 7: Create tables (entities) with primary column only
  console.log("\nStep 7: Creating tables...");
  const entityMetadataIds = new Map<string, string>();
  for (const table of specs.tables) {
    const metadataId = await createTable(client, table, dryRun);
    entityMetadataIds.set(table.schemaName, metadataId);
  }
  console.log(`  ${entityMetadataIds.size} tables processed.`);

  // Step 8: Add remaining columns to each table
  console.log("\nStep 8: Creating table columns...");
  for (const table of specs.tables) {
    const metadataId = entityMetadataIds.get(table.schemaName);
    if (!metadataId) continue;
    console.log(`  ${table.schemaName}:`);
    await createTableColumns(client, table, metadataId, globalChoiceMap, dryRun);
  }

  // Step 9: Create relationships (lookup columns)
  // Some tables define N:1 relationships explicitly, but others only have
  // Lookup columns without a matching N:1 entry. We handle both cases by
  // collecting all Lookup columns and deduplicating against explicit N:1s.
  console.log("\nStep 9: Creating relationships...");
  let relCount = 0;
  for (const table of specs.tables) {
    // Collect all lookup columns
    const lookupCols = table.columns.filter((c) => c.type === "Lookup" && c.target);
    if (lookupCols.length === 0) continue;

    console.log(`  ${table.schemaName}:`);
    for (const lookupCol of lookupCols) {
      const foreignKey = lookupCol.schemaName;
      // Determine the target table: prefer explicit N:1 relationship, fallback to column target
      const explicitRel = table.relationships.find(
        (r) => r.type === "N:1" && r.foreignKey === foreignKey,
      );
      const targetTable = explicitRel?.relatedTable ?? lookupCol.target!;

      // Skip lookups to built-in tables (e.g., systemuser)
      if (targetTable === "systemuser") {
        console.log(
          `    Skipping ${foreignKey} → systemuser (built-in table, configure manually).`,
        );
        continue;
      }

      await createRelationship(
        client,
        table,
        foreignKey,
        targetTable,
        lookupCol,
        dryRun,
      );
      relCount++;
    }
  }
  console.log(`  ${relCount} relationships processed.`);

  // Step 10: Set AutoNumber formats
  console.log("\nStep 10: Setting AutoNumber formats...");
  for (const table of specs.tables) {
    const autoNumCol = table.columns.find(
      (c) => c.type === "AutoNumber" && c.format,
    );
    if (!autoNumCol) continue;

    await setAutoNumberFormat(
      client,
      logicalName(table.schemaName),
      logicalName(autoNumCol.schemaName),
      autoNumCol.format!,
      dryRun,
    );
  }

  // Step 11: Add components to solution
  console.log("\nStep 11: Adding components to solution...");
  await addOptionSetsToSolution(client, globalChoiceMap, dryRun);
  await addEntitiesToSolution(client, entityMetadataIds, dryRun);

  // Step 12: Create environment variables
  console.log("\nStep 12: Creating environment variables...");
  for (const envVar of specs.envVars) {
    await createEnvironmentVariable(client, envVar, dryRun);
  }
  console.log(`  ${specs.envVars.length} environment variables processed.`);

  // Step 13: Publish all customizations
  console.log("\nStep 13: Publishing customizations...");
  await publishAll(client, dryRun);

  // Step 14: Import sample data
  if (!skipData) {
    console.log("\nStep 14: Retrieving entity set names...");
    const entitySetMap = await getEntitySetNames(
      client,
      specs.tables.map((t) => t.schemaName),
    );
    console.log(`  Retrieved ${entitySetMap.size} entity set names.`);

    await importSampleData(client, specs, entitySetMap, dryRun);
  } else {
    console.log("\nStep 14: Skipping sample data import (--skip-data).");
  }

  // Done
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Provisioning complete in ${elapsed}s.`);
  console.log(`${"=".repeat(60)}`);
  console.log("\nNext steps:");
  console.log("  1. Open make.powerapps.com → Solutions → EmergencyResponseCoordination");
  console.log("  2. Verify tables, columns, relationships, and sample data");
  console.log("  3. Create model-driven app and configure forms/views");
  console.log("  4. Configure security roles and field security profiles");
}

main().catch((err) => {
  console.error("\nFATAL ERROR:", err instanceof Error ? err.message : err);
  process.exit(1);
});
