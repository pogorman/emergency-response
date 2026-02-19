import type { DataverseClient } from "./auth.js";
import type { GlobalChoice, TableDef, ColumnDef, EnvVarDef } from "./spec-reader.js";

// ── OData helpers ──────────────────────────────────────────────────────

function label(text: string) {
  return {
    "@odata.type": "Microsoft.Dynamics.CRM.Label",
    LocalizedLabels: [
      {
        "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
        Label: text,
        LanguageCode: 1033,
      },
    ],
  };
}

function reqLevel(col: ColumnDef): object {
  const val = col.required ? "ApplicationRequired" : "None";
  return { Value: val };
}

/** Lowercase the schema name to get the Dataverse logical name. */
export function logicalName(schemaName: string): string {
  return schemaName.toLowerCase();
}

// ── Generic API helpers ────────────────────────────────────────────────

async function apiGet(client: DataverseClient, path: string): Promise<unknown> {
  const res = await client.fetch(path);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${path} → ${res.status}: ${body}`);
  }
  return res.json();
}

async function apiPost(client: DataverseClient, path: string, body: unknown): Promise<unknown> {
  const res = await client.fetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${text}`);
  }
  // Some endpoints return 204 with no body
  const contentType = res.headers.get("content-type") ?? "";
  if (res.status === 204 || !contentType.includes("application/json")) {
    return {};
  }
  return res.json();
}

// ── WhoAmI ─────────────────────────────────────────────────────────────

export async function whoAmI(client: DataverseClient): Promise<{ userId: string; orgId: string }> {
  const data = (await apiGet(client, "/WhoAmI")) as Record<string, string>;
  return { userId: data.UserId, orgId: data.OrganizationId };
}

// ── Publisher ──────────────────────────────────────────────────────────

export async function ensurePublisher(client: DataverseClient): Promise<string> {
  const res = await client.fetch(
    "/publishers?$filter=uniquename eq 'StateEmergencyOps'&$select=publisherid",
  );
  const data = (await res.json()) as { value: Array<{ publisherid: string }> };
  if (data.value.length > 0) {
    console.log("  Publisher StateEmergencyOps already exists.");
    return data.value[0].publisherid;
  }

  const pub = (await apiPost(client, "/publishers", {
    uniquename: "StateEmergencyOps",
    friendlyname: "State Emergency Operations",
    description:
      "Publisher for emergency response solutions targeting state, city, and local jurisdictions.",
    customizationprefix: "seo",
    customizationoptionvalueprefix: 10000,
  })) as { publisherid: string };

  console.log("  Created publisher StateEmergencyOps.");
  return pub.publisherid;
}

// ── Solution ───────────────────────────────────────────────────────────

export async function ensureSolution(
  client: DataverseClient,
  publisherId: string,
): Promise<string> {
  const res = await client.fetch(
    "/solutions?$filter=uniquename eq 'EmergencyResponseCoordination'&$select=solutionid",
  );
  const data = (await res.json()) as { value: Array<{ solutionid: string }> };
  if (data.value.length > 0) {
    console.log("  Solution EmergencyResponseCoordination already exists.");
    return data.value[0].solutionid;
  }

  const sol = (await apiPost(client, "/solutions", {
    uniquename: "EmergencyResponseCoordination",
    friendlyname: "Emergency Response Coordination",
    description:
      "End-to-end emergency response coordination for fire and EMS agencies.",
    version: "0.1.0",
    "publisherid@odata.bind": `/publishers(${publisherId})`,
  })) as { solutionid: string };

  console.log("  Created solution EmergencyResponseCoordination.");
  return sol.solutionid;
}

// ── Global Option Sets ─────────────────────────────────────────────────

