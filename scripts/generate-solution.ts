/**
 * generate-solution.ts
 *
 * Generates a Dataverse unmanaged solution .zip from the project's JSON specs.
 * The .zip can be imported directly via make.powerapps.com -> Solutions -> Import.
 *
 * Usage:  cd scripts && npx tsx generate-solution.ts
 * Output: ../EmergencyResponseCoordination.zip
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { execFileSync, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readSpecs } from "./lib/spec-reader.js";
import type {
  TableDef, ColumnDef, GlobalChoice, EnvVarDef,
  ViewDef, ViewFilter, ViewFilterCondition,
  FormDef, FormTab, FormSection, FormField, SubgridDef,
} from "./lib/spec-reader.js";

// ── Constants ────────────────────────────────────────────────────────────

const SOLUTION_VERSION = "0.8.0.0";
const SOLUTION_UNIQUE_NAME = "EmergencyResponseCoordination";
const SOLUTION_FRIENDLY_NAME = "Emergency Response Coordination";
const SOLUTION_DESCRIPTION =
  "End-to-end emergency response coordination for fire and EMS agencies.";

const PUBLISHER_UNIQUE_NAME = "StateEmergencyOps";
const PUBLISHER_FRIENDLY_NAME = "State Emergency Operations";
const PUBLISHER_DESCRIPTION =
  "Publisher for emergency response solutions targeting state, city, and local jurisdictions.";
const PUBLISHER_PREFIX = "seo";
const OPTION_VALUE_PREFIX = 10000;

const LANG = "1033";
const PAC_CLI = "C:\\Users\\pogorman\\AppData\\Local\\Microsoft\\PowerAppsCLI\\pac.cmd";
const PAC_GEO = "USGovernment"; // GCC tenant — matches --cloud UsGov auth profile

const XML_HEADER = `<?xml version="1.0" encoding="utf-8"?>`;
const SOL_ROOT_ATTRS =
  `version="9.2.24.4" SolutionPackageVersion="9.2" languagecode="${LANG}" generatedBy="CrmLive" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`;

// Control class IDs for form XML
const CLASSID_STANDARD = "{4273EDBD-AC1D-40d3-9FB2-095C621B552D}";
const CLASSID_LOOKUP = "{270BD3DB-D9AF-4782-9025-509E298DEC0A}";
const CLASSID_SUBGRID = "{E7A81278-8635-4D9E-8D4D-59480B391C5B}";

// ── Helpers ──────────────────────────────────────────────────────────────

/** XML-escape a string for use in attribute values and text content. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Convert a schema name to its Dataverse logical name (lowercase). */
function ln(schemaName: string): string {
  return schemaName.toLowerCase();
}

/** Generate a deterministic GUID from a seed string (MD5-based, formatted as GUID). */
function deterministicGuid(seed: string): string {
  const hash = crypto.createHash("md5").update(seed).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}

// ── Choice Value Map ─────────────────────────────────────────────────────

/**
 * Build a lookup: entityLogical → columnLogical → label → numericValue
 * Used to resolve human-readable filter values (e.g. "Closed") to their
 * numeric option set values (e.g. 100000007).
 */
type ChoiceValueMap = Map<string, Map<string, Map<string, number>>>;

function buildChoiceValueMap(tables: TableDef[], globalChoices: GlobalChoice[]): ChoiceValueMap {
  const gcMap = new Map<string, GlobalChoice>();
  for (const gc of globalChoices) gcMap.set(gc.schemaName, gc);

  const result: ChoiceValueMap = new Map();

  for (const table of tables) {
    const entityLogical = ln(table.schemaName);
    const colMap = new Map<string, Map<string, number>>();

    for (const col of table.columns) {
      let options: { value: number; label: string }[] | undefined;
      if (col.type === "GlobalChoice" && col.choiceName) {
        options = gcMap.get(col.choiceName)?.options;
      } else if (col.type === "Choice" && col.localOptions) {
        options = col.localOptions;
      }
      if (options) {
        const labelMap = new Map<string, number>();
        for (const opt of options) labelMap.set(opt.label, opt.value);
        colMap.set(ln(col.schemaName), labelMap);
      }
    }

    if (colMap.size > 0) result.set(entityLogical, colMap);
  }

  return result;
}

/** Resolve a label to its numeric choice value, or return the value as-is if numeric. */
function resolveChoiceValue(
  choiceMap: ChoiceValueMap,
  entityLogical: string,
  columnLogical: string,
  label: unknown,
): string {
  if (typeof label === "number") return String(label);
  if (typeof label === "boolean") return label ? "1" : "0";
  const str = String(label);
  const numericVal = choiceMap.get(entityLogical)?.get(columnLogical)?.get(str);
  if (numericVal !== undefined) return String(numericVal);
  // Return as-is (could be a numeric string)
  return str;
}

// ── [Content_Types].xml ──────────────────────────────────────────────────

function generateContentTypes(): string {
  return [
    XML_HEADER,
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
    `  <Default Extension="xml" ContentType="application/octet-stream" />`,
    `</Types>`,
  ].join("\n");
}

// ── solution.xml ─────────────────────────────────────────────────────────

function generateSolutionXml(
  tables: TableDef[],
  globalChoices: GlobalChoice[],
  envVars: EnvVarDef[],
): string {
  const rc: string[] = [];

  for (const t of tables) {
    rc.push(`      <RootComponent type="1" schemaName="${ln(t.schemaName)}" behavior="0" />`);
  }
  // Global option sets are inlined as local option sets in each column to avoid
  // name collisions during import. No type=9 root components needed.
  // for (const c of globalChoices) {
  //   rc.push(`      <RootComponent type="9" schemaName="${esc(c.schemaName)}" behavior="0" />`);
  // }
  // TODO: Re-enable when env var format is validated
  // for (const e of envVars) {
  //   rc.push(`      <RootComponent type="380" schemaName="${esc(e.schemaName)}" behavior="0" />`);
  // }

  return [
    XML_HEADER,
    `<ImportExportXml ${SOL_ROOT_ATTRS}>`,
    `  <SolutionManifest>`,
    `    <UniqueName>${SOLUTION_UNIQUE_NAME}</UniqueName>`,
    `    <LocalizedNames>`,
    `      <LocalizedName description="${esc(SOLUTION_FRIENDLY_NAME)}" languagecode="${LANG}" />`,
    `    </LocalizedNames>`,
    `    <Descriptions>`,
    `      <Description description="${esc(SOLUTION_DESCRIPTION)}" languagecode="${LANG}" />`,
    `    </Descriptions>`,
    `    <Version>${SOLUTION_VERSION}</Version>`,
    `    <Managed>0</Managed>`,
    `    <Publisher>`,
    `      <UniqueName>${PUBLISHER_UNIQUE_NAME}</UniqueName>`,
    `      <LocalizedNames>`,
    `        <LocalizedName description="${esc(PUBLISHER_FRIENDLY_NAME)}" languagecode="${LANG}" />`,
    `      </LocalizedNames>`,
    `      <Descriptions>`,
    `        <Description description="${esc(PUBLISHER_DESCRIPTION)}" languagecode="${LANG}" />`,
    `      </Descriptions>`,
    `      <EMailAddress xsi:nil="true"></EMailAddress>`,
    `      <SupportingWebsiteUrl xsi:nil="true"></SupportingWebsiteUrl>`,
    `      <CustomizationPrefix>${PUBLISHER_PREFIX}</CustomizationPrefix>`,
    `      <CustomizationOptionValuePrefix>${OPTION_VALUE_PREFIX}</CustomizationOptionValuePrefix>`,
    generatePublisherAddresses(),
    `    </Publisher>`,
    `    <RootComponents>`,
    ...rc,
    `    </RootComponents>`,
    `    <MissingDependencies />`,
    `  </SolutionManifest>`,
    `</ImportExportXml>`,
  ].join("\n");
}

function generatePublisherAddresses(): string {
  const nilFields = [
    "AddressTypeCode", "City", "County", "Country", "Fax", "FreightTermsCode",
    "ImportSequenceNumber", "Latitude", "Line1", "Line2", "Line3",
    "Longitude", "Name", "PostalCode", "PostOfficeBox",
    "PrimaryContactName", "ShippingMethodCode", "StateOrProvince",
    "Telephone1", "Telephone2", "Telephone3",
    "TimeZoneRuleVersionNumber", "UPSZone", "UTCOffset",
    "UTCConversionTimeZoneCode",
  ];

  const addr = (n: number): string => {
    const nils = nilFields.map((f) => `            <${f} xsi:nil="true"></${f}>`).join("\n");
    return [
      `          <Address>`,
      `            <AddressNumber>${n}</AddressNumber>`,
      nils,
      `          </Address>`,
    ].join("\n");
  };

  return [
    `      <Addresses>`,
    addr(1),
    addr(2),
    `      </Addresses>`,
  ].join("\n");
}

// ── customizations.xml — common attribute properties ─────────────────────

