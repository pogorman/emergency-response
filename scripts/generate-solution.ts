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
import { execFileSync, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readSpecs } from "./lib/spec-reader.js";
import type { TableDef, ColumnDef, GlobalChoice, EnvVarDef } from "./lib/spec-reader.js";

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

// ── customizations.xml — full entity ─────────────────────────────────────

function generateEntityXml(table: TableDef, globalChoicesMap: Map<string, GlobalChoice>): string {
  const entityLogical = ln(table.schemaName);
  const primaryCol = table.columns.find((c) => c.schemaName === table.primaryColumn);
  if (!primaryCol) {
    throw new Error(`Primary column ${table.primaryColumn} not found in ${table.schemaName}`);
  }

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
  lines.push(`          <IsQuickCreateEnabled>0</IsQuickCreateEnabled>`);
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
): string {
  // Build globalChoicesMap for inline option set expansion
  const globalChoicesMap = new Map<string, GlobalChoice>();
  for (const gc of globalChoices) {
    globalChoicesMap.set(gc.schemaName, gc);
  }

  const entitiesXml = tables.map((t) => generateEntityXml(t, globalChoicesMap)).join("\n");
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

  // ── Generate XML ──
  console.log("\nGenerating XML ...");
  const contentTypesXml = generateContentTypes();
  const solutionXml = generateSolutionXml(specs.tables, specs.globalChoices, specs.envVars);
  const customizationsXml = generateCustomizationsXml(
    specs.tables,
    specs.globalChoices,
    specs.envVars,
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
  console.log(`\nNext steps:`);
  console.log(`  1. Open make.powerapps.com -> Solutions -> Import`);
  console.log(`  2. Upload ${SOLUTION_UNIQUE_NAME}.zip`);
  console.log(`  3. Post-import: configure calculated fields (seo_responseTimeMinutes, seo_totalDurationMinutes)`);
  console.log(`  4. Verify auto-number formats are active (CALL-, INC-, PT- prefixes)`);
  console.log(`  5. Set environment variable values per environment`);
  console.log(`  6. Create security roles per spec`);

  if (!checkPassed) {
    process.exitCode = 1;
  }
}

main();
