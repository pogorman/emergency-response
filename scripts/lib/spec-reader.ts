import * as fs from "node:fs";
import * as path from "node:path";

// ── Types ──────────────────────────────────────────────────────────────

export interface ChoiceOption {
  value: number;
  label: string;
}

export interface GlobalChoice {
  schemaName: string;
  displayName: string;
  isGlobal: boolean;
  description?: string;
  options: ChoiceOption[];
}

export interface ColumnDef {
  schemaName: string;
  displayName: string;
  type: string;
  required?: boolean;
  audit?: boolean;
  description?: string;
  maxLength?: number;
  precision?: number;
  default?: unknown;
  format?: string;
  choiceName?: string;
  localOptions?: ChoiceOption[];
  target?: string;
  phi?: boolean;
}

export interface RelationshipDef {
  type: string;
  relatedTable: string;
  foreignKey?: string;
  description?: string;
}

export interface TableDef {
  schemaName: string;
  displayName: string;
  pluralName: string;
  description: string;
  primaryColumn: string;
  ownership: string;
  auditEnabled: boolean;
  columns: ColumnDef[];
  relationships: RelationshipDef[];
  calculatedFields?: ColumnDef[];
}

export interface EnvVarDef {
  schemaName: string;
  displayName: string;
  type: string;
  description: string;
  defaultValue: string;
}

export interface SampleDataFile {
  entity: string;
  description: string;
  records: Record<string, unknown>[];
}

// ── View types ────────────────────────────────────────────────────────

export interface ViewColumn {
  name: string;
  width: number;
}

export interface ViewFilterCondition {
  column: string;
  operator: string;
  value?: unknown;
  values?: unknown[];
}

export interface ViewFilter {
  type: "and" | "or";
  conditions: ViewFilterCondition[];
}

export interface ViewSortOrder {
  column: string;
  direction: "Ascending" | "Descending";
}

export interface ViewDef {
  schemaName: string;
  displayName: string;
  entity: string;
  description?: string;
  viewType: string;
  isDefault: boolean;
  columns: ViewColumn[];
  filter: ViewFilter | null;
  sortOrder: ViewSortOrder[];
}

// ── Form types ────────────────────────────────────────────────────────

export interface FormField {
  name: string;
  label?: string;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isPHI?: boolean;
}

export interface SubgridDef {
  name: string;
  label: string;
  entity: string;
  relationship: string;
  viewName?: string;
  allowCreate?: boolean;
  allowDelete?: boolean;
  maxRows: number;
}

export interface FormSection {
  name: string;
  label: string;
  columns: number;
  fields: FormField[];
  subgrids?: SubgridDef[];
}

export interface FormTab {
  name: string;
  label: string;
  sections: FormSection[];
}

export interface FormDef {
  schemaName: string;
  displayName: string;
  entity: string;
  description?: string;
  formType: "Main" | "QuickCreate";
  header?: FormField[];
  layout: {
    tabs?: FormTab[];
    sections?: FormSection[];
  };
}

// ── Project specs ─────────────────────────────────────────────────────

export interface ProjectSpecs {
  globalChoices: GlobalChoice[];
  tables: TableDef[];
  envVars: EnvVarDef[];
  sampleData: Map<string, SampleDataFile>;
  views: Map<string, ViewDef[]>;
  forms: Map<string, FormDef[]>;
}

// ── Reader ─────────────────────────────────────────────────────────────