function commonAttributeProperties(
  col: ColumnDef,
  isPrimary: boolean,
  effectivePhysName?: string,
): string[] {
  const physName = effectivePhysName ?? ln(col.schemaName);
  const isAudit = col.audit ? "1" : "0";
  const isSecured = col.phi ? "1" : "0";
  const reqLevel =
    isPrimary && col.type === "AutoNumber"
      ? "none" // AutoNumber primary columns are system-filled
      : col.required || isPrimary
        ? "ApplicationRequired"
        : "none";

  // Build DisplayMask
  const maskParts = ["ValidForAdvancedFind", "ValidForForm", "ValidForGrid"];
  if (isPrimary) {
    maskParts.unshift("PrimaryName");
    maskParts.push("RequiredForForm");
  }
  const displayMask = maskParts.join("|");

  const lines: string[] = [];
  lines.push(`              <Name>${physName}</Name>`);
  lines.push(`              <LogicalName>${physName}</LogicalName>`);
  lines.push(`              <RequiredLevel>${reqLevel}</RequiredLevel>`);
  lines.push(`              <DisplayMask>${displayMask}</DisplayMask>`);
  lines.push(`              <ImeMode>auto</ImeMode>`);
  lines.push(`              <ValidForUpdateApi>1</ValidForUpdateApi>`);
  lines.push(`              <ValidForReadApi>1</ValidForReadApi>`);
  lines.push(`              <ValidForCreateApi>1</ValidForCreateApi>`);
  lines.push(`              <IsCustomField>1</IsCustomField>`);
  lines.push(`              <IsAuditEnabled>${isAudit}</IsAuditEnabled>`);
  lines.push(`              <IsSecured>${isSecured}</IsSecured>`);
  lines.push(`              <IntroducedVersion>${SOLUTION_VERSION}</IntroducedVersion>`);
  lines.push(`              <IsCustomizable>1</IsCustomizable>`);
  lines.push(`              <IsRenameable>1</IsRenameable>`);
  lines.push(`              <CanModifySearchSettings>1</CanModifySearchSettings>`);
  lines.push(`              <CanModifyRequirementLevelSettings>1</CanModifyRequirementLevelSettings>`);
  lines.push(`              <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>`);
  lines.push(`              <SourceType>0</SourceType>`);
  lines.push(`              <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>`);
  lines.push(`              <IsSortableEnabled>0</IsSortableEnabled>`);
  lines.push(`              <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>`);
  lines.push(`              <CanModifyIsSortableSettings>1</CanModifyIsSortableSettings>`);
  lines.push(`              <IsDataSourceSecret>0</IsDataSourceSecret>`);
  lines.push(`              <IsSearchable>0</IsSearchable>`);
  lines.push(`              <IsFilterable>0</IsFilterable>`);
  lines.push(`              <IsRetrievable>0</IsRetrievable>`);
  lines.push(`              <IsLocalizable>0</IsLocalizable>`);
  return lines;
}

// ── customizations.xml — attribute XML ───────────────────────────────────

function generateAttributeXml(
  col: ColumnDef,
  table: TableDef,
  isPrimary: boolean,
  globalChoicesMap: Map<string, GlobalChoice>,
): string {
  const physName = ln(col.schemaName);
  const entityLogical = ln(table.schemaName);

  // Detect collision with auto-generated primary key ({entity}id).
  // Dataverse auto-creates a GUID column named {entity}id. If a custom column
  // shares this name, rename the custom column to {entity}_name.
  const autoGeneratedPkName = `${entityLogical}id`;
  let effectivePhysName = physName;
  if (physName === autoGeneratedPkName) {
    effectivePhysName = `${entityLogical}_name`;
    console.warn(`  RENAME: ${col.schemaName} → ${effectivePhysName} (collides with auto-generated primary key)`);
  }

  const lines: string[] = [];
  lines.push(`            <attribute PhysicalName="${effectivePhysName}">`);

  // ── Type-specific elements ──
  switch (col.type) {
    case "String":
    case "AutoNumber":
      lines.push(`              <Type>nvarchar</Type>`);
      lines.push(...commonAttributeProperties(col, isPrimary, effectivePhysName));
      if (col.type === "AutoNumber" && col.format) {
        lines.push(`              <AutoNumberFormat>${esc(col.format)}</AutoNumberFormat>`);
      } else {
        lines.push(`              <AutoNumberFormat></AutoNumberFormat>`);
      }
      lines.push(`              <Format>text</Format>`);
      lines.push(`              <MaxLength>${col.maxLength ?? 200}</MaxLength>`);
      break;

    case "Memo":
      lines.push(`              <Type>ntext</Type>`);
      lines.push(...commonAttributeProperties(col, isPrimary, effectivePhysName));
      lines.push(`              <Format>text</Format>`);
      lines.push(`              <MaxLength>1048576</MaxLength>`);
      break;

    case "WholeNumber":
      lines.push(`              <Type>int</Type>`);
      lines.push(...commonAttributeProperties(col, isPrimary, effectivePhysName));
      lines.push(`              <Format>none</Format>`);
      lines.push(`              <MinValue>-2147483648</MinValue>`);
      lines.push(`              <MaxValue>2147483647</MaxValue>`);
      if (typeof col.default === "number") {
        lines.push(`              <AppDefaultValue>${col.default}</AppDefaultValue>`);
      }
      break;

    case "Float":
      lines.push(`              <Type>float</Type>`);
      lines.push(...commonAttributeProperties(col, isPrimary, effectivePhysName));
      lines.push(`              <Precision>${col.precision ?? 2}</Precision>`);
      lines.push(`              <MinValue>-100000000000</MinValue>`);
      lines.push(`              <MaxValue>100000000000</MaxValue>`);
      break;

    case "Decimal":
      lines.push(`              <Type>decimal</Type>`);
      lines.push(...commonAttributeProperties(col, isPrimary, effectivePhysName));
      lines.push(`              <Precision>${col.precision ?? 2}</Precision>`);
      lines.push(`              <MinValue>-100000000000</MinValue>`);
      lines.push(`              <MaxValue>100000000000</MaxValue>`);
      break;

    case "Currency":
      lines.push(`              <Type>money</Type>`);
      lines.push(...commonAttributeProperties(col, isPrimary, effectivePhysName));
      lines.push(`              <Precision>2</Precision>`);
      lines.push(`              <MinValue>-922337203685477</MinValue>`);
      lines.push(`              <MaxValue>922337203685477</MaxValue>`);
      lines.push(`              <IsBaseCurrency>0</IsBaseCurrency>`);
      break;

    case "Boolean": {
      const osName = `${PUBLISHER_PREFIX}_${entityLogical}_${effectivePhysName}`;
      lines.push(`              <Type>bit</Type>`);
      lines.push(...commonAttributeProperties(col, isPrimary, effectivePhysName));
      lines.push(`              <AppDefaultValue>${col.default === true ? "1" : "0"}</AppDefaultValue>`);
      lines.push(`              <optionset Name="${osName}">`);
      lines.push(`                <OptionSetType>bit</OptionSetType>`);
      lines.push(`                <IntroducedVersion>${SOLUTION_VERSION}</IntroducedVersion>`);
      lines.push(`                <IsCustomizable>1</IsCustomizable>`);
      lines.push(`                <ExternalTypeName></ExternalTypeName>`);
      lines.push(`                <displaynames>`);
      lines.push(`                  <displayname description="${esc(col.displayName)}" languagecode="${LANG}" />`);
      lines.push(`                </displaynames>`);
      lines.push(`                <Descriptions>`);
      lines.push(`                  <Description description="" languagecode="${LANG}" />`);
      lines.push(`                </Descriptions>`);
      lines.push(`                <options>`);
      lines.push(`                  <option value="1" ExternalValue="" IsHidden="0">`);
      lines.push(`                    <labels>`);
      lines.push(`                      <label description="Yes" languagecode="${LANG}" />`);
      lines.push(`                    </labels>`);
      lines.push(`                  </option>`);
      lines.push(`                  <option value="0" ExternalValue="" IsHidden="0">`);
      lines.push(`                    <labels>`);
      lines.push(`                      <label description="No" languagecode="${LANG}" />`);
      lines.push(`                    </labels>`);
      lines.push(`                  </option>`);
      lines.push(`                </options>`);
      lines.push(`              </optionset>`);
      break;
    }

    case "DateTime":
      lines.push(`              <Type>datetime</Type>`);
      lines.push(...commonAttributeProperties(col, isPrimary, effectivePhysName));
      lines.push(`              <Format>datetime</Format>`);
      lines.push(`              <CanChangeDateTimeBehavior>1</CanChangeDateTimeBehavior>`);
      lines.push(`              <Behavior>1</Behavior>`);
      break;

    case "DateOnly":
      lines.push(`              <Type>datetime</Type>`);
      lines.push(...commonAttributeProperties(col, isPrimary, effectivePhysName));
      lines.push(`              <Format>date</Format>`);
      lines.push(`              <CanChangeDateTimeBehavior>1</CanChangeDateTimeBehavior>`);
      lines.push(`              <Behavior>2</Behavior>`);
      break;

    case "GlobalChoice": {
      // Emit global choices as local inline option sets to avoid name collisions during import.
      // The option set is named {entity}_{column} to guarantee uniqueness.
      const gcOsName = `${entityLogical}_${effectivePhysName}`;
      const gc = globalChoicesMap.get(col.choiceName ?? "");
      lines.push(`              <Type>picklist</Type>`);
      lines.push(...commonAttributeProperties(col, isPrimary, effectivePhysName));
      lines.push(`              <optionset Name="${gcOsName}">`);
      lines.push(`                <IsGlobal>0</IsGlobal>`);
      lines.push(`                <IntroducedVersion>${SOLUTION_VERSION}</IntroducedVersion>`);
      lines.push(`                <IsCustomizable>1</IsCustomizable>`);
      lines.push(`                <OptionSetType>picklist</OptionSetType>`);
      lines.push(`                <ExternalTypeName></ExternalTypeName>`);
      lines.push(`                <displaynames>`);
      lines.push(`                  <displayname description="${esc(gc?.displayName ?? col.displayName)}" languagecode="${LANG}" />`);
      lines.push(`                </displaynames>`);
      if (gc?.description) {
        lines.push(`                <Descriptions>`);
        lines.push(`                  <Description description="${esc(gc.description)}" languagecode="${LANG}" />`);
        lines.push(`                </Descriptions>`);
      }
      lines.push(`                <options>`);
      for (const opt of gc?.options ?? []) {
        lines.push(`                  <option value="${opt.value}" ExternalValue="" IsHidden="0">`);
        lines.push(`                    <labels>`);
        lines.push(`                      <label description="${esc(opt.label)}" languagecode="${LANG}" />`);
        lines.push(`                    </labels>`);
        lines.push(`                  </option>`);
      }
      lines.push(`                </options>`);
      lines.push(`              </optionset>`);
      break;
    }

    case "Choice": {
      const osName = `${entityLogical}_${effectivePhysName}`;
      lines.push(`              <Type>picklist</Type>`);
      lines.push(...commonAttributeProperties(col, isPrimary, effectivePhysName));
      lines.push(`              <optionset Name="${osName}">`);
      lines.push(`                <IsGlobal>0</IsGlobal>`);
      lines.push(`                <IntroducedVersion>${SOLUTION_VERSION}</IntroducedVersion>`);
      lines.push(`                <IsCustomizable>1</IsCustomizable>`);
      lines.push(`                <OptionSetType>picklist</OptionSetType>`);
      lines.push(`                <ExternalTypeName></ExternalTypeName>`);
      lines.push(`                <displaynames>`);
      lines.push(`                  <displayname description="${esc(col.displayName)}" languagecode="${LANG}" />`);
      lines.push(`                </displaynames>`);
      if (col.description) {
        lines.push(`                <Descriptions>`);
        lines.push(`                  <Description description="${esc(col.description)}" languagecode="${LANG}" />`);
        lines.push(`                </Descriptions>`);
      }
      lines.push(`                <options>`);
      for (const opt of col.localOptions ?? []) {
        lines.push(`                  <option value="${opt.value}" ExternalValue="" IsHidden="0">`);
        lines.push(`                    <labels>`);
        lines.push(`                      <label description="${esc(opt.label)}" languagecode="${LANG}" />`);
        lines.push(`                    </labels>`);
        lines.push(`                  </option>`);
      }
      lines.push(`                </options>`);
      lines.push(`              </optionset>`);
      break;
    }

    case "Lookup": {
      const target = col.target ?? "";
      // Skip systemuser lookups — built-in table, configure manually
      if (ln(target) === "systemuser") return "";
      lines.push(`              <Type>lookup</Type>`);
      lines.push(...commonAttributeProperties(col, isPrimary, effectivePhysName));
      lines.push(`              <LookupStyle>single</LookupStyle>`);
      lines.push(`              <LookupTypes />`);
      break;
    }

    case "Calculated":
      return ""; // Skip — configure in maker portal post-import

    default:
      console.warn(`  WARNING: Unknown column type "${col.type}" for ${col.schemaName} — skipping`);
      return "";
  }

  // ── Display names and descriptions (at the end, matching reference) ──
  lines.push(`              <displaynames>`);
  lines.push(`                <displayname description="${esc(col.displayName)}" languagecode="${LANG}" />`);
  lines.push(`              </displaynames>`);
  if (col.description) {
    lines.push(`              <Descriptions>`);
    lines.push(`                <Description description="${esc(col.description)}" languagecode="${LANG}" />`);
    lines.push(`              </Descriptions>`);
  }
  lines.push(`            </attribute>`);

  return lines.join("\n");
}

