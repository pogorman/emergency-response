# Dataverse Solution XML Guide — Lessons Learned

This document captures every issue encountered while generating and importing a Dataverse unmanaged solution `.zip` via `pac solution import` to a GCC (Government Community Cloud) tenant. These lessons apply to any Dataverse solution generation project.

## Solution .zip Structure

A valid Dataverse unmanaged solution zip contains at minimum:

```
SolutionName.zip
├── [Content_Types].xml          # OPC content types
├── solution.xml                 # Publisher + manifest + root components
└── customizations.xml           # Entities, attributes, option sets, relationships
```

## Issue 1: `<Name>` Element Must Contain Logical Name as Text

**Error:** `Expected non-empty string`

**Root Cause:** The `<Name>` element inside `<Entity>` must contain the entity's logical name as **text content**, not child elements.

```xml
<!-- WRONG — causes "Expected non-empty string" -->
<Name LocalizedName="Jurisdiction" OriginalName="Jurisdiction">
  <LocLabels>
    <LocLabel languagecode="1033">
      <Labels>
        <Label description="Jurisdiction" languagecode="1033" />
      </Labels>
    </LocLabel>
  </LocLabels>
</Name>

<!-- CORRECT -->
<Name LocalizedName="Jurisdiction" OriginalName="Jurisdiction">seo_jurisdiction</Name>
```

## Issue 2: `<ObjectTypeCode>` Must Be Omitted for New Entities

**Error:** `Expected non-empty string` or XSD validation failure

**Root Cause:** `ObjectTypeCode` is `xs:positiveInteger` in the XSD. A value of `0` is invalid. For new custom entities, Dataverse auto-assigns the code at import time.

```xml
<!-- WRONG -->
<ObjectTypeCode>0</ObjectTypeCode>

<!-- CORRECT — omit entirely for new entities -->
<!-- (no ObjectTypeCode element) -->
```

## Issue 3: Each Attribute Needs a `<Name>` Child Element

**Error:** `Expected non-empty string`

**Root Cause:** Every `<attribute>` element must include a `<Name>` child containing the logical name (lowercase).

```xml
<!-- WRONG — missing <Name> child -->
<attribute PhysicalName="seo_name">
  <Type>nvarchar</Type>
  <LogicalName>seo_name</LogicalName>
  ...
</attribute>

<!-- CORRECT -->
<attribute PhysicalName="seo_name">
  <Type>nvarchar</Type>
  <Name>seo_name</Name>
  <LogicalName>seo_name</LogicalName>
  ...
</attribute>
```

## Issue 4: `<OwnershipTypeMask>` Uses Abbreviated Values

**Error:** `Expected non-empty string` or import failure

**Root Cause:** The XML uses `OrgOwned` (not `OrganizationOwned`) and `UserOwned`.

```xml
<!-- WRONG -->
<OwnershipTypeMask>OrganizationOwned</OwnershipTypeMask>

<!-- CORRECT -->
<OwnershipTypeMask>OrgOwned</OwnershipTypeMask>
<!-- or -->
<OwnershipTypeMask>UserOwned</OwnershipTypeMask>
```

## Issue 5: `<LocalizedCollectionName>` Not `<LocalizedName>` for Plural Names

```xml
<!-- WRONG -->
<LocalizedCollectionNames>
  <LocalizedName description="Jurisdictions" languagecode="1033" />
</LocalizedCollectionNames>

<!-- CORRECT -->
<LocalizedCollectionNames>
  <LocalizedCollectionName description="Jurisdictions" languagecode="1033" />
</LocalizedCollectionNames>
```

## Issue 6: `<EntitySetName>` Is Required

Every entity must include `<EntitySetName>` after `<attributes>`. The value is the entity logical name + "s" (e.g., `seo_jurisdictions`).

```xml
<EntitySetName>seo_jurisdictions</EntitySetName>
```

## Issue 7: `<HasNotes>` / `<HasActivities>` Are Wrong Element Names

```xml
<!-- WRONG (these element names don't exist in the schema) -->
<HasNotes>1</HasNotes>
<HasActivities>0</HasActivities>

<!-- CORRECT -->
<HasRelatedNotes>True</HasRelatedNotes>
<!-- HasRelatedActivities omitted or set separately -->
```

## Issue 8: Format Values Must Be Lowercase

```xml
<!-- WRONG -->
<Format>Text</Format>
<Format>DateAndTime</Format>

<!-- CORRECT -->
<Format>text</Format>
<Format>datetime</Format>
<Format>date</Format>
<Format>none</Format>  <!-- for integers -->
```

## Issue 9: Many Entity and Attribute Properties Are Required

An entity definition that works must include **far more** properties than the basic ones. See the full list in the `generateEntityXml` function. Key required entity properties:

- `EntitySetName`, `IsDuplicateCheckSupported`, `IsBusinessProcessEnabled`, `IsRequiredOffline`
- `OwnershipTypeMask`, `IsAuditEnabled`, `IsActivity`, `ActivityTypeMask`
- `IsCustomizable`, `IsRenameable`, `IsMappable`, `IntroducedVersion`
- `CanModifyAuditSettings`, `CanCreateAttributes`, `CanCreateForms`, `CanCreateViews`
- Many more `CanModify*` and `Is*` flags

Key required attribute properties:
- `Name`, `LogicalName`, `RequiredLevel`, `DisplayMask`, `ImeMode`
- `ValidForUpdateApi`, `ValidForReadApi`, `ValidForCreateApi`
- `IsCustomField`, `IsAuditEnabled`, `IsSecured`, `IntroducedVersion`
- `IsCustomizable`, `IsRenameable`, `SourceType`
- `IsGlobalFilterEnabled`, `IsSortableEnabled`, `IsSearchable`, `IsFilterable`, `IsRetrievable`
- Many more `CanModify*` flags

## Issue 10: customizations.xml Root Attributes Differ from solution.xml

```xml
<!-- solution.xml root — includes version, SolutionPackageVersion, etc. -->
<ImportExportXml version="9.2.24.4" SolutionPackageVersion="9.2"
  languagecode="1033" generatedBy="CrmLive"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

<!-- customizations.xml root — just xmlns:xsi -->
<ImportExportXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
```

## Issue 11: customizations.xml Requires Specific Sections

Even if empty, these sections should be present in customizations.xml:

```xml
<Roles></Roles>
<Workflows></Workflows>
<FieldSecurityProfiles></FieldSecurityProfiles>
<Templates />
<EntityMaps />
<EntityRelationships><!-- or empty --></EntityRelationships>
<OrganizationSettings />
<optionsets />
<CustomControls />
<EntityDataProviders />
<Languages><Language>1033</Language></Languages>
```

## Issue 12: Environment Variables Cause Generic "Unexpected Error"

**Error:** `An unexpected error occurred.` (no detail)

**Root Cause:** `<environmentvariabledefinitions>` and `<environmentvariablevalues>` sections inside customizations.xml caused a generic server-side error during import in GCC. The root component registration (type=380) in solution.xml also needs to be removed when env var definitions are not present.

**Resolution:** Omit environment variables from the initial solution import. Create them manually in the maker portal or via a separate deployment step post-import.

## Issue 13: Relationships Must Be in Root-Level `<EntityRelationships>`

**Error:** `The following attributes seo_incidentid, seo_authorid of entity seo_afteractionreport are missing their associated relationship definition in customizations xml`

**Root Cause:** Relationships were placed inside individual entity `<EntityRelationships>` blocks (inside `<entity>`). They must instead be in the **root-level `<EntityRelationships>`** section of customizations.xml.

```xml
<!-- WRONG — inside entity -->
<entity Name="seo_afteractionreport">
  <attributes>...</attributes>
  <EntityRelationships>
    <EntityRelationship Name="seo_AfterActionReport_incidentId">...</EntityRelationship>
  </EntityRelationships>
</entity>

<!-- CORRECT — at root level of customizations.xml -->
<EntityRelationships>
  <EntityRelationship Name="seo_AfterActionReport_incidentId">
    <EntityRelationshipType>OneToMany</EntityRelationshipType>
    <IsCustomizable>1</IsCustomizable>
    <IntroducedVersion>0.8.0.0</IntroducedVersion>
    <ReferencingEntityName>seo_afteractionreport</ReferencingEntityName>
    <ReferencedEntityName>seo_incident</ReferencedEntityName>
    <ReferencingAttributeName>seo_incidentid</ReferencingAttributeName>
    <CascadeAssign>NoCascade</CascadeAssign>
    <CascadeDelete>RemoveLink</CascadeDelete>
    <CascadeArchive>RemoveLink</CascadeArchive>
    <!-- ... other cascade settings ... -->
    <EntityRelationshipRoles>
      <EntityRelationshipRole>
        <NavPaneDisplayOption>UseCollectionName</NavPaneDisplayOption>
        <NavPaneArea>Details</NavPaneArea>
        <NavPaneOrder>10000</NavPaneOrder>
        <NavigationPropertyName>seo_incidentid</NavigationPropertyName>
        <RelationshipRoleType>1</RelationshipRoleType>
      </EntityRelationshipRole>
      <EntityRelationshipRole>
        <NavigationPropertyName>seo_AfterActionReport_incidentId</NavigationPropertyName>
        <RelationshipRoleType>0</RelationshipRoleType>
      </EntityRelationshipRole>
    </EntityRelationshipRoles>
  </EntityRelationship>
</EntityRelationships>
```

## Issue 14: Global Option Set Name Collision with Column Names

