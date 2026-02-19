/**
 * Step 4: Bind 5 connection references to their target connections.
 * - Queries connection reference records from the solution
 * - Updates each with the connection ID from the config
 */

import type { DeploymentContext } from "../types/deployment-context.js";
import type { ConnectionReferenceRecord } from "../types/dataverse-api.js";
import { ALL_CONNECTION_REF_NAMES } from "../types/environment-config.js";
import * as log from "../utils/logger.js";
import { queryCollection, apiPatch } from "../utils/dataverse-client.js";

export async function run(ctx: DeploymentContext): Promise<void> {
  log.setStep("04-CONN-REFS");
  log.header("Step 4: Connection References");

  const { config, isDryRun } = ctx;

  // 1. Get connection reference records from the solution
  log.info("Querying connection reference records...");
  const connRefs = await queryCollection<ConnectionReferenceRecord>(
    ctx,
    "connectionreferences",
    "connectionreferenceid,connectionreferencelogicalname,connectionid",
    `startswith(connectionreferencelogicalname,'seo_')`,
    isDryRun
  );

  if (!isDryRun) {
    log.info(`Found ${connRefs.length} connection references`);
  }

  // Build map of logical name → record ID
  const refMap = new Map<string, string>();
  for (const ref of connRefs) {
    refMap.set(ref.connectionreferencelogicalname, ref.connectionreferenceid);
  }

  // 2. Bind each connection reference
  let boundCount = 0;
  let skipCount = 0;

  for (const refName of ALL_CONNECTION_REF_NAMES) {
    const connectionId = config.connectionReferences[refName];
    const recordId = refMap.get(refName);

    if (!connectionId) {
      log.warn(`  ${refName}: No connection ID in config — skipping`);
      skipCount++;
      continue;
    }

    if (!recordId && !isDryRun) {
      log.warn(`  ${refName}: Record not found in solution — skipping`);
      skipCount++;
      continue;
    }

    log.info(`  Binding ${refName} → connection ${connectionId}`);
    await apiPatch(
      ctx,
      `connectionreferences(${recordId})`,
      { connectionid: connectionId },
      isDryRun
    );

    boundCount++;
  }

  log.success(`Connection references bound: ${boundCount} bound, ${skipCount} skipped`);
}