// ── customizations.xml — root-level entity relationships ─────────────────

function generateAllRelationshipsXml(tables: TableDef[]): string {
  const lines: string[] = [];

  for (const table of tables) {
    const lookupCols = table.columns.filter(
      (c) => c.type === "Lookup" && ln(c.target ?? "") !== "systemuser",
    );

    for (const col of lookupCols) {
      const target = col.target ?? "";
      const childLogical = ln(table.schemaName);
      const parentLogical = ln(target);
      const fkLogical = ln(col.schemaName);
      // Match naming from metadata.ts: seo_{ChildTable}_{fkColumn}
      const relName = `seo_${table.schemaName.replace("seo_", "")}_${col.schemaName.replace("seo_", "")}`;

      lines.push(`    <EntityRelationship Name="${esc(relName)}">`);
      lines.push(`      <EntityRelationshipType>OneToMany</EntityRelationshipType>`);
      lines.push(`      <IsCustomizable>1</IsCustomizable>`);
      lines.push(`      <IntroducedVersion>${SOLUTION_VERSION}</IntroducedVersion>`);
      lines.push(`      <IsHierarchical>0</IsHierarchical>`);
      lines.push(`      <ReferencingEntityName>${childLogical}</ReferencingEntityName>`);
      lines.push(`      <ReferencedEntityName>${parentLogical}</ReferencedEntityName>`);
      lines.push(`      <CascadeAssign>NoCascade</CascadeAssign>`);
      lines.push(`      <CascadeDelete>RemoveLink</CascadeDelete>`);
      lines.push(`      <CascadeArchive>RemoveLink</CascadeArchive>`);
      lines.push(`      <CascadeReparent>NoCascade</CascadeReparent>`);
      lines.push(`      <CascadeShare>NoCascade</CascadeShare>`);
      lines.push(`      <CascadeUnshare>NoCascade</CascadeUnshare>`);
      lines.push(`      <CascadeRollupView>NoCascade</CascadeRollupView>`);
      lines.push(`      <IsValidForAdvancedFind>1</IsValidForAdvancedFind>`);
      lines.push(`      <ReferencingAttributeName>${fkLogical}</ReferencingAttributeName>`);
      lines.push(`      <RelationshipDescription>`);
      lines.push(`        <Descriptions>`);
      lines.push(`          <Description description="" languagecode="${LANG}" />`);
      lines.push(`        </Descriptions>`);
      lines.push(`      </RelationshipDescription>`);
      lines.push(`      <EntityRelationshipRoles>`);
      lines.push(`        <EntityRelationshipRole>`);
      lines.push(`          <NavPaneDisplayOption>UseCollectionName</NavPaneDisplayOption>`);
      lines.push(`          <NavPaneArea>Details</NavPaneArea>`);
      lines.push(`          <NavPaneOrder>10000</NavPaneOrder>`);
      lines.push(`          <NavigationPropertyName>${fkLogical}</NavigationPropertyName>`);
      lines.push(`          <RelationshipRoleType>1</RelationshipRoleType>`);
      lines.push(`        </EntityRelationshipRole>`);
      lines.push(`        <EntityRelationshipRole>`);
      lines.push(`          <NavigationPropertyName>${esc(relName)}</NavigationPropertyName>`);
      lines.push(`          <RelationshipRoleType>0</RelationshipRoleType>`);
      lines.push(`        </EntityRelationshipRole>`);
      lines.push(`      </EntityRelationshipRoles>`);
      lines.push(`    </EntityRelationship>`);
    }
  }

  return lines.join("\n");
}

// ── customizations.xml — SavedQueries (views) ────────────────────────────