**Error:** `The schema name seo_apparatustype for type OptionSet is not unique. An seo_apparatustype with same name already exists.`

**Root Cause:** When a column's schema name (case-insensitive) matches a global option set's schema name, Dataverse tries to create the option set twice and fails. Example: column `seo_apparatusType` on entity `seo_Apparatus` references global option set `seo_ApparatusType`. Both resolve to `seo_apparatustype`.

**Resolution:** Define all option sets as **local inline option sets** within each column instead of referencing global option sets. The option set name follows the pattern `{entity}_{column}` to guarantee uniqueness.

```xml
<!-- WRONG — references global option set that collides with column name -->
<optionset Name="seo_ApparatusType">
  <IsGlobal>1</IsGlobal>
</optionset>

<!-- CORRECT — inline local option set with unique name -->
<optionset Name="seo_apparatus_seo_apparatustype">
  <IsGlobal>0</IsGlobal>
  <IntroducedVersion>0.8.0.0</IntroducedVersion>
  <IsCustomizable>1</IsCustomizable>
  <OptionSetType>picklist</OptionSetType>
  <ExternalTypeName></ExternalTypeName>
  <displaynames>
    <displayname description="Apparatus Type" languagecode="1033" />
  </displaynames>
  <options>
    <option value="100000000" ExternalValue="" IsHidden="0">
      <labels><label description="Engine" languagecode="1033" /></labels>
    </option>
    <!-- ... more options ... -->
  </options>
</optionset>
```

Also remove:
- Global option set definitions from `<optionsets>` section
- Type=9 root components from solution.xml

## Issue 15: Column Name Collision with Auto-Generated Primary Key

**Error:** `Column name 'seo_hydrantid' in table 'seo_hydrantBase' is specified more than once.`

**Root Cause:** Dataverse auto-creates a GUID primary key column named `{entitylogicalname}id` for every entity. If a custom column has the same logical name, there's a duplicate column error.

Example: Entity `seo_hydrant` → auto PK `seo_hydrantid`. Spec column `seo_hydrantId` (String, "Hydrant ID from GIS") → logical name `seo_hydrantid`. Collision!

**Resolution:** Detect and rename the column. In the generator: if a column's logical name equals `{entitylogical}id`, rename it to `{entitylogical}_name`.

## Issue 16: Publisher Address Fields Use Explicit Close Tags (Not Self-Closing)

The reference solution uses explicit close tags for nil elements in publisher addresses:

```xml
<!-- Preferred format (matches reference exports) -->
<City xsi:nil="true"></City>

<!-- Also works but not matching reference -->
<City xsi:nil="true" />
```

## Issue 17: Boolean Option Sets Need Full Structure

Boolean (`bit`) columns need a fully-specified option set with a unique name:

```xml
<optionset Name="seo_seo_incident_seo_ismci">
  <OptionSetType>bit</OptionSetType>
  <IntroducedVersion>0.8.0.0</IntroducedVersion>
  <IsCustomizable>1</IsCustomizable>
  <ExternalTypeName></ExternalTypeName>
  <displaynames>
    <displayname description="Is MCI" languagecode="1033" />
  </displaynames>
  <Descriptions>
    <Description description="" languagecode="1033" />
  </Descriptions>
  <options>
    <option value="1" ExternalValue="" IsHidden="0">
      <labels><label description="Yes" languagecode="1033" /></labels>
    </option>
    <option value="0" ExternalValue="" IsHidden="0">
      <labels><label description="No" languagecode="1033" /></labels>
    </option>
  </options>
</optionset>
```

## Issue 18: pac CLI Auth for GCC Requires `--cloud UsGov`

```bash
pac auth create --name "SEO-GCC-Dev" --cloud UsGov \
  --environment https://emergency-response.crm9.dynamics.com \
  --deviceCode
```

GCC Dataverse URLs use `.crm9.dynamics.com` (not `.crm.dynamics.com`).

## Issue 19: pac Solution Check Requires `--geo USGovernment` for GCC

```bash
pac solution check --path solution.zip --geo USGovernment
```

The checker endpoint for GCC is `https://gov.api.advisor.powerapps.us/`.

---

## Reference: Working XML Structure

Use an existing exported solution (from `pac solution export` or `make.powerapps.com`) as the authoritative reference for XML format. The O'G CaseManagement solution at `C:\Users\pogorman\Downloads\Archives\CaseManagement_1_0_7.zip` was used as the reference for this project.

## Reference: Generator Script

The generator is at `scripts/generate-solution.ts`. Run with:

```bash
cd scripts && npx tsx generate-solution.ts          # with solution check
cd scripts && npx tsx generate-solution.ts --skip-check  # without check
```

Output: `EmergencyResponseCoordination.zip` in the project root.

Import with:
```bash
pac solution import --path EmergencyResponseCoordination.zip --publish-changes --async
```
