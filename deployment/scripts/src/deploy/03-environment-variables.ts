/**
 * Step 3: Set all 18 environment variable values per target environment.
 * - Queries existing env var definitions from the solution
 * - Creates or updates env var values
 */

import type { DeploymentContext } from "../types/deployment-context.js";
import type { EnvVarDefinitionRecord, EnvVarValueRecord } from "../types/dataverse-api.js";
import { ALL_ENV_VAR_NAMES } from "../types/environment-config.js";
import * as log from "../utils/logger.js";
import { queryCollection, apiPost, apiPatch } from "../utils/dataverse-client.js";

export async function run(ctx: DeploymentContext): Promise<void> {
  log.setStep("03-ENV-VARS");
  log.header("Step 3: Environment Variables");

  const { config, isDryRun } = ctx;

  // 1. Get all env var definitions from the solution
  log.info("Querying environment variable definitions...");
  const definitions = await queryCollection<EnvVarDefinitionRecord>(
    ctx,
    "environmentvariabledefinitions",
    "environmentvariabledefinitionid,schemaname,displayname",
    `startswith(schemaname,'seo_')`,
    isDryRun
  );

  if (!isDryRun) {
    log.info(`Found ${definitions.length} environment variable definitions`);
  }

  // Build a map of schemaname → definition ID
  const defMap = new Map<string, string>();
  for (const def of definitions) {
    defMap.set(def.schemaname, def.environmentvariabledefinitionid);
  }

  // 2. Get existing env var values
  log.info("Querying existing environment variable values...");
  const existingValues = await queryCollection<EnvVarValueRecord>(
    ctx,
    "environmentvariablevalues",
    "environmentvariablevalueid,value,_environmentvariabledefinitionid_value",
    undefined,
    isDryRun
  );

  const valueMap = new Map<string, string>();
  for (const val of existingValues) {
    valueMap.set(val._environmentvariabledefinitionid_value, val.environmentvariablevalueid);
  }

  // 3. Set each env var value
  let setCount = 0;
  let skipCount = 0;

  for (const varName of ALL_ENV_VAR_NAMES) {
    const targetValue = config.environmentVariables[varName];
    const definitionId = defMap.get(varName);

    if (!definitionId && !isDryRun) {
      log.warn(`  Definition not found for ${varName} — skipping (solution may need import first)`);
      skipCount++;
      continue;
    }

    const existingValueId = definitionId ? valueMap.get(definitionId) : undefined;

    if (existingValueId) {
      // Update existing value
      log.info(`  Updating ${varName} = "${targetValue}"`);
      await apiPatch(
        ctx,
        `environmentvariablevalues(${existingValueId})`,
        { value: targetValue },
        isDryRun
      );
    } else {
      // Create new value
      log.info(`  Creating ${varName} = "${targetValue}"`);
      await apiPost(
        ctx,
        "environmentvariablevalues",
        {
          value: targetValue,
          "EnvironmentVariableDefinitionId@odata.bind":
            `/environmentvariabledefinitions(${definitionId})`,
        },
        isDryRun
      );
    }

    setCount++;
  }

  log.success(`Environment variables configured: ${setCount} set, ${skipCount} skipped`);
}