function generateSavedQueriesXml(
  entityLogical: string,
  primaryColumnLogical: string,
  views: ViewDef[],
  choiceMap: ChoiceValueMap,
  allTables: TableDef[],
): string {
  // Build set of valid column names for this entity (for validation)
  const table = allTables.find((t) => ln(t.schemaName) === entityLogical);
  const validColumns = new Set<string>();
  if (table) {
    for (const col of table.columns) {
      validColumns.add(ln(col.schemaName));
    }
  }
  // Always include auto-generated PK and primary name
  validColumns.add(`${entityLogical}id`);
  validColumns.add(primaryColumnLogical);
  // Standard system columns
  validColumns.add("createdon");
  validColumns.add("modifiedon");
  validColumns.add("statecode");
  validColumns.add("statuscode");
  validColumns.add("ownerid");

  const lines: string[] = [];
  lines.push(`      <SavedQueries>`);
  lines.push(`        <savedqueries>`);

  for (const view of views) {
    const viewGuid = deterministicGuid(`view:${entityLogical}:${view.schemaName}`);
    const pkColumn = `${entityLogical}id`;

    // Filter view columns to only valid attributes
    const validViewCols = view.columns.filter((c) => {
      const colLog = ln(c.name);
      if (colLog.includes(".")) return false; // linked entity
      if (!validColumns.has(colLog)) {
        console.warn(`  SKIP COLUMN: ${c.name} on ${entityLogical} (column not found in table def)`);
        return false;
      }
      return true;
    });

    // Build layoutxml
    const cellsXml = validViewCols
      .map((c) => `              <cell name="${ln(c.name)}" width="${c.width}" />`)
      .join("\n");
    const layoutXml = [
      `            <grid name="resultset" jump="${primaryColumnLogical}" select="1" icon="1" preview="1">`,
      `              <row name="result" id="${pkColumn}">`,
      cellsXml,
      `              </row>`,
      `            </grid>`,
    ].join("\n");

    // Build fetchxml
    const fetchLines: string[] = [];
    fetchLines.push(`            <fetch version="1.0" mapping="logical">`);
    fetchLines.push(`              <entity name="${entityLogical}">`);
    // Always include PK
    fetchLines.push(`                <attribute name="${pkColumn}" />`);
    // Add view columns (only valid ones)
    for (const col of validViewCols) {
      const colLogical = ln(col.name);
      fetchLines.push(`                <attribute name="${colLogical}" />`);
    }
    // Sort orders (skip invalid columns)
    for (const sort of view.sortOrder) {
      const sortCol = ln(sort.column);
      if (!validColumns.has(sortCol)) {
        console.warn(`  SKIP SORT: ${sort.column} on ${entityLogical} (column not found)`);
        continue;
      }
      const desc = sort.direction === "Descending" ? "true" : "false";
      fetchLines.push(`                <order attribute="${sortCol}" descending="${desc}" />`);
    }
    // Filter (with column validation)
    if (view.filter) {
      fetchLines.push(generateFetchFilterXml(view.filter, entityLogical, choiceMap, 16, validColumns));
    }
    fetchLines.push(`              </entity>`);
    fetchLines.push(`            </fetch>`);

    lines.push(`          <savedquery>`);
    lines.push(`            <IsCustomizable>1</IsCustomizable>`);
    lines.push(`            <CanBeDeleted>1</CanBeDeleted>`);
    lines.push(`            <isquickfindquery>0</isquickfindquery>`);
    lines.push(`            <isprivate>0</isprivate>`);
    lines.push(`            <isdefault>${view.isDefault ? "1" : "0"}</isdefault>`);
    lines.push(`            <savedqueryid>{${viewGuid}}</savedqueryid>`);
    lines.push(`            <layoutxml>`);
    lines.push(layoutXml);
    lines.push(`            </layoutxml>`);
    lines.push(`            <querytype>0</querytype>`);
    lines.push(`            <fetchxml>`);
    lines.push(fetchLines.join("\n"));
    lines.push(`            </fetchxml>`);
    lines.push(`            <IntroducedVersion>${SOLUTION_VERSION}</IntroducedVersion>`);
    lines.push(`            <LocalizedNames>`);
    lines.push(`              <LocalizedName description="${esc(view.displayName)}" languagecode="${LANG}" />`);
    lines.push(`            </LocalizedNames>`);
    if (view.description) {
      lines.push(`            <Descriptions>`);
      lines.push(`              <Description description="${esc(view.description)}" languagecode="${LANG}" />`);
      lines.push(`            </Descriptions>`);
    }
    lines.push(`          </savedquery>`);
  }

  lines.push(`        </savedqueries>`);
  lines.push(`      </SavedQueries>`);
  return lines.join("\n");
}

/** Generate FetchXML filter block from a ViewFilter spec. */
function generateFetchFilterXml(
  filter: ViewFilter,
  entityLogical: string,
  choiceMap: ChoiceValueMap,
  indent: number,
  validColumns?: Set<string>,
): string {
  const pad = " ".repeat(indent);
  const lines: string[] = [];
  lines.push(`${pad}<filter type="${filter.type}">`);

  for (const cond of filter.conditions) {
    const colLogical = ln(cond.column);

    // Handle linked entity filters (e.g. "seo_incidentId.seo_status")
    if (colLogical.includes(".")) {
      console.warn(`  SKIP FILTER: ${cond.column} (linked entity filter — configure manually)`);
      continue;
    }

    // Skip columns that don't exist on this entity
    if (validColumns && !validColumns.has(colLogical)) {
      console.warn(`  SKIP FILTER: ${cond.column} on ${entityLogical} (column not found in table def)`);
      continue;
    }

    const op = cond.operator;

    // Operators that take no value
    if (op === "null" || op === "not-null") {
      lines.push(`${pad}  <condition attribute="${colLogical}" operator="${op}" />`);
      continue;
    }

    // Operators that take no explicit value (relative date)
    if (op === "today" || op === "yesterday" || op === "this-week" || op === "this-month" || op === "this-year") {
      lines.push(`${pad}  <condition attribute="${colLogical}" operator="${op}" />`);
      continue;
    }

    // eq-businessid — special FetchXML operator, no value needed
    if (op === "eq-businessid") {
      lines.push(`${pad}  <condition attribute="${colLogical}" operator="${op}" />`);
      continue;
    }

    // Handle relative date objects: { type: "relative", unit: "days", offset: N }
    if (typeof cond.value === "object" && cond.value !== null && (cond.value as Record<string, unknown>).type === "relative") {
      const relObj = cond.value as Record<string, unknown>;
      const offset = relObj.offset as number;
      // on-or-before with relative days → next-x-days (within next N days)
      if (op === "on-or-before") {
        lines.push(`${pad}  <condition attribute="${colLogical}" operator="next-x-days" value="${offset}" />`);
      }
      // on-or-after with offset 0 → today or later
      else if (op === "on-or-after" && offset === 0) {
        lines.push(`${pad}  <condition attribute="${colLogical}" operator="today" />`);
      }
      // on-or-after with offset N → last-x-days
      else if (op === "on-or-after") {
        lines.push(`${pad}  <condition attribute="${colLogical}" operator="last-x-days" value="${offset}" />`);
      }
      // Generic: use next-x-days
      else {
        lines.push(`${pad}  <condition attribute="${colLogical}" operator="next-x-days" value="${offset}" />`);
      }
      continue;
    }

    // Relative date operators with numeric value (last-x-days, next-x-days, etc.)
    if (op === "last-x-days" || op === "next-x-days" || op === "last-x-months" ||
        op === "on-or-before" || op === "on-or-after") {
      const val = cond.value;
      if (typeof val === "number") {
        if (op === "on-or-before") {
          lines.push(`${pad}  <condition attribute="${colLogical}" operator="next-x-days" value="${val}" />`);
        } else if (op === "on-or-after") {
          if (val === 0) {
            lines.push(`${pad}  <condition attribute="${colLogical}" operator="today" />`);
          } else {
            lines.push(`${pad}  <condition attribute="${colLogical}" operator="last-x-days" value="${val}" />`);
          }
        } else {
          lines.push(`${pad}  <condition attribute="${colLogical}" operator="${op}" value="${val}" />`);
        }
      } else {
        lines.push(`${pad}  <condition attribute="${colLogical}" operator="${op}" value="${val}" />`);
      }
      continue;
    }

    // not-in with array of values
    if (op === "not-in" || op === "in") {
      const vals = cond.values ?? [];
      const resolvedVals = vals.map((v) => resolveChoiceValue(choiceMap, entityLogical, colLogical, v));
      lines.push(`${pad}  <condition attribute="${colLogical}" operator="${op}">`);
      for (const rv of resolvedVals) {
        lines.push(`${pad}    <value>${rv}</value>`);
      }
      lines.push(`${pad}  </condition>`);
      continue;
    }

    // Standard eq/ne/gt/lt etc. with single value
    const resolved = resolveChoiceValue(choiceMap, entityLogical, colLogical, cond.value);
    lines.push(`${pad}  <condition attribute="${colLogical}" operator="${op}" value="${resolved}" />`);
  }

  lines.push(`${pad}</filter>`);
  return lines.join("\n");
}

// ── customizations.xml — FormXml (forms) ──────────────────────────────────

