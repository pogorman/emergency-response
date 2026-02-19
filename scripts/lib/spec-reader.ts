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

export interface ProjectSpecs {
  globalChoices: GlobalChoice[];
  tables: TableDef[];
  envVars: EnvVarDef[];
  sampleData: Map<string, SampleDataFile>;
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

  return { globalChoices, tables, envVars, sampleData };
}