export async function createGlobalOptionSet(
  client: DataverseClient,
  choice: GlobalChoice,
  dryRun: boolean,
): Promise<string> {
  // Check if exists
  const checkRes = await client.fetch(
    `/GlobalOptionSetDefinitions(Name='${choice.schemaName}')`,
  );
  if (checkRes.ok) {
    const existing = (await checkRes.json()) as { MetadataId: string };
    console.log(`  Option set ${choice.schemaName} already exists.`);
    return existing.MetadataId;
  }

  if (dryRun) {
    console.log(`  [DRY RUN] Would create option set ${choice.schemaName}`);
    return "dry-run-id";
  }

  const body = {
    "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
    Name: choice.schemaName,
    DisplayName: label(choice.displayName),
    Description: label(choice.description ?? ""),
    IsGlobal: true,
    OptionSetType: "Picklist",
    Options: choice.options.map((opt) => ({
      Value: opt.value,
      Label: label(opt.label),
    })),
  };

  const result = (await apiPost(client, "/GlobalOptionSetDefinitions", body)) as {
    MetadataId: string;
  };
  console.log(`  Created option set ${choice.schemaName}.`);
  return result.MetadataId;
}

// ── Tables (Entities) ──────────────────────────────────────────────────

/**
 * Build the attribute metadata JSON for a single column.
 * Returns null for Lookup and Calculated types (handled separately).
 */
function buildColumnMetadata(
  col: ColumnDef,
  globalChoiceMap: Map<string, string>,
  isPrimary: boolean,
): object | null {
  const base = {
    SchemaName: col.schemaName,
    DisplayName: label(col.displayName),
    Description: label(col.description ?? ""),
    RequiredLevel: isPrimary ? { Value: "None" } : reqLevel(col),
  };

  switch (col.type) {
    case "String":
      return {
        ...base,
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        MaxLength: col.maxLength ?? 200,
        FormatName: { Value: "Text" },
      };

    case "AutoNumber":
      // Created as String; AutoNumberFormat set post-creation
      return {
        ...base,
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        MaxLength: col.maxLength ?? 100,
        FormatName: { Value: "Text" },
      };

    case "Memo":
      return {
        ...base,
        "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata",
        MaxLength: 1048576,
        Format: "Text",
      };

    case "WholeNumber":
      return {
        ...base,
        "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
        MinValue: -2147483648,
        MaxValue: 2147483647,
        Format: "None",
      };

    case "Float":
      return {
        ...base,
        "@odata.type": "Microsoft.Dynamics.CRM.DoubleAttributeMetadata",
        Precision: col.precision ?? 2,
        MinValue: -100000000000,
        MaxValue: 100000000000,
      };

    case "Boolean":
      return {
        ...base,
        "@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
        DefaultValue: col.default === true,
        OptionSet: {
          "@odata.type": "Microsoft.Dynamics.CRM.BooleanOptionSetMetadata",
          TrueOption: { Value: 1, Label: label("Yes") },
          FalseOption: { Value: 0, Label: label("No") },
        },
      };

    case "DateTime":
      return {
        ...base,
        "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
        Format: "DateAndTime",
        DateTimeBehavior: { Value: "UserLocal" },
      };

    case "DateOnly":
      return {
        ...base,
        "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
        Format: "DateOnly",
        DateTimeBehavior: { Value: "UserLocal" },
      };

    case "GlobalChoice": {
      const metadataId = globalChoiceMap.get(col.choiceName ?? "");
      if (!metadataId) {
        console.warn(
          `  WARNING: Global choice ${col.choiceName} not found for ${col.schemaName}. Skipping.`,
        );
        return null;
      }
      return {
        ...base,
        "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
        "GlobalOptionSet@odata.bind": `/GlobalOptionSetDefinitions(${metadataId})`,
      };
    }

    case "Choice": {
      if (!col.localOptions || col.localOptions.length === 0) {
        console.warn(`  WARNING: Local choice ${col.schemaName} has no options. Skipping.`);
        return null;
      }
      return {
        ...base,
        "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
        OptionSet: {
          "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
          IsGlobal: false,
          OptionSetType: "Picklist",
          Options: col.localOptions.map((opt) => ({
            Value: opt.value,
            Label: label(opt.label),
          })),
        },
      };
    }

    case "Lookup":
    case "Calculated":
      return null;

    default:
      console.warn(`  WARNING: Unknown column type "${col.type}" for ${col.schemaName}. Skipping.`);
      return null;
  }
}