function generateFormXmlBlock(
  entityLogical: string,
  forms: FormDef[],
  tables: TableDef[],
): string {
  const mainForms = forms.filter((f) => f.formType === "Main");
  const quickForms = forms.filter((f) => f.formType === "QuickCreate");

  const lines: string[] = [];
  lines.push(`      <FormXml>`);

  // Main forms
  if (mainForms.length > 0) {
    lines.push(`        <forms type="main">`);
    for (const form of mainForms) {
      lines.push(generateSystemFormXml(form, entityLogical, tables));
    }
    lines.push(`        </forms>`);
  }

  // Quick create forms
  if (quickForms.length > 0) {
    lines.push(`        <forms type="quick">`);
    for (const form of quickForms) {
      lines.push(generateQuickCreateFormXml(form, entityLogical, tables));
    }
    lines.push(`        </forms>`);
  }

  lines.push(`      </FormXml>`);
  return lines.join("\n");
}

/** Determine the control classid based on column type. */
function getControlClassId(fieldName: string, tables: TableDef[], entityLogical: string): string {
  // Find the table and column to determine type
  const table = tables.find((t) => ln(t.schemaName) === entityLogical);
  if (!table) return CLASSID_STANDARD;
  const col = table.columns.find((c) => ln(c.schemaName) === ln(fieldName));
  if (!col) return CLASSID_STANDARD;
  if (col.type === "Lookup") return CLASSID_LOOKUP;
  return CLASSID_STANDARD;
}

/** Generate a main form systemform XML. */
function generateSystemFormXml(
  form: FormDef,
  entityLogical: string,
  tables: TableDef[],
): string {
  const formGuid = deterministicGuid(`form:${entityLogical}:${form.schemaName}`);
  const lines: string[] = [];

  lines.push(`          <systemform>`);
  lines.push(`            <formid>{${formGuid}}</formid>`);
  lines.push(`            <IntroducedVersion>${SOLUTION_VERSION}</IntroducedVersion>`);
  lines.push(`            <FormPresentation>1</FormPresentation>`);
  lines.push(`            <FormActivationState>1</FormActivationState>`);
  lines.push(`            <form headerdensity="HighWithControls">`);

  // Tabs
  lines.push(`              <tabs>`);
  const tabs = form.layout.tabs ?? [];
  for (let tabIdx = 0; tabIdx < tabs.length; tabIdx++) {
    const tab = tabs[tabIdx];
    const tabGuid = deterministicGuid(`tab:${entityLogical}:${form.schemaName}:${tab.name}`);
    lines.push(`                <tab verticallayout="true" id="{${tabGuid}}" IsUserDefined="1" showlabel="true" expanded="true">`);
    lines.push(`                  <labels>`);
    lines.push(`                    <label description="${esc(tab.label)}" languagecode="${LANG}" />`);
    lines.push(`                  </labels>`);
    lines.push(`                  <columns>`);
    lines.push(`                    <column width="100%">`);
    lines.push(`                      <sections>`);
    for (const section of tab.sections) {
      lines.push(generateSectionXml(section, entityLogical, form.schemaName, tables));
    }
    lines.push(`                      </sections>`);
    lines.push(`                    </column>`);
    lines.push(`                  </columns>`);
    lines.push(`                </tab>`);
  }
  lines.push(`              </tabs>`);

  // Header
  if (form.header && form.header.length > 0) {
    const headerGuid = deterministicGuid(`header:${entityLogical}:${form.schemaName}`);
    lines.push(`              <header id="{${headerGuid}}" celllabelposition="Top" columns="1" labelwidth="115">`);
    lines.push(`                <rows>`);
    for (const hField of form.header) {
      const cellGuid = deterministicGuid(`headercell:${entityLogical}:${form.schemaName}:${hField.name}`);
      const classId = getControlClassId(hField.name, tables, entityLogical);
      lines.push(`                  <row>`);
      lines.push(`                    <cell id="{${cellGuid}}" showlabel="true">`);
      lines.push(`                      <labels>`);
      lines.push(`                        <label description="${esc(hField.label ?? hField.name)}" languagecode="${LANG}" />`);
      lines.push(`                      </labels>`);
      lines.push(`                      <control id="${ln(hField.name)}" classid="${classId}" datafieldname="${ln(hField.name)}" />`);
      lines.push(`                    </cell>`);
      lines.push(`                  </row>`);
    }
    lines.push(`                </rows>`);
    lines.push(`              </header>`);
  }

  // Footer (empty 3-cell, matching reference)
  const footerGuid = deterministicGuid(`footer:${entityLogical}:${form.schemaName}`);
  lines.push(`              <footer id="{${footerGuid}}" celllabelposition="Top" columns="111" labelwidth="115" celllabelalignment="Left">`);
  lines.push(`                <rows>`);
  lines.push(`                  <row>`);
  for (let i = 0; i < 3; i++) {
    const fcGuid = deterministicGuid(`footercell:${entityLogical}:${form.schemaName}:${i}`);
    lines.push(`                    <cell id="{${fcGuid}}" showlabel="false">`);
    lines.push(`                      <labels>`);
    lines.push(`                        <label description="" languagecode="${LANG}" />`);
    lines.push(`                      </labels>`);
    lines.push(`                    </cell>`);
  }
  lines.push(`                  </row>`);
  lines.push(`                </rows>`);
  lines.push(`              </footer>`);

  lines.push(`            </form>`);
  lines.push(`            <IsCustomizable>1</IsCustomizable>`);
  lines.push(`            <CanBeDeleted>1</CanBeDeleted>`);
  lines.push(`            <LocalizedNames>`);
  lines.push(`              <LocalizedName description="${esc(form.displayName)}" languagecode="${LANG}" />`);
  lines.push(`            </LocalizedNames>`);
  if (form.description) {
    lines.push(`            <Descriptions>`);
    lines.push(`              <Description description="${esc(form.description)}" languagecode="${LANG}" />`);
    lines.push(`            </Descriptions>`);
  }
  lines.push(`          </systemform>`);

  return lines.join("\n");
}

/** Generate a quick create form systemform XML. */
function generateQuickCreateFormXml(
  form: FormDef,
  entityLogical: string,
  tables: TableDef[],
): string {
  const formGuid = deterministicGuid(`form:${entityLogical}:${form.schemaName}`);
  const tabGuid = deterministicGuid(`tab:${entityLogical}:${form.schemaName}:quicktab`);
  const lines: string[] = [];

  lines.push(`          <systemform>`);
  lines.push(`            <formid>{${formGuid}}</formid>`);
  lines.push(`            <IntroducedVersion>${SOLUTION_VERSION}</IntroducedVersion>`);
  lines.push(`            <FormPresentation>1</FormPresentation>`);
  lines.push(`            <FormActivationState>1</FormActivationState>`);
  lines.push(`            <form>`);
  lines.push(`              <tabs>`);
  lines.push(`                <tab verticallayout="true" id="{${tabGuid}}" IsUserDefined="1">`);
  lines.push(`                  <labels>`);
  lines.push(`                    <label description="" languagecode="${LANG}" />`);
  lines.push(`                  </labels>`);
  lines.push(`                  <columns>`);
  lines.push(`                    <column width="100%">`);
  lines.push(`                      <sections>`);

  const sections = form.layout.sections ?? [];
  for (const section of sections) {
    lines.push(generateSectionXml(section, entityLogical, form.schemaName, tables));
  }

  lines.push(`                      </sections>`);
  lines.push(`                    </column>`);
  lines.push(`                  </columns>`);
  lines.push(`                </tab>`);
  lines.push(`              </tabs>`);
  lines.push(`            </form>`);
  lines.push(`            <IsCustomizable>1</IsCustomizable>`);
  lines.push(`            <CanBeDeleted>1</CanBeDeleted>`);
  lines.push(`            <LocalizedNames>`);
  lines.push(`              <LocalizedName description="${esc(form.displayName)}" languagecode="${LANG}" />`);
  lines.push(`            </LocalizedNames>`);
  if (form.description) {
    lines.push(`            <Descriptions>`);
    lines.push(`              <Description description="${esc(form.description)}" languagecode="${LANG}" />`);
    lines.push(`            </Descriptions>`);
  }
  lines.push(`          </systemform>`);

  return lines.join("\n");
}

/** Generate a form section XML with fields and subgrids, arranged in rows based on column count. */
function generateSectionXml(
  section: FormSection,
  entityLogical: string,
  formSchemaName: string,
  tables: TableDef[],
): string {
  const sectionGuid = deterministicGuid(`section:${entityLogical}:${formSchemaName}:${section.name}`);
  // Dataverse Unified Interface requires sections columns="1" — multi-column layout
  // is done at the tab level. We emit one field per row.
  const lines: string[] = [];

  lines.push(`                        <section showlabel="true" showbar="false" IsUserDefined="0" id="{${sectionGuid}}" columns="1">`);
  lines.push(`                          <labels>`);
  lines.push(`                            <label description="${esc(section.label)}" languagecode="${LANG}" />`);
  lines.push(`                          </labels>`);
  lines.push(`                          <rows>`);

  // Emit field cells — one field per row (columns="1" constraint)
  const fields = section.fields || [];
  for (const field of fields) {
    lines.push(`                            <row>`);
    lines.push(generateFieldCellXml(field, entityLogical, formSchemaName, tables));
    lines.push(`                            </row>`);
  }

  // Subgrids
  const subgrids = section.subgrids || [];
  for (const sg of subgrids) {
    lines.push(`                            <row>`);
    lines.push(generateSubgridCellXml(sg, entityLogical, formSchemaName, tables));
    lines.push(`                            </row>`);
  }

  lines.push(`                          </rows>`);
  lines.push(`                        </section>`);
  return lines.join("\n");
}

