import type { DataverseClient } from "./auth.js";
import type { ProjectSpecs, TableDef, ColumnDef, ChoiceOption } from "./spec-reader.js";

// ── Import order (respects FK dependencies) ────────────────────────────

const IMPORT_ORDER: string[] = [
  "seo_Agency",
  "seo_Jurisdiction",
  "seo_Facility",
  "seo_Station",
  "seo_Apparatus",
  "seo_PrePlan",
  "seo_Hydrant",
  "seo_MutualAidAgreement",
  "seo_Unit",
  "seo_Personnel",
  "seo_Call",
  "seo_Incident",
  "seo_IncidentAssignment",
  "seo_IncidentCommand",
  "seo_Division",
  "seo_ResourceRequest",
  "seo_IncidentNote",
  "seo_PatientRecord",
  "seo_MutualAidRequest",
  "seo_AfterActionReport",
  "seo_UnitStatusLog",
  "seo_Hazard",
];

// ── Known field-name aliases (sample data → table definition) ──────────

const FIELD_ALIASES: Record<string, string> = {
  seo_gpsLatitude: "seo_latitude",
  seo_gpsLongitude: "seo_longitude",
  seo_source: "seo_callSource",
  seo_reportedType: "seo_reportedIncidentType",
  seo_unitId: "seo_currentUnitId",
};

// ── Known choice-label aliases (sample data label → spec label) ────────

const CHOICE_LABEL_ALIASES: Record<string, string> = {
  "Priority 1": "Priority 1 — Immediate Life Threat",
  "Priority 2": "Priority 2 — Urgent",
  "Priority 3": "Priority 3 — Non-Urgent",
  "Priority 4": "Priority 4 — Scheduled/Low",
  "FF/Paramedic": "Firefighter/Paramedic",
  "MVA w/ Entrapment": "MVA with Entrapment",
  "Non-Emergency": "Non-Emergency Line",
  IC: "Incident Commander",
  "Red (Immediate)": "Red — Immediate",
  "Yellow (Delayed)": "Yellow — Delayed",
  "Green (Minor)": "Green — Minor",
  "Black (Deceased)": "Black — Deceased",
  "White (Non-Patient)": "White — Non-Patient",
};

// ── Deferred update (for unresolvable refs in pass 1) ──────────────────

interface DeferredUpdate {
  entitySetName: string;
  recordId: string;
  navPropertyName: string;
  refId: string;
  targetEntitySetName: string;
}

// ── Ref map: @id → { entitySetName, guid } ────────────────────────────

interface RefEntry {
  entitySetName: string;
  id: string;
}

// ── Build a column map for a table ─────────────────────────────────────

function buildColumnMap(table: TableDef): Map<string, ColumnDef> {
  const map = new Map<string, ColumnDef>();
  for (const col of table.columns) {
    map.set(col.schemaName, col);
  }
  return map;
}

// ── Build a comprehensive choice-label → value map ─────────────────────

function buildChoiceLabelMap(
  specs: ProjectSpecs,
): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();

  // Global choices
  for (const gc of specs.globalChoices) {
    const labelMap = new Map<string, number>();
    for (const opt of gc.options) {
      labelMap.set(opt.label, opt.value);
    }
    map.set(gc.schemaName, labelMap);
  }

  // Local choices (from table column definitions)
  for (const table of specs.tables) {
    for (const col of table.columns) {
      if (col.type === "Choice" && col.localOptions) {
        const key = `${table.schemaName}.${col.schemaName}`;
        const labelMap = new Map<string, number>();
        for (const opt of col.localOptions) {
          labelMap.set(opt.label, opt.value);
        }
        map.set(key, labelMap);
      }
    }
  }

  return map;
}

/**
 * Resolve a choice label string to its numeric value.
 */
