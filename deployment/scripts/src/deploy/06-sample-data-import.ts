/**
 * Step 6: Import 22 sample data files with @ref: resolution.
 * - Imports in dependency order (matches sample-data/README.md)
 * - Two-pass import for circular references (personnel→units→incidents→calls)
 * - Hard-blocks patient-records.json for Production environments (ADR-027)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { DeploymentContext } from "../types/deployment-context.js";
import type { GenericRecord } from "../types/dataverse-api.js";
import * as log from "../utils/logger.js";
import { createRecord, apiPatch } from "../utils/dataverse-client.js";
import {
  resolveRecordRefs,
  registerRef,
  isRef,
  extractRefKey,
  ENTITY_SET_MAP,
  IMPORT_ORDER,
  CIRCULAR_REFS,
} from "../utils/ref-resolver.js";

/** PHI file that is hard-blocked for Production (ADR-027) */
const PHI_FILE = "patient-records";

interface SampleDataFile {
  readonly records: GenericRecord[];
}

interface DeferredUpdate {
  readonly entitySet: string;
  readonly recordId: string;
  readonly refId: string;
  readonly field: string;
  readonly refValue: string;
}

export async function run(ctx: DeploymentContext): Promise<void> {
  log.setStep("06-SAMPLE-DATA");
  log.header("Step 6: Sample Data Import");

  const { config, isDryRun } = ctx;

  if (!config.sampleData.importSampleData) {
    log.info("Sample data import disabled in config — skipping");
    return;
  }

  const sampleDataDir = resolve(
    process.cwd(),
    config.sampleData.sampleDataPath || "../../sample-data"
  );

  if (!existsSync(sampleDataDir) && !isDryRun) {
    throw new Error(`Sample data directory not found: ${sampleDataDir}`);
  }

  // PHI hard block for Production (ADR-027)
  if (config.environmentType === "Production") {
    log.error(
      "BLOCKED: Sample data import to Production is restricted. " +
      "patient-records.json (PHI) cannot be imported via scripts regardless of config. " +
      "Use the Dataverse Import Wizard manually with explicit awareness (ADR-027)."
    );
    throw new Error("PHI sample data import blocked for Production environments");
  }

  const deferredUpdates: DeferredUpdate[] = [];
  let totalRecords = 0;

  // Pass 1: Import in dependency order
  log.info("Pass 1: Importing records in dependency order...\n");

  for (const fileName of IMPORT_ORDER) {
    // PHI guard for patient-records
    if (fileName === PHI_FILE && !config.sampleData.includePhiRecords) {
      log.warn(`  Skipping ${fileName}.json (includePhiRecords = false)`);
      continue;
    }

    const filePath = resolve(sampleDataDir, `${fileName}.json`);
    if (!existsSync(filePath) && !isDryRun) {
      log.warn(`  File not found: ${filePath} — skipping`);
      continue;
    }

    const entitySet = ENTITY_SET_MAP[fileName];
    if (!entitySet) {
      log.warn(`  No entity set mapping for ${fileName} — skipping`);
      continue;
    }

    log.info(`  Importing ${fileName}.json → ${entitySet}`);

    let records: GenericRecord[] = [];
    if (!isDryRun) {
      const fileContent = JSON.parse(readFileSync(filePath, "utf-8")) as SampleDataFile;
      records = fileContent.records ?? [];
    }

    const circularFields = CIRCULAR_REFS[fileName] ?? [];

    for (const record of records) {
      const refId = record["_refId"] as string | undefined;

      // Null out circular ref fields for first pass
      const firstPassRecord = { ...record };
      for (const field of circularFields) {
        if (isRef(firstPassRecord[field])) {
          // Track for second pass
          if (refId) {
            deferredUpdates.push({
              entitySet,
              recordId: "", // Will be filled after creation
              refId,
              field,
              refValue: firstPassRecord[field] as string,
            });
          }
          (firstPassRecord as Record<string, unknown>)[field] = null;
        }
      }

      // Resolve @ref: values
      const resolved = resolveRecordRefs(firstPassRecord, ctx.refMap);

      // Create record
      const newId = await createRecord(ctx, entitySet, resolved, isDryRun);

      if (refId && newId) {
        registerRef(refId, newId, ctx.refMap);

        // Update deferred records with actual ID
        for (const deferred of deferredUpdates) {
          if (deferred.refId === refId && deferred.recordId === "") {
            (deferred as { recordId: string }).recordId = newId;
          }
        }
      }

      totalRecords++;
    }

    log.debug(`    ${records.length} records imported`);
  }

  // Pass 2: Resolve circular references
  if (deferredUpdates.length > 0) {
    log.info(`\nPass 2: Resolving ${deferredUpdates.length} circular references...`);

    for (const deferred of deferredUpdates) {
      if (!deferred.recordId) continue;

      const refKey = extractRefKey(deferred.refValue);
      const resolvedGuid = ctx.refMap.get(refKey);

      if (!resolvedGuid) {
        log.warn(`  Unresolved circular ref: ${deferred.refValue} for ${deferred.field}`);
        continue;
      }

      log.debug(`  Updating ${deferred.entitySet}(${deferred.recordId}).${deferred.field} → ${resolvedGuid}`);
      await apiPatch(
        ctx,
        `${deferred.entitySet}(${deferred.recordId})`,
        { [deferred.field]: resolvedGuid },
        isDryRun
      );
    }
  }

  log.success(`Sample data import complete: ${totalRecords} records across ${IMPORT_ORDER.length} files`);
}