/** Generate a standard field cell XML. */
function generateFieldCellXml(
  field: FormField,
  entityLogical: string,
  formSchemaName: string,
  tables: TableDef[],
): string {
  const cellGuid = deterministicGuid(`cell:${entityLogical}:${formSchemaName}:${field.name}`);
  const classId = getControlClassId(field.name, tables, entityLogical);
  const disabled = field.isReadOnly ? "true" : "false";
  const fieldLogical = ln(field.name);

  // Resolve display label — prefer explicit label, otherwise look up from table
  let label = field.label ?? "";
  if (!label) {
    const table = tables.find((t) => ln(t.schemaName) === entityLogical);
    const col = table?.columns.find((c) => ln(c.schemaName) === fieldLogical);
    label = col?.displayName ?? field.name;
  }

  const lines: string[] = [];
  lines.push(`                              <cell id="{${cellGuid}}" showlabel="true">`);
  lines.push(`                                <labels>`);
  lines.push(`                                  <label description="${esc(label)}" languagecode="${LANG}" />`);
  lines.push(`                                </labels>`);
  lines.push(`                                <control id="${fieldLogical}" classid="${classId}" datafieldname="${fieldLogical}" disabled="${disabled}" />`);
  lines.push(`                              </cell>`);
  return lines.join("\n");
}

/**
 * Resolve a subgrid relationship name from spec format (seo_Parent_Child) to
 * the actual generated relationship name (seo_ChildTable_fkColumn).
 */
function resolveRelationshipName(
  specRelName: string,
  parentEntityLogical: string,
  childEntityLogical: string,
  allTables: TableDef[],
): string {
  const childTable = allTables.find((t) => ln(t.schemaName) === childEntityLogical);
  if (!childTable) return specRelName;

  // Find Lookup columns on the child table that target the parent table
  const lookupCols = childTable.columns.filter(
    (c) => c.type === "Lookup" && c.target && ln(c.target) === parentEntityLogical,
  );

  if (lookupCols.length === 1) {
    // Unambiguous: seo_{ChildSchemaName}_{fkSchemaName}
    const relName = `seo_${childTable.schemaName.replace("seo_", "")}_${lookupCols[0].schemaName.replace("seo_", "")}`;
    return relName;
  }

  // Multiple lookups to same parent — try to match by FK name convention
  // The spec typically uses seo_Parent_Child, so the FK would be seo_{parentName}Id
  const expectedFk = `seo_${parentEntityLogical.replace("seo_", "")}id`;
  const match = lookupCols.find((c) => ln(c.schemaName) === expectedFk);
  if (match) {
    return `seo_${childTable.schemaName.replace("seo_", "")}_${match.schemaName.replace("seo_", "")}`;
  }

  // Fallback: return spec name as-is
  return specRelName;
}

/** Generate a subgrid cell XML. */
function generateSubgridCellXml(
  sg: SubgridDef,
  entityLogical: string,
  formSchemaName: string,
  allTables: TableDef[],
): string {
  const cellGuid = deterministicGuid(`subgrid:${entityLogical}:${formSchemaName}:${sg.name}`);
  const targetEntity = ln(sg.entity);
  const rowSpan = Math.max(Math.ceil(sg.maxRows / 2), 2);

  // Resolve the relationship name from spec format to actual generated name
  const relName = resolveRelationshipName(sg.relationship, entityLogical, targetEntity, allTables);
  if (relName !== sg.relationship) {
    console.log(`  RESOLVE REL: ${sg.relationship} → ${relName}`);
  }

  const lines: string[] = [];
  lines.push(`                              <cell id="{${cellGuid}}" rowspan="${rowSpan}" colspan="1" auto="false">`);
  lines.push(`                                <labels>`);
  lines.push(`                                  <label description="${esc(sg.label)}" languagecode="${LANG}" />`);
  lines.push(`                                </labels>`);
  lines.push(`                                <control indicationOfSubgrid="true" id="${sg.name}" classid="${CLASSID_SUBGRID}">`);
  lines.push(`                                  <parameters>`);
  lines.push(`                                    <RecordsPerPage>${sg.maxRows}</RecordsPerPage>`);
  lines.push(`                                    <AutoExpand>Fixed</AutoExpand>`);
  lines.push(`                                    <EnableQuickFind>false</EnableQuickFind>`);
  lines.push(`                                    <EnableViewPicker>true</EnableViewPicker>`);
  lines.push(`                                    <RelationshipName>${relName}</RelationshipName>`);
  lines.push(`                                    <TargetEntityType>${targetEntity}</TargetEntityType>`);
  lines.push(`                                  </parameters>`);
  lines.push(`                                </control>`);
  lines.push(`                              </cell>`);
  return lines.join("\n");
}

// ── customizations.xml — full entity ─────────────────────────────────────