/**
 * Create an entity (table) with its primary name column only.
 * Returns the MetadataId of the created entity.
 */
export async function createTable(
  client: DataverseClient,
  table: TableDef,
  dryRun: boolean,
): Promise<string> {
  // Check if exists
  const ln = logicalName(table.schemaName);
  const checkRes = await client.fetch(
    `/EntityDefinitions(LogicalName='${ln}')?$select=MetadataId`,
  );
  if (checkRes.ok) {
    const existing = (await checkRes.json()) as { MetadataId: string };
    console.log(`  Table ${table.schemaName} already exists.`);
    return existing.MetadataId;
  }

  if (dryRun) {
    console.log(`  [DRY RUN] Would create table ${table.schemaName}`);
    return "dry-run-id";
  }

  // Find the primary column definition
  const primaryCol = table.columns.find((c) => c.schemaName === table.primaryColumn);
  if (!primaryCol) {
    throw new Error(
      `Primary column ${table.primaryColumn} not found in ${table.schemaName}`,
    );
  }

  const primaryAttr: Record<string, unknown> = {
    "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
    SchemaName: primaryCol.schemaName,
    DisplayName: label(primaryCol.displayName),
    Description: label(primaryCol.description ?? ""),
    RequiredLevel: { Value: "None" },
    MaxLength: primaryCol.maxLength ?? 200,
    FormatName: { Value: "Text" },
  };

  const ownershipType =
    table.ownership === "User" ? "UserOwned" : "OrganizationOwned";

  const body = {
    "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
    SchemaName: table.schemaName,
    DisplayName: label(table.displayName),
    DisplayCollectionName: label(table.pluralName),
    Description: label(table.description),
    OwnershipType: ownershipType,
    IsAuditEnabled: { Value: table.auditEnabled, CanBeChanged: true },
    HasNotes: true,
    HasActivities: false,
    Attributes: [primaryAttr],
  };

  const result = (await apiPost(client, "/EntityDefinitions", body)) as {
    MetadataId: string;
  };
  console.log(`  Created table ${table.schemaName}.`);
  return result.MetadataId;
}

/**
 * Add non-lookup, non-primary columns to an existing table.
 */