export function readSpecs(projectRoot: string): ProjectSpecs {
  // 1. Global choices
  const choicesPath = path.join(projectRoot, "datamodel", "choices", "global-choices.json");
  const choicesRaw = JSON.parse(fs.readFileSync(choicesPath, "utf-8"));
  const globalChoices: GlobalChoice[] = Object.entries(choicesRaw.choices).map(
    ([schemaName, def]: [string, unknown]) => {
      const d = def as Record<string, unknown>;
      const options = d.options as ChoiceOption[];
      return {
        schemaName,
        displayName: d.displayName as string,
        isGlobal: (d.isGlobal as boolean) ?? true,
        description: d.description as string | undefined,
        options,
      };
    },
  );

  // 2. Table definitions
  const tablesDir = path.join(projectRoot, "datamodel", "tables");
  const tableFiles = fs.readdirSync(tablesDir).filter((f) => f.endsWith(".json"));
  const tables: TableDef[] = tableFiles.map((f) => {
    const raw = JSON.parse(fs.readFileSync(path.join(tablesDir, f), "utf-8"));
    return {
      schemaName: raw.schemaName,
      displayName: raw.displayName,
      pluralName: raw.pluralName,
      description: raw.description,
      primaryColumn: raw.primaryColumn,
      ownership: raw.ownership,
      auditEnabled: raw.auditEnabled ?? false,
      columns: raw.columns ?? [],
      relationships: raw.relationships ?? [],
      calculatedFields: raw.calculatedFields,
    };
  });

  // 3. Environment variables
  const envVarsPath = path.join(projectRoot, "solution", "environment-variables.json");
  const envVarsRaw = JSON.parse(fs.readFileSync(envVarsPath, "utf-8"));
  const envVars: EnvVarDef[] = envVarsRaw.variables;

  // 4. Sample data
  const sampleDataDir = path.join(projectRoot, "sample-data");
  const sampleDataFiles = fs.readdirSync(sampleDataDir).filter((f) => f.endsWith(".json"));
  const sampleData = new Map<string, SampleDataFile>();
  for (const f of sampleDataFiles) {
    const raw = JSON.parse(fs.readFileSync(path.join(sampleDataDir, f), "utf-8"));
    if (raw.entity && raw.records) {
      sampleData.set(raw.entity, raw);
    }
  }

  // 5. View specs
  const views = readViewSpecs(projectRoot);

  // 6. Form specs
  const forms = readFormSpecs(projectRoot);

  return { globalChoices, tables, envVars, sampleData, views, forms };
}

// ── View spec reader ──────────────────────────────────────────────────

function readViewSpecs(projectRoot: string): Map<string, ViewDef[]> {
  const viewsDir = path.join(projectRoot, "model-driven-apps", "seo_dispatch-console", "views");
  const result = new Map<string, ViewDef[]>();
  if (!fs.existsSync(viewsDir)) return result;

  const files = fs.readdirSync(viewsDir).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(viewsDir, f), "utf-8"));
    const entitySchema: string = raw.entity;
    const views: ViewDef[] = (raw.views ?? []).map((v: Record<string, unknown>) => ({
      schemaName: v.schemaName as string,
      displayName: v.displayName as string,
      entity: v.entity as string,
      description: v.description as string | undefined,
      viewType: v.viewType as string,
      isDefault: v.isDefault as boolean,
      columns: v.columns as ViewColumn[],
      filter: v.filter as ViewFilter | null,
      sortOrder: v.sortOrder as ViewSortOrder[],
    }));
    if (views.length > 0) {
      const existing = result.get(entitySchema) ?? [];
      existing.push(...views);
      result.set(entitySchema, existing);
    }
  }
  return result;
}

// ── Form spec reader ──────────────────────────────────────────────────

function readFormSpecs(projectRoot: string): Map<string, FormDef[]> {
  const formsDir = path.join(projectRoot, "model-driven-apps", "seo_dispatch-console", "forms");
  const result = new Map<string, FormDef[]>();
  if (!fs.existsSync(formsDir)) return result;

  const files = fs.readdirSync(formsDir).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(formsDir, f), "utf-8"));
    const forms: FormDef[] = (raw.forms ?? []).map((fd: Record<string, unknown>) => ({
      schemaName: fd.schemaName as string,
      displayName: fd.displayName as string,
      entity: fd.entity as string,
      description: fd.description as string | undefined,
      formType: fd.formType as "Main" | "QuickCreate",
      header: fd.header as FormField[] | undefined,
      layout: fd.layout as FormDef["layout"],
    }));
    for (const form of forms) {
      const existing = result.get(form.entity) ?? [];
      existing.push(form);
      result.set(form.entity, existing);
    }
  }
  return result;
}