function generateEntityXml(
  table: TableDef,
  globalChoicesMap: Map<string, GlobalChoice>,
  views: ViewDef[] | undefined,
  forms: FormDef[] | undefined,
  choiceMap: ChoiceValueMap,
  allTables: TableDef[],
): string {
  const entityLogical = ln(table.schemaName);
  const primaryCol = table.columns.find((c) => c.schemaName === table.primaryColumn);
  if (!primaryCol) {
    throw new Error(`Primary column ${table.primaryColumn} not found in ${table.schemaName}`);
  }

  // Resolve the effective primary column logical name (handle PK collision)
  const primaryPhysName = ln(primaryCol.schemaName);
  const autoGeneratedPkName = `${entityLogical}id`;
  const primaryColumnLogical = primaryPhysName === autoGeneratedPkName
    ? `${entityLogical}_name`
    : primaryPhysName;

  // Build attribute XML: primary first, then remaining
  const attrParts: string[] = [];
  const primaryXml = generateAttributeXml(primaryCol, table, true, globalChoicesMap);
  if (primaryXml) attrParts.push(primaryXml);

  for (const col of table.columns) {
    if (col.schemaName === table.primaryColumn) continue;
    const xml = generateAttributeXml(col, table, false, globalChoicesMap);
    if (xml) attrParts.push(xml);
  }

  const ownershipMask = table.ownership === "User" ? "UserOwned" : "OrgOwned";
  const isAudit = table.auditEnabled ? "1" : "0";

  // EntitySetName: entity logical name + "s" (matching Dataverse convention, e.g., seo_jurisdictions)
  const entitySetNameFinal = `${entityLogical}s`;

  const hasQuickCreate = forms?.some((f) => f.formType === "QuickCreate") ?? false;

  const lines: string[] = [];
  lines.push(`    <Entity>`);
  // Name element: text content = logical name (critical for import!)
  lines.push(`      <Name LocalizedName="${esc(table.displayName)}" OriginalName="${esc(table.displayName)}">${entityLogical}</Name>`);
  lines.push(`      <EntityInfo>`);
  lines.push(`        <entity Name="${entityLogical}">`);
  lines.push(`          <LocalizedNames>`);
  lines.push(`            <LocalizedName description="${esc(table.displayName)}" languagecode="${LANG}" />`);
  lines.push(`          </LocalizedNames>`);
  lines.push(`          <LocalizedCollectionNames>`);
  lines.push(`            <LocalizedCollectionName description="${esc(table.pluralName)}" languagecode="${LANG}" />`);
  lines.push(`          </LocalizedCollectionNames>`);
  lines.push(`          <Descriptions>`);
  lines.push(`            <Description description="${esc(table.description)}" languagecode="${LANG}" />`);
  lines.push(`          </Descriptions>`);
  lines.push(`          <attributes>`);
  lines.push(attrParts.join("\n"));
  lines.push(`          </attributes>`);
  // EntitySetName for Web API routing
  lines.push(`          <EntitySetName>${entitySetNameFinal}</EntitySetName>`);
  // Entity flags — matching reference solution format
  lines.push(`          <IsDuplicateCheckSupported>0</IsDuplicateCheckSupported>`);
  lines.push(`          <IsBusinessProcessEnabled>0</IsBusinessProcessEnabled>`);
  lines.push(`          <IsRequiredOffline>0</IsRequiredOffline>`);
  lines.push(`          <IsInteractionCentricEnabled>0</IsInteractionCentricEnabled>`);
  lines.push(`          <IsCollaboration>0</IsCollaboration>`);
  lines.push(`          <AutoRouteToOwnerQueue>0</AutoRouteToOwnerQueue>`);
  lines.push(`          <IsConnectionsEnabled>0</IsConnectionsEnabled>`);
  lines.push(`          <EntityColor></EntityColor>`);
  lines.push(`          <IsDocumentManagementEnabled>0</IsDocumentManagementEnabled>`);
  lines.push(`          <AutoCreateAccessTeams>0</AutoCreateAccessTeams>`);
  lines.push(`          <IsOneNoteIntegrationEnabled>0</IsOneNoteIntegrationEnabled>`);
  lines.push(`          <IsKnowledgeManagementEnabled>0</IsKnowledgeManagementEnabled>`);
  lines.push(`          <IsSLAEnabled>0</IsSLAEnabled>`);
  lines.push(`          <IsDocumentRecommendationsEnabled>0</IsDocumentRecommendationsEnabled>`);
  lines.push(`          <IsBPFEntity>0</IsBPFEntity>`);
  lines.push(`          <OwnershipTypeMask>${ownershipMask}</OwnershipTypeMask>`);
  lines.push(`          <IsAuditEnabled>${isAudit}</IsAuditEnabled>`);
  lines.push(`          <IsRetrieveAuditEnabled>0</IsRetrieveAuditEnabled>`);
  lines.push(`          <IsRetrieveMultipleAuditEnabled>0</IsRetrieveMultipleAuditEnabled>`);
  lines.push(`          <IsActivity>0</IsActivity>`);
  lines.push(`          <ActivityTypeMask></ActivityTypeMask>`);
  lines.push(`          <IsActivityParty>0</IsActivityParty>`);
  lines.push(`          <IsReplicated>0</IsReplicated>`);
  lines.push(`          <IsReplicationUserFiltered>0</IsReplicationUserFiltered>`);
  lines.push(`          <IsMailMergeEnabled>0</IsMailMergeEnabled>`);
  lines.push(`          <IsVisibleInMobile>1</IsVisibleInMobile>`);
  lines.push(`          <IsVisibleInMobileClient>1</IsVisibleInMobileClient>`);
  lines.push(`          <IsReadOnlyInMobileClient>0</IsReadOnlyInMobileClient>`);
  lines.push(`          <IsOfflineInMobileClient>0</IsOfflineInMobileClient>`);
  lines.push(`          <DaysSinceRecordLastModified>0</DaysSinceRecordLastModified>`);
  lines.push(`          <MobileOfflineFilters></MobileOfflineFilters>`);
  lines.push(`          <IsMapiGridEnabled>0</IsMapiGridEnabled>`);
  lines.push(`          <IsReadingPaneEnabled>0</IsReadingPaneEnabled>`);
  lines.push(`          <IsQuickCreateEnabled>${hasQuickCreate ? "1" : "0"}</IsQuickCreateEnabled>`);
  lines.push(`          <SyncToExternalSearchIndex>0</SyncToExternalSearchIndex>`);
  lines.push(`          <IntroducedVersion>${SOLUTION_VERSION}</IntroducedVersion>`);
  lines.push(`          <IsCustomizable>1</IsCustomizable>`);
  lines.push(`          <IsRenameable>1</IsRenameable>`);
  lines.push(`          <IsMappable>1</IsMappable>`);
  lines.push(`          <CanModifyAuditSettings>1</CanModifyAuditSettings>`);
  lines.push(`          <CanModifyMobileVisibility>1</CanModifyMobileVisibility>`);
  lines.push(`          <CanModifyMobileClientVisibility>1</CanModifyMobileClientVisibility>`);
  lines.push(`          <CanModifyMobileClientReadOnly>1</CanModifyMobileClientReadOnly>`);
  lines.push(`          <CanModifyMobileClientOffline>1</CanModifyMobileClientOffline>`);
  lines.push(`          <CanModifyConnectionSettings>1</CanModifyConnectionSettings>`);
  lines.push(`          <CanModifyDuplicateDetectionSettings>1</CanModifyDuplicateDetectionSettings>`);
  lines.push(`          <CanModifyMailMergeSettings>1</CanModifyMailMergeSettings>`);
  lines.push(`          <CanModifyQueueSettings>1</CanModifyQueueSettings>`);
  lines.push(`          <CanCreateAttributes>1</CanCreateAttributes>`);
  lines.push(`          <CanCreateForms>1</CanCreateForms>`);
  lines.push(`          <CanCreateCharts>1</CanCreateCharts>`);
  lines.push(`          <CanCreateViews>1</CanCreateViews>`);
  lines.push(`          <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>`);
  lines.push(`          <CanEnableSyncToExternalSearchIndex>1</CanEnableSyncToExternalSearchIndex>`);
  lines.push(`          <EnforceStateTransitions>0</EnforceStateTransitions>`);
  lines.push(`          <CanChangeHierarchicalRelationship>1</CanChangeHierarchicalRelationship>`);
  lines.push(`          <EntityHelpUrlEnabled>0</EntityHelpUrlEnabled>`);
  lines.push(`          <ChangeTrackingEnabled>0</ChangeTrackingEnabled>`);
  lines.push(`          <CanChangeTrackingBeEnabled>1</CanChangeTrackingBeEnabled>`);
  lines.push(`          <IsEnabledForExternalChannels>0</IsEnabledForExternalChannels>`);
  lines.push(`          <IsSolutionAware>0</IsSolutionAware>`);
  lines.push(`          <HasRelatedNotes>True</HasRelatedNotes>`);
  lines.push(`        </entity>`);
  lines.push(`      </EntityInfo>`);

  // FormXml — between EntityInfo and SavedQueries (matching reference order)
  if (forms && forms.length > 0) {
    lines.push(generateFormXmlBlock(entityLogical, forms, allTables));
  }

  // SavedQueries (custom views)
  if (views && views.length > 0) {
    lines.push(generateSavedQueriesXml(entityLogical, primaryColumnLogical, views, choiceMap, allTables));
  }

  lines.push(`    </Entity>`);

  return lines.join("\n");
}

// ── customizations.xml — global option sets ──────────────────────────────

function generateGlobalOptionSetsXml(globalChoices: GlobalChoice[]): string {
  const lines: string[] = [];

  for (const choice of globalChoices) {
    lines.push(`    <optionset Name="${esc(choice.schemaName)}" localizedName="${esc(choice.displayName)}">`);
    lines.push(`      <OptionSetType>picklist</OptionSetType>`);
    lines.push(`      <IsGlobal>1</IsGlobal>`);
    lines.push(`      <IntroducedVersion>${SOLUTION_VERSION}</IntroducedVersion>`);
    lines.push(`      <IsCustomOptionSet>1</IsCustomOptionSet>`);
    lines.push(`      <IsCustomizable>1</IsCustomizable>`);
    lines.push(`      <ExternalTypeName></ExternalTypeName>`);
    lines.push(`      <displaynames>`);
    lines.push(`        <displayname description="${esc(choice.displayName)}" languagecode="${LANG}" />`);
    lines.push(`      </displaynames>`);
    if (choice.description) {
      lines.push(`      <Descriptions>`);
      lines.push(`        <Description description="${esc(choice.description)}" languagecode="${LANG}" />`);
      lines.push(`      </Descriptions>`);
    }
    lines.push(`      <options>`);
    for (const opt of choice.options) {
      lines.push(`        <option value="${opt.value}" ExternalValue="" IsHidden="0">`);
      lines.push(`          <labels>`);
      lines.push(`            <label description="${esc(opt.label)}" languagecode="${LANG}" />`);
      lines.push(`          </labels>`);
      lines.push(`        </option>`);
    }
    lines.push(`      </options>`);
    lines.push(`    </optionset>`);
  }

  return lines.join("\n");
}

// ── customizations.xml — environment variables ───────────────────────────

function generateEnvVarDefinitionsXml(envVars: EnvVarDef[]): string {
  const typeMap: Record<string, number> = {
    String: 100000000,
    Decimal: 100000001,
    Boolean: 100000002,
    JSON: 100000003,
  };

  const lines: string[] = [];

  for (const ev of envVars) {
    const dvType = typeMap[ev.type] ?? 100000000;
    lines.push(`    <environmentvariabledefinition schemaName="${esc(ev.schemaName)}">`);
    lines.push(`      <displayname languagecode="${LANG}" description="${esc(ev.displayName)}" />`);
    lines.push(`      <description languagecode="${LANG}" description="${esc(ev.description)}" />`);
    lines.push(`      <type>${dvType}</type>`);
    lines.push(`      <IsCustomizable>1</IsCustomizable>`);
    lines.push(`      <IsRequired>0</IsRequired>`);
    lines.push(`      <IntroducedVersion>${SOLUTION_VERSION}</IntroducedVersion>`);
    if (ev.defaultValue) {
      lines.push(`      <defaultvalue>${esc(ev.defaultValue)}</defaultvalue>`);
    }
    lines.push(`    </environmentvariabledefinition>`);
  }

  return lines.join("\n");
}

// ── customizations.xml — full document ───────────────────────────────────