function resolveChoiceValue(
  fieldLabel: string,
  col: ColumnDef,
  tableName: string,
  choiceLabelMap: Map<string, Map<string, number>>,
): number | null {
  // Apply alias
  const label = CHOICE_LABEL_ALIASES[fieldLabel] ?? fieldLabel;

  let lookupKey: string;
  if (col.type === "GlobalChoice" && col.choiceName) {
    lookupKey = col.choiceName;
  } else {
    lookupKey = `${tableName}.${col.schemaName}`;
  }

  const labelMap = choiceLabelMap.get(lookupKey);
  if (!labelMap) {
    console.warn(`    WARNING: No choice map found for ${lookupKey}`);
    return null;
  }

  // Exact match
  const exact = labelMap.get(label);
  if (exact !== undefined) return exact;

  // Prefix match: sample value is a prefix of the option label
  for (const [optLabel, optValue] of labelMap) {
    if (optLabel.startsWith(label)) return optValue;
  }

  // Contains match
  for (const [optLabel, optValue] of labelMap) {
    if (optLabel.toLowerCase().includes(label.toLowerCase())) return optValue;
  }

  console.warn(
    `    WARNING: Could not resolve choice label "${fieldLabel}" for ${col.schemaName}`,
  );
  return null;
}

// ── Find the entity set name for a lookup target ───────────────────────

function getTargetEntitySet(
  targetTableSchema: string,
  entitySetMap: Map<string, string>,
): string | null {
  return entitySetMap.get(targetTableSchema) ?? null;
}

// ── Main import function ───────────────────────────────────────────────

