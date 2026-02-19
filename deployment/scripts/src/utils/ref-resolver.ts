/**
 * Resolves @ref: symbolic foreign keys to Dataverse GUIDs.
 * Used by 06-sample-data-import.ts for the 22 sample data files.
 *
 * Symbolic format: @ref:collection-id (e.g., @ref:agency-metro-fire)
 * Resolution: look up the GUID in the refMap built during import.
 */

import type { GenericRecord } from "../types/dataverse-api.js";
import * as log from "./logger.js";

const REF_PATTERN = /^@ref:(.+)$/;

/**
 * Check if a value is a symbolic reference.
 */
export function isRef(value: unknown): value is string {
  return typeof value === "string" && REF_PATTERN.test(value);
}

/**
 * Extract the reference key from a @ref: value.
 */
export function extractRefKey(value: string): string {
  const match = REF_PATTERN.exec(value);
  if (!match?.[1]) {
    throw new Error(`Invalid reference format: ${value}`);
  }
  return match[1];
}

/**
 * Resolve a single @ref: value to a GUID using the refMap.
 * Returns null if the reference cannot be resolved (for two-pass import).
 */
export function resolveRef(
  value: string,
  refMap: Map<string, string>
): string | null {
  const key = extractRefKey(value);
  const guid = refMap.get(key);

  if (!guid) {
    log.debug(`Unresolved reference: @ref:${key} (will be resolved in pass 2)`);
    return null;
  }

  return guid;
}

/**
 * Resolve all @ref: values in a record.
 * Returns a new record with resolved GUIDs.
 * Unresolvable refs are set to null (for two-pass import).
 */
export function resolveRecordRefs(
  record: GenericRecord,
  refMap: Map<string, string>
): GenericRecord {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (key === "id" || key === "_refId") {
      // Preserve internal IDs, don't send to API
      continue;
    }

    if (isRef(value)) {
      const guid = resolveRef(value, refMap);
      // Convert @ref: lookup fields to OData bind format
      // e.g., seo_agencyId: "@ref:agency-metro-fire" → "seo_agencyId@odata.bind": "/seo_agencies(guid)"
      if (guid && key.endsWith("Id")) {
        const navProperty = key;
        resolved[navProperty] = guid;
      } else if (guid) {
        resolved[key] = guid;
      } else {
        // Null for two-pass — will be updated later
        resolved[key] = null;
      }
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * Register a record's GUID in the refMap.
 * Called after each record is created in Dataverse.
 */
export function registerRef(
  refId: string,
  guid: string,
  refMap: Map<string, string>
): void {
  if (refMap.has(refId)) {
    log.warn(`Duplicate ref registration: ${refId} (overwriting)`);
  }
  refMap.set(refId, guid);
  log.debug(`Registered ref: ${refId} → ${guid}`);
}

/**
 * Get pending (unresolved) references from a record.
 * Used to identify which records need a second-pass update.
 */
export function getPendingRefs(record: GenericRecord): string[] {
  const pending: string[] = [];

  for (const [key, value] of Object.entries(record)) {
    if (isRef(value)) {
      pending.push(`${key}=${value}`);
    }
  }

  return pending;
}

/** Table name → Dataverse entity set name mapping */
export const ENTITY_SET_MAP: Record<string, string> = {
  "agencies": "seo_agencies",
  "jurisdictions": "seo_jurisdictions",
  "facilities": "seo_facilities",
  "stations": "seo_stations",
  "apparatus": "seo_apparatuses",
  "personnel": "seo_personnels",
  "units": "seo_units",
  "pre-plans": "seo_preplans",
  "hazards": "seo_hazards",
  "hydrants": "seo_hydrants",
  "incidents": "seo_incidents",
  "calls": "seo_calls",
  "incident-assignments": "seo_incidentassignments",
  "incident-commands": "seo_incidentcommands",
  "divisions": "seo_divisions",
  "resource-requests": "seo_resourcerequests",
  "incident-notes": "seo_incidentnotes",
  "patient-records": "seo_patientrecords",
  "mutual-aid-agreements": "seo_mutualagreements",
  "mutual-aid-requests": "seo_mutualaidrequests",
  "after-action-reports": "seo_afteractionreports",
  "unit-status-logs": "seo_unitstatuslogs",
};

/**
 * Import order matching sample-data/README.md (1-22).
 * Circular references are handled with two-pass import.
 */
export const IMPORT_ORDER: readonly string[] = [
  "agencies",
  "jurisdictions",
  "facilities",
  "stations",
  "apparatus",
  "personnel",
  "units",
  "pre-plans",
  "hazards",
  "hydrants",
  "incidents",
  "calls",
  "incident-assignments",
  "incident-commands",
  "divisions",
  "resource-requests",
  "incident-notes",
  "patient-records",
  "mutual-aid-agreements",
  "mutual-aid-requests",
  "after-action-reports",
  "unit-status-logs",
];

/**
 * Circular references that require two-pass import.
 * Key: file name, Value: fields to null on first pass, then update on second pass.
 */
export const CIRCULAR_REFS: Record<string, string[]> = {
  "personnel": ["seo_currentUnitId"],
  "units": ["seo_currentIncidentId"],
  "incidents": ["seo_callId"],
};