function generateCustomizationsXml(
  tables: TableDef[],
  globalChoices: GlobalChoice[],
  envVars: EnvVarDef[],
  views: Map<string, ViewDef[]>,
  forms: Map<string, FormDef[]>,
): string {
  // Build globalChoicesMap for inline option set expansion
  const globalChoicesMap = new Map<string, GlobalChoice>();
  for (const gc of globalChoices) {
    globalChoicesMap.set(gc.schemaName, gc);
  }

  // Build choice value map for resolving filter labels to numeric values
  const choiceMap = buildChoiceValueMap(tables, globalChoices);

  const entitiesXml = tables
    .map((t) => {
      const entityViews = views.get(t.schemaName);
      const entityForms = forms.get(t.schemaName);
      return generateEntityXml(t, globalChoicesMap, entityViews, entityForms, choiceMap, tables);
    })
    .join("\n");
  const relationshipsXml = generateAllRelationshipsXml(tables);
  const envVarDefsXml = generateEnvVarDefinitionsXml(envVars);

  return [
    XML_HEADER,
    `<ImportExportXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`,
    `  <optionsets />`,
    `  <Entities>`,
    entitiesXml,
    `  </Entities>`,
    `  <Roles></Roles>`,
    `  <Workflows></Workflows>`,
    `  <FieldSecurityProfiles></FieldSecurityProfiles>`,
    `  <Templates />`,
    `  <EntityMaps />`,
    relationshipsXml
      ? [`  <EntityRelationships>`, relationshipsXml, `  </EntityRelationships>`].join("\n")
      : `  <EntityRelationships />`,
    `  <OrganizationSettings />`,
    `  <CustomControls />`,
    `  <EntityDataProviders />`,
    // TODO: Re-enable when env var format is validated
    // `  <environmentvariabledefinitions>`,
    // envVarDefsXml,
    // `  </environmentvariabledefinitions>`,
    // `  <environmentvariablevalues />`,
    `  <Languages>`,
    `    <Language>${LANG}</Language>`,
    `  </Languages>`,
    `</ImportExportXml>`,
  ].join("\n");
}

// ── Solution Checker ─────────────────────────────────────────────────────

function runSolutionCheck(zipPath: string, projectRoot: string): boolean {
  const outputDir = path.join(projectRoot, ".solution-checker-results");
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const zipPathWin = zipPath.replace(/\//g, "\\");
  const outputDirWin = outputDir.replace(/\//g, "\\");

  console.log("\nRunning pac solution check ...");
  console.log(`  geo: ${PAC_GEO}`);
  console.log(`  output: ${outputDir}`);

  try {
    execSync(
      `"${PAC_CLI}" solution check --path "${zipPathWin}" --geo ${PAC_GEO} --outputDirectory "${outputDirWin}"`,
      { stdio: "inherit", timeout: 300_000 },
    );
    console.log("\nSolution check completed.");
  } catch (err) {
    const exitCode = (err as { status?: number }).status;
    if (exitCode) {
      console.warn(`\nSolution check exited with code ${exitCode}.`);
    } else {
      console.warn(`\nSolution check failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Report results if any sarif/json files were written
  const resultFiles = fs.existsSync(outputDir)
    ? fs.readdirSync(outputDir).filter((f) => f.endsWith(".sarif") || f.endsWith(".json"))
    : [];

  if (resultFiles.length === 0) {
    console.log("  No result files generated.");
    return true;
  }

  let totalIssues = 0;
  let criticalOrHigh = 0;

  for (const rf of resultFiles) {
    console.log(`  Results file: ${rf}`);
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(outputDir, rf), "utf-8"));
      // SARIF format: runs[].results[]
      const runs = raw.runs ?? [];
      for (const run of runs) {
        const results = run.results ?? [];
        totalIssues += results.length;
        for (const r of results) {
          const level: string = r.level ?? "";
          if (level === "error" || level === "warning") {
            criticalOrHigh++;
          }
          const ruleId: string = r.ruleId ?? "unknown";
          const msg: string = r.message?.text ?? "";
          const loc: string =
            r.locations?.[0]?.physicalLocation?.artifactLocation?.uri ?? "";
          console.log(`    [${level.toUpperCase()}] ${ruleId}: ${msg}${loc ? ` (${loc})` : ""}`);
        }
      }
    } catch {
      console.log(`    (Could not parse ${rf} as SARIF)`);
    }
  }

  console.log(`\n  Total issues: ${totalIssues} (critical/high: ${criticalOrHigh})`);
  return criticalOrHigh === 0;
}

// ── Main ─────────────────────────────────────────────────────────────────

function main(): void {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, "..");

  console.log(`Reading specs from ${projectRoot} ...`);
  const specs = readSpecs(projectRoot);

  console.log(`  ${specs.tables.length} tables`);
  console.log(`  ${specs.globalChoices.length} global option sets`);
  console.log(`  ${specs.envVars.length} environment variables`);

  // Count relationships & columns
  let relCount = 0;
  let colCount = 0;
  let skippedSystemUser = 0;
  for (const t of specs.tables) {
    for (const c of t.columns) {
      if (c.type === "Lookup") {
        if (ln(c.target ?? "") === "systemuser") {
          skippedSystemUser++;
        } else {
          relCount++;
        }
      }
      if (c.type !== "Calculated") colCount++;
    }
  }
  console.log(`  ${colCount} columns`);
  console.log(`  ${relCount} relationships (${skippedSystemUser} systemuser lookups skipped)`);

  // Count views and forms
  let viewCount = 0;
  let formCount = 0;
  for (const views of specs.views.values()) viewCount += views.length;
  for (const forms of specs.forms.values()) formCount += forms.length;
  console.log(`  ${viewCount} custom views (${specs.views.size} entities)`);
  console.log(`  ${formCount} custom forms (${specs.forms.size} entities)`);

  // ── Generate XML ──
  console.log("\nGenerating XML ...");
  const contentTypesXml = generateContentTypes();
  const solutionXml = generateSolutionXml(specs.tables, specs.globalChoices, specs.envVars);
  const customizationsXml = generateCustomizationsXml(
    specs.tables,
    specs.globalChoices,
    specs.envVars,
    specs.views,
    specs.forms,
  );

  // ── Write to temp build directory ──
  const buildDir = path.join(projectRoot, ".solution-build");
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
  }
  fs.mkdirSync(buildDir, { recursive: true });

  fs.writeFileSync(path.join(buildDir, "[Content_Types].xml"), contentTypesXml, "utf-8");
  fs.writeFileSync(path.join(buildDir, "solution.xml"), solutionXml, "utf-8");
  fs.writeFileSync(path.join(buildDir, "customizations.xml"), customizationsXml, "utf-8");

  console.log("  [Content_Types].xml");
  console.log("  solution.xml");
  console.log("  customizations.xml");

  // ── Create zip via PowerShell ──
  const zipPath = path.join(projectRoot, `${SOLUTION_UNIQUE_NAME}.zip`);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  console.log(`\nCreating ${SOLUTION_UNIQUE_NAME}.zip ...`);

  // Use forward slashes — .NET handles them on Windows and avoids bash escape issues
  const buildDirFS = buildDir.replace(/\\/g, "/");
  const zipPathFS = zipPath.replace(/\\/g, "/");

  execFileSync("powershell.exe", [
    "-NoProfile",
    "-Command",
    `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${buildDirFS}', '${zipPathFS}')`,
  ], { stdio: "inherit" });

  // Cleanup build dir
  fs.rmSync(buildDir, { recursive: true });

  console.log(`\nSolution zip: ${zipPath}`);

  // ── Run pac solution check ──
  const skipCheck = process.argv.includes("--skip-check");
  let checkPassed = true;
  if (skipCheck) {
    console.log("\nSkipping solution check (--skip-check flag).");
  } else {
    checkPassed = runSolutionCheck(zipPath, projectRoot);
  }

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`);
  if (checkPassed) {
    console.log(`SUCCESS: ${SOLUTION_UNIQUE_NAME}.zip is ready for import.`);
  } else {
    console.log(`WARNING: Solution check reported critical/high issues.`);
    console.log(`  Review .solution-checker-results/ before importing.`);
  }
  console.log(`${"=".repeat(60)}`);
  console.log(`\nContents: ${specs.tables.length} tables, ${colCount} columns, ${relCount} relationships, ${viewCount} views, ${formCount} forms`);
  console.log(`\nNext steps:`);
  console.log(`  1. Open make.powerapps.com -> Solutions -> Import`);
  console.log(`  2. Upload ${SOLUTION_UNIQUE_NAME}.zip`);
  console.log(`  3. Post-import: configure calculated fields (seo_responseTimeMinutes, seo_totalDurationMinutes)`);
  console.log(`  4. Post-import: configure business rules (MCI visual alert, lock closed incident, etc.)`);
  console.log(`  5. Verify auto-number formats are active (CALL-, INC-, PT- prefixes)`);
  console.log(`  6. Set environment variable values per environment`);
  console.log(`  7. Create security roles per spec`);

  if (!checkPassed) {
    process.exitCode = 1;
  }
}

main();