export async function importSampleData(
  client: DataverseClient,
  specs: ProjectSpecs,
  entitySetMap: Map<string, string>,
  dryRun: boolean,
): Promise<void> {
  const refMap = new Map<string, RefEntry>();
  const deferred: DeferredUpdate[] = [];
  const choiceLabelMap = buildChoiceLabelMap(specs);

  // Build table lookup
  const tableMap = new Map<string, TableDef>();
  for (const t of specs.tables) {
    tableMap.set(t.schemaName, t);
  }

  console.log("\n--- Phase B: Sample Data Import ---\n");

  for (const entitySchema of IMPORT_ORDER) {
    const sampleFile = specs.sampleData.get(entitySchema);
    if (!sampleFile) {
      console.log(`  No sample data for ${entitySchema}. Skipping.`);
      continue;
    }

    const table = tableMap.get(entitySchema);
    if (!table) {
      console.warn(`  WARNING: No table definition for ${entitySchema}. Skipping data file.`);
      continue;
    }

    const entitySetName = entitySetMap.get(entitySchema);
    if (!entitySetName) {
      console.warn(`  WARNING: No entity set name for ${entitySchema}. Skipping data.`);
      continue;
    }

    const columnMap = buildColumnMap(table);
    const records = sampleFile.records;
    console.log(`  Importing ${records.length} ${entitySchema} records...`);

    for (const record of records) {
      const refId = record["@id"] as string | undefined;
      const apiBody: Record<string, unknown> = {};

      for (const [rawKey, rawValue] of Object.entries(record)) {
        if (rawKey === "@id") continue;

        // Skip null values
        if (rawValue === null || rawValue === undefined) continue;

        // Apply field aliases
        const fieldName = FIELD_ALIASES[rawKey] ?? rawKey;

        // Look up column definition
        const col = columnMap.get(fieldName);
        if (!col) {
          // Check if it's a field we just don't have in the table def
          if (Array.isArray(rawValue)) {
            // Arrays (e.g., seo_assignedUnitIds, seo_certifications as array)
            // If there's a matching String column after alias, convert to CSV
            const aliased = FIELD_ALIASES[rawKey];
            const aliasedCol = aliased ? columnMap.get(aliased) : null;
            if (aliasedCol && aliasedCol.type === "String") {
              apiBody[fieldName] = (rawValue as string[]).join(", ");
              continue;
            }
          }
          // Skip silently for known non-column fields
          continue;
        }

        // Handle by column type
        if (col.type === "Lookup") {
          // @ref: syntax
          if (typeof rawValue === "string" && rawValue.startsWith("@ref:")) {
            const targetRefId = rawValue.slice(5);
            const ref = refMap.get(targetRefId);
            const targetEntitySet = col.target
              ? getTargetEntitySet(col.target, entitySetMap)
              : null;

            if (ref) {
              // Resolved — use OData bind
              apiBody[`${fieldName}@odata.bind`] = `/${ref.entitySetName}(${ref.id})`;
            } else if (targetEntitySet) {
              // Can't resolve yet — defer to pass 2
              deferred.push({
                entitySetName,
                recordId: "", // Will be set after creation
                navPropertyName: fieldName,
                refId: targetRefId,
                targetEntitySetName: targetEntitySet,
              });
            }
          }
          continue;
        }

        if (col.type === "GlobalChoice" || col.type === "Choice") {
          if (typeof rawValue === "string") {
            const numericValue = resolveChoiceValue(
              rawValue,
              col,
              entitySchema,
              choiceLabelMap,
            );
            if (numericValue !== null) {
              apiBody[fieldName] = numericValue;
            }
          } else if (typeof rawValue === "number") {
            apiBody[fieldName] = rawValue;
          }
          continue;
        }

        if (col.type === "Boolean") {
          apiBody[fieldName] = rawValue === true;
          continue;
        }

        if (col.type === "String" || col.type === "AutoNumber") {
          if (Array.isArray(rawValue)) {
            // Convert array to comma-separated string (e.g., certifications)
            apiBody[fieldName] = (rawValue as string[]).join(", ");
          } else {
            apiBody[fieldName] = String(rawValue);
          }
          continue;
        }

        // DateTime, DateOnly, WholeNumber, Float, Memo — pass through
        apiBody[fieldName] = rawValue;
      }

      if (Object.keys(apiBody).length === 0) {
        console.warn(`    WARNING: Record ${refId ?? "unknown"} produced empty payload. Skipping.`);
        continue;
      }

      if (dryRun) {
        console.log(
          `    [DRY RUN] Would create ${entitySchema} record ${refId ?? ""}`,
        );
        if (refId) {
          refMap.set(refId, { entitySetName, id: "dry-run-guid" });
        }
        continue;
      }

      try {
        const res = await client.fetch(`/${entitySetName}`, {
          method: "POST",
          body: JSON.stringify(apiBody),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error(
            `    ERROR creating ${entitySchema} record ${refId ?? ""}: ${res.status} ${errorText}`,
          );
          continue;
        }

        // Extract the created record ID from response
        const responseBody = (await res.json()) as Record<string, unknown>;
        // The primary key column is usually {logicalname}id
        const pkColumn = `${entitySchema.toLowerCase()}id`;
        const createdId =
          (responseBody[pkColumn] as string) ??
          extractIdFromODataId(res.headers.get("OData-EntityId"));

        if (createdId && refId) {
          refMap.set(refId, { entitySetName, id: createdId });
        }

        // Update deferred entries that were queued for this record
        for (const d of deferred) {
          if (d.recordId === "" && d.entitySetName === entitySetName) {
            if (createdId) {
              d.recordId = createdId;
            }
          }
        }

        console.log(`    Created ${refId ?? entitySchema}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`    ERROR creating ${entitySchema} record: ${msg}`);
      }
    }
  }

  // ── Pass 2: Resolve deferred lookups ────────────────────────────────

  const readyDeferred = deferred.filter(
    (d) => d.recordId && d.recordId !== "",
  );

  if (readyDeferred.length > 0 && !dryRun) {
    console.log(
      `\n  Pass 2: Resolving ${readyDeferred.length} deferred lookups...`,
    );

    for (const d of readyDeferred) {
      const ref = refMap.get(d.refId);
      if (!ref) {
        console.warn(
          `    WARNING: Still can't resolve @ref:${d.refId}. Skipping.`,
        );
        continue;
      }

      try {
        const patchBody = {
          [`${d.navPropertyName}@odata.bind`]: `/${ref.entitySetName}(${ref.id})`,
        };
        const res = await client.fetch(
          `/${d.entitySetName}(${d.recordId})`,
          {
            method: "PATCH",
            body: JSON.stringify(patchBody),
          },
        );
        if (!res.ok) {
          const text = await res.text();
          console.warn(
            `    WARNING: Deferred update failed for ${d.navPropertyName}: ${text}`,
          );
        } else {
          console.log(
            `    Updated ${d.entitySetName}(${d.recordId}).${d.navPropertyName} → @ref:${d.refId}`,
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`    WARNING: Deferred update error: ${msg}`);
      }
    }
  }

  // Summary
  console.log(`\n  Sample data import complete. ${refMap.size} records created.`);
  if (deferred.length > 0) {
    const resolved = deferred.filter((d) => refMap.has(d.refId)).length;
    console.log(
      `  Deferred lookups: ${resolved}/${deferred.length} resolved.`,
    );
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function extractIdFromODataId(odataId: string | null): string | null {
  if (!odataId) return null;
  // Format: https://org.crm.dynamics.com/api/data/v9.2/seo_incidents(guid)
  const match = odataId.match(/\(([0-9a-f-]{36})\)/i);
  return match ? match[1] : null;
}
