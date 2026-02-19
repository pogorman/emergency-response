/**
 * Validates all Phase 1-6 JSON spec files against their respective schemas.
 * Run: npx tsx src/validate/validate-specs.ts
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import * as log from "../utils/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..", "..", "..");

interface ValidationTarget {
  readonly name: string;
  readonly schemaPath: string;
  readonly specPaths: string[];
}

function loadJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function globJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(resolve(dir, entry.name));
    } else if (entry.isDirectory()) {
      files.push(...globJsonFiles(resolve(dir, entry.name)));
    }
  }

  return files;
}

/**
 * Build the list of schemas → spec files to validate.
 */
function buildValidationTargets(): ValidationTarget[] {
  const targets: ValidationTarget[] = [];

  // Phase 3: Flow definitions
  const flowSchemaPath = resolve(PROJECT_ROOT, "flows", "_schema", "flow-definition-schema.json");
  if (existsSync(flowSchemaPath)) {
    targets.push({
      name: "Flow Definitions",
      schemaPath: flowSchemaPath,
      specPaths: [
        ...globJsonFiles(resolve(PROJECT_ROOT, "flows", "tier-1")),
        ...globJsonFiles(resolve(PROJECT_ROOT, "flows", "tier-2")),
      ],
    });
  }

  // Phase 4: Canvas app definitions
  const canvasSchemaPath = resolve(PROJECT_ROOT, "apps", "_schema", "canvas-app-definition-schema.json");
  if (existsSync(canvasSchemaPath)) {
    targets.push({
      name: "Canvas App Definitions",
      schemaPath: canvasSchemaPath,
      specPaths: [
        ...globJsonFiles(resolve(PROJECT_ROOT, "apps", "seo_responder-mobile", "screens")),
        ...globJsonFiles(resolve(PROJECT_ROOT, "apps", "seo_responder-mobile", "components")),
      ],
    });
  }

  // Phase 5: Model-driven app definitions
  const mdaSchemaPath = resolve(PROJECT_ROOT, "model-driven-apps", "_schema", "mda-definition-schema.json");
  if (existsSync(mdaSchemaPath)) {
    targets.push({
      name: "Model-Driven App Definitions",
      schemaPath: mdaSchemaPath,
      specPaths: [
        ...globJsonFiles(resolve(PROJECT_ROOT, "model-driven-apps", "seo_dispatch-console", "views")),
        ...globJsonFiles(resolve(PROJECT_ROOT, "model-driven-apps", "seo_dispatch-console", "forms")),
        ...globJsonFiles(resolve(PROJECT_ROOT, "model-driven-apps", "seo_dispatch-console", "dashboards")),
        ...globJsonFiles(resolve(PROJECT_ROOT, "model-driven-apps", "seo_dispatch-console", "business-process-flows")),
        ...globJsonFiles(resolve(PROJECT_ROOT, "model-driven-apps", "seo_dispatch-console", "command-bar")),
      ],
    });
  }

  // Phase 6: Report definitions
  const reportSchemaPath = resolve(PROJECT_ROOT, "reporting", "_schema", "report-definition-schema.json");
  if (existsSync(reportSchemaPath)) {
    targets.push({
      name: "Report Definitions",
      schemaPath: reportSchemaPath,
      specPaths: [
        ...globJsonFiles(resolve(PROJECT_ROOT, "reporting", "datasets")),
        ...globJsonFiles(resolve(PROJECT_ROOT, "reporting", "reports")),
        ...globJsonFiles(resolve(PROJECT_ROOT, "reporting", "measures")),
        ...globJsonFiles(resolve(PROJECT_ROOT, "reporting", "rls")),
      ],
    });
  }

  // Phase 7: Deployment definitions
  const deploySchemaPath = resolve(PROJECT_ROOT, "deployment", "_schema", "deployment-definition-schema.json");
  if (existsSync(deploySchemaPath)) {
    targets.push({
      name: "Deployment Definitions",
      schemaPath: deploySchemaPath,
      specPaths: [
        ...globJsonFiles(resolve(PROJECT_ROOT, "deployment", "config")),
      ].filter((f) => !basename(f).includes("schema")),
    });
  }

  return targets;
}

/**
 * Main validation function.
 */
async function main(): Promise<void> {
  log.setStep("VALIDATE-SPECS");
  log.header("Spec Validation — All Phases");

  const targets = buildValidationTargets();
  let totalFiles = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const failures: string[] = [];

  for (const target of targets) {
    log.info(`\n${target.name} (${target.specPaths.length} files)`);

    if (target.specPaths.length === 0) {
      log.warn("  No spec files found — skipping");
      continue;
    }

    const schema = loadJson(target.schemaPath);
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);

    let validate: ReturnType<typeof ajv.compile>;
    try {
      validate = ajv.compile(schema as object);
    } catch (err) {
      log.error(`  Schema compilation failed: ${err}`);
      totalFailed += target.specPaths.length;
      totalFiles += target.specPaths.length;
      continue;
    }

    for (const specPath of target.specPaths) {
      totalFiles++;
      const fileName = specPath.replace(PROJECT_ROOT, "").replace(/\\/g, "/");

      try {
        const spec = loadJson(specPath);
        const isValid = validate(spec);

        if (isValid) {
          totalPassed++;
          log.debug(`  ✓ ${fileName}`);
        } else {
          totalFailed++;
          const errors = (validate.errors ?? [])
            .map((e) => `    ${e.instancePath || "/"}: ${e.message}`)
            .join("\n");
          failures.push(`${fileName}:\n${errors}`);
          log.error(`  ✗ ${fileName}`);
        }
      } catch (err) {
        totalFailed++;
        failures.push(`${fileName}: Parse error — ${err}`);
        log.error(`  ✗ ${fileName} (parse error)`);
      }
    }
  }

  log.divider();
  log.info(`Results: ${totalPassed}/${totalFiles} passed, ${totalFailed} failed`);

  if (failures.length > 0) {
    log.error("\nFailures:");
    for (const failure of failures) {
      log.error(failure);
    }
    process.exit(1);
  }

  log.success("All spec files validated successfully");
}

main().catch((err) => {
  log.error(`Validation failed: ${err}`);
  process.exit(1);
});