export async function createTableColumns(
  client: DataverseClient,
  table: TableDef,
  entityMetadataId: string,
  globalChoiceMap: Map<string, string>,
  dryRun: boolean,
): Promise<void> {
  const nonPrimaryColumns = table.columns.filter(
    (c) => c.schemaName !== table.primaryColumn && c.type !== "Lookup" && c.type !== "Calculated",
  );

  for (const col of nonPrimaryColumns) {
    const colMeta = buildColumnMetadata(col, globalChoiceMap, false);
    if (!colMeta) continue;

    if (dryRun) {
      console.log(`    [DRY RUN] Would create column ${col.schemaName}`);
      continue;
    }

    try {
      await apiPost(
        client,
        `/EntityDefinitions(${entityMetadataId})/Attributes`,
        colMeta,
      );
      console.log(`    Created column ${col.schemaName}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists") || msg.includes("DuplicateRecord")) {
        console.log(`    Column ${col.schemaName} already exists.`);
      } else {
        console.error(`    ERROR creating column ${col.schemaName}: ${msg}`);
      }
    }
  }
}

// ── Relationships ──────────────────────────────────────────────────────

/**
 * Create a one-to-many (N:1 from child perspective) relationship.
 * This auto-creates the lookup column on the child table.
 */
export async function createRelationship(
  client: DataverseClient,
  childTable: TableDef,
  foreignKey: string,
  targetTableSchemaName: string,
  lookupCol: ColumnDef,
  dryRun: boolean,
): Promise<void> {
  const relSchemaName = `seo_${childTable.schemaName.replace("seo_", "")}_${foreignKey.replace("seo_", "")}`;
  const childLogical = logicalName(childTable.schemaName);
  const parentLogical = logicalName(targetTableSchemaName);

  if (dryRun) {
    console.log(
      `    [DRY RUN] Would create relationship ${relSchemaName} (${childLogical}.${foreignKey} → ${parentLogical})`,
    );
    return;
  }

  const body = {
    "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
    SchemaName: relSchemaName,
    ReferencedEntity: parentLogical,
    ReferencingEntity: childLogical,
    ReferencingEntityNavigationPropertyName: foreignKey,
    ReferencedEntityNavigationPropertyName: `seo_${childTable.schemaName.replace("seo_", "")}_${foreignKey.replace("seo_", "")}`,
    Lookup: {
      "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
      SchemaName: foreignKey,
      DisplayName: label(lookupCol.displayName),
      Description: label(lookupCol.description ?? ""),
      RequiredLevel: reqLevel(lookupCol),
    },
    CascadeConfiguration: {
      Assign: "NoCascade",
      Delete: "RemoveLink",
      Merge: "NoCascade",
      Reparent: "NoCascade",
      Share: "NoCascade",
      Unshare: "NoCascade",
      RollupView: "NoCascade",
    },
  };

  try {
    await apiPost(client, "/RelationshipDefinitions", body);
    console.log(
      `    Created relationship ${foreignKey} (${childLogical} → ${parentLogical})`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists") || msg.includes("DuplicateRecord")) {
      console.log(`    Relationship ${foreignKey} already exists.`);
    } else {
      console.error(`    ERROR creating relationship ${foreignKey}: ${msg}`);
    }
  }
}

// ── AutoNumber Format ──────────────────────────────────────────────────

export async function setAutoNumberFormat(
  client: DataverseClient,
  entityLogicalName: string,
  columnLogicalName: string,
  format: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    console.log(
      `  [DRY RUN] Would set AutoNumberFormat on ${entityLogicalName}.${columnLogicalName} = "${format}"`,
    );
    return;
  }

  // Get the attribute MetadataId first
  const attrRes = await client.fetch(
    `/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${columnLogicalName}')?$select=MetadataId`,
  );
  if (!attrRes.ok) {
    console.warn(
      `  WARNING: Could not find attribute ${columnLogicalName} on ${entityLogicalName} for AutoNumber.`,
    );
    return;
  }
  const attr = (await attrRes.json()) as { MetadataId: string };

  const patchRes = await client.fetch(
    `/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(${attr.MetadataId})`,
    {
      method: "PUT",
      body: JSON.stringify({
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        AutoNumberFormat: format,
      }),
    },
  );

  if (!patchRes.ok) {
    const text = await patchRes.text();
    console.warn(
      `  WARNING: Failed to set AutoNumberFormat on ${entityLogicalName}.${columnLogicalName}: ${text}`,
    );
  } else {
    console.log(
      `  Set AutoNumberFormat on ${entityLogicalName}.${columnLogicalName} = "${format}"`,
    );
  }
}

// ── Solution Components ────────────────────────────────────────────────

const COMPONENT_TYPE = {
  Entity: 1,
  OptionSet: 9,
  EntityRelationship: 10,
  EnvironmentVariableDefinition: 380,
} as const;

export async function addComponentToSolution(
  client: DataverseClient,
  componentType: number,
  componentId: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    console.log(
      `  [DRY RUN] Would add component ${componentId} (type ${componentType}) to solution`,
    );
    return;
  }

  try {
    await apiPost(client, "/AddSolutionComponent", {
      ComponentId: componentId,
      ComponentType: componentType,
      SolutionUniqueName: "EmergencyResponseCoordination",
      AddRequiredComponents: false,
      DoNotIncludeSubcomponents: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Component may already be in the solution
    if (!msg.includes("already exists")) {
      console.warn(`  WARNING: AddSolutionComponent failed: ${msg}`);
    }
  }
}

export async function addEntitiesToSolution(
  client: DataverseClient,
  entityMetadataIds: Map<string, string>,
  dryRun: boolean,
): Promise<void> {
  for (const [name, metadataId] of entityMetadataIds) {
    if (metadataId === "dry-run-id") continue;
    await addComponentToSolution(client, COMPONENT_TYPE.Entity, metadataId, dryRun);
    console.log(`  Added entity ${name} to solution.`);
  }
}

export async function addOptionSetsToSolution(
  client: DataverseClient,
  optionSetIds: Map<string, string>,
  dryRun: boolean,
): Promise<void> {
  for (const [name, metadataId] of optionSetIds) {
    if (metadataId === "dry-run-id") continue;
    await addComponentToSolution(client, COMPONENT_TYPE.OptionSet, metadataId, dryRun);
    console.log(`  Added option set ${name} to solution.`);
  }
}

// ── Environment Variables ──────────────────────────────────────────────

export async function createEnvironmentVariable(
  client: DataverseClient,
  envVar: EnvVarDef,
  dryRun: boolean,
): Promise<string> {
  // Check if exists
  const checkRes = await client.fetch(
    `/environmentvariabledefinitions?$filter=schemaname eq '${envVar.schemaName}'&$select=environmentvariabledefinitionid`,
  );
  const checkData = (await checkRes.json()) as {
    value: Array<{ environmentvariabledefinitionid: string }>;
  };
  if (checkData.value.length > 0) {
    console.log(`  Env var ${envVar.schemaName} already exists.`);
    return checkData.value[0].environmentvariabledefinitionid;
  }

  if (dryRun) {
    console.log(`  [DRY RUN] Would create env var ${envVar.schemaName}`);
    return "dry-run-id";
  }

  // Map our type names to Dataverse environment variable types
  const typeMap: Record<string, number> = {
    String: 100000000,
    Decimal: 100000001,
    Boolean: 100000002,
    JSON: 100000003,
  };

  const dvType = typeMap[envVar.type] ?? 100000000; // Default to String

  const defBody = {
    schemaname: envVar.schemaName,
    displayname: envVar.displayName,
    description: envVar.description,
    type: dvType,
  };

  const result = (await apiPost(
    client,
    "/environmentvariabledefinitions",
    defBody,
  )) as { environmentvariabledefinitionid: string };

  // Create a default value if one is specified
  if (envVar.defaultValue) {
    try {
      await apiPost(client, "/environmentvariablevalues", {
        schemaname: `${envVar.schemaName}_default`,
        value: envVar.defaultValue,
        "EnvironmentVariableDefinitionId@odata.bind": `/environmentvariabledefinitions(${result.environmentvariabledefinitionid})`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  WARNING: Failed to set default value for ${envVar.schemaName}: ${msg}`);
    }
  }

  console.log(`  Created env var ${envVar.schemaName}.`);
  return result.environmentvariabledefinitionid;
}

// ── Entity Set Names ───────────────────────────────────────────────────

export async function getEntitySetNames(
  client: DataverseClient,
  schemaNames: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  // Query in batches of 10 to avoid URL length limits
  for (let i = 0; i < schemaNames.length; i += 10) {
    const batch = schemaNames.slice(i, i + 10);
    const filter = batch.map((n) => `SchemaName eq '${n}'`).join(" or ");
    const res = await client.fetch(
      `/EntityDefinitions?$select=SchemaName,EntitySetName&$filter=${filter}`,
    );
    if (!res.ok) {
      console.warn(`  WARNING: Failed to get entity set names: ${res.status}`);
      continue;
    }
    const data = (await res.json()) as {
      value: Array<{ SchemaName: string; EntitySetName: string }>;
    };
    for (const entity of data.value) {
      map.set(entity.SchemaName, entity.EntitySetName);
    }
  }

  return map;
}

// ── Publish ────────────────────────────────────────────────────────────

export async function publishAll(client: DataverseClient, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log("[DRY RUN] Would call PublishAllXml");
    return;
  }

  console.log("Publishing all customizations...");
  const res = await client.fetch("/PublishAllXml", {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn(`WARNING: PublishAllXml failed: ${text}`);
  } else {
    console.log("Published all customizations.");
  }
}
