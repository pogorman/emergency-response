/**
 * Loads and validates environment config JSON against the deployment schema.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import type { EnvironmentConfig } from "../types/environment-config.js";
import * as log from "./logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load a JSON file and parse it.
 */
function loadJson<T>(filePath: string): T {
  const absolutePath = resolve(filePath);
  log.debug(`Loading: ${absolutePath}`);
  const content = readFileSync(absolutePath, "utf-8");
  return JSON.parse(content) as T;
}

/**
 * Load the deployment definition JSON Schema.
 */
function loadSchema(): object {
  const schemaPath = resolve(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "_schema",
    "deployment-definition-schema.json"
  );
  return loadJson<object>(schemaPath);
}

/**
 * Load and validate an environment config file.
 * Returns the validated config or throws on validation errors.
 */
export function loadEnvironmentConfig(configPath: string): EnvironmentConfig {
  log.setStep("CONFIG");
  log.info(`Loading environment config: ${configPath}`);

  const config = loadJson<EnvironmentConfig>(configPath);
  const schema = loadSchema();

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const isValid = validate(config);

  if (!isValid && validate.errors) {
    const errors = validate.errors
      .map((e) => `  - ${e.instancePath || "/"}: ${e.message}`)
      .join("\n");
    throw new Error(`Environment config validation failed:\n${errors}`);
  }

  // Additional checks beyond JSON Schema
  validateEndpointConsistency(config);
  validatePhiGuard(config);

  log.success(`Config validated: ${config.environmentName} (${config.cloudType} ${config.environmentType})`);
  return config;
}

/**
 * Verify environment URL matches the declared cloud type.
 */
function validateEndpointConsistency(config: EnvironmentConfig): void {
  const { environmentUrl, cloudType } = config;

  if (cloudType === "GCC" && !environmentUrl.includes(".crm9.dynamics.com")) {
    throw new Error(
      `Cloud type is GCC but environmentUrl does not contain '.crm9.dynamics.com': ${environmentUrl}`
    );
  }
  if (cloudType === "GCCHigh" && !environmentUrl.includes(".crm.microsoftdynamics.us")) {
    throw new Error(
      `Cloud type is GCCHigh but environmentUrl does not contain '.crm.microsoftdynamics.us': ${environmentUrl}`
    );
  }

  if (!config.authentication.authority.includes("login.microsoftonline.us")) {
    throw new Error(
      `Authority must use login.microsoftonline.us for GCC: ${config.authentication.authority}`
    );
  }
}

/**
 * Enforce PHI guard: production environments must not import PHI records.
 */
function validatePhiGuard(config: EnvironmentConfig): void {
  if (config.environmentType === "Production" && config.sampleData.includePhiRecords) {
    throw new Error(
      "SECURITY: Production environments must have sampleData.includePhiRecords = false. " +
      "PHI data cannot be imported to production via scripts (ADR-027)."
    );
  }
}

/**
 * Load a JSON spec file (for validation scripts).
 */
export function loadJsonFile<T>(filePath: string): T {
  return loadJson<T>(filePath);
}
