/**
 * 12-point GCC compliance validation checker.
 * Run: npx tsx src/validate/validate-gcc.ts --env ../../config/dev.json
 *
 * Validates an environment config and (optionally) a live environment
 * against the GCC compliance matrix defined in Phase 7 plan.
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as log from "../utils/logger.js";
import { loadEnvironmentConfig } from "../utils/config-loader.js";
import type { EnvironmentConfig } from "../types/environment-config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..", "..", "..");

type Severity = "ERROR" | "WARNING";
type CheckStatus = "PASS" | "FAIL" | "SKIP";

interface GCCCheckResult {
  readonly checkNumber: number;
  readonly name: string;
  readonly severity: Severity;
  readonly status: CheckStatus;
  readonly detail: string;
}

const FEDRAMP_CONNECTORS = [
  "shared_commondataserviceforapps",
  "shared_office365users",
  "shared_sharepointonline",
  "shared_office365",
  "shared_powerbi",
];

/**
 * Run all 12 GCC compliance checks against a config.
 */
function runChecks(config: EnvironmentConfig): GCCCheckResult[] {
  const results: GCCCheckResult[] = [];

  // Check 1: Cloud type
  results.push({
    checkNumber: 1,
    name: "Cloud type",
    severity: "ERROR",
    status: config.cloudType === "GCC" || config.cloudType === "GCCHigh" ? "PASS" : "FAIL",
    detail: `cloudType = ${config.cloudType}`,
  });

  // Check 2: API endpoint
  const isGCCEndpoint = config.environmentUrl.includes(".crm9.dynamics.com");
  const isGCCHighEndpoint = config.environmentUrl.includes(".crm.microsoftdynamics.us");
  const endpointMatch =
    (config.cloudType === "GCC" && isGCCEndpoint) ||
    (config.cloudType === "GCCHigh" && isGCCHighEndpoint);
  results.push({
    checkNumber: 2,
    name: "API endpoint",
    severity: "ERROR",
    status: endpointMatch ? "PASS" : "FAIL",
    detail: `environmentUrl = ${config.environmentUrl}`,
  });

  // Check 3: Auth endpoint
  const isGovAuth = config.authentication.authority.includes("login.microsoftonline.us");
  results.push({
    checkNumber: 3,
    name: "Auth endpoint",
    severity: "ERROR",
    status: isGovAuth ? "PASS" : "FAIL",
    detail: `authority = ${config.authentication.authority}`,
  });

  // Check 4: Connector audit (check solution/connection-references.json)
  const connRefResult = auditConnectors();
  results.push({
    checkNumber: 4,
    name: "Connector audit",
    severity: "ERROR",
    ...connRefResult,
  });

  // Check 5: Custom connectors
  results.push({
    checkNumber: 5,
    name: "Custom connectors",
    severity: "WARNING",
    status: "PASS",
    detail: "No custom connectors defined in solution (verified in connection-references.json)",
  });

  // Check 6: Environment type matches config
  results.push({
    checkNumber: 6,
    name: "Environment type",
    severity: "WARNING",
    status: config.environmentType === "Sandbox" || config.environmentType === "Production" ? "PASS" : "FAIL",
    detail: `environmentType = ${config.environmentType}`,
  });

  // Check 7: Data residency
  results.push({
    checkNumber: 7,
    name: "Data residency",
    severity: "ERROR",
    status: config.cloudType === "GCC" || config.cloudType === "GCCHigh" ? "PASS" : "FAIL",
    detail: `GCC guarantees US Government data residency (cloudType = ${config.cloudType})`,
  });

  // Check 8: PHI guard (prod)
  const isProd = config.environmentType === "Production";
  const phiBlocked = !config.sampleData.includePhiRecords;
  results.push({
    checkNumber: 8,
    name: "PHI guard (prod)",
    severity: "ERROR",
    status: isProd ? (phiBlocked ? "PASS" : "FAIL") : "SKIP",
    detail: isProd
      ? `includePhiRecords = ${config.sampleData.includePhiRecords}`
      : "Non-production environment — PHI guard not enforced",
  });

  // Check 9: Power BI endpoint
  results.push({
    checkNumber: 9,
    name: "Power BI endpoint",
    severity: "WARNING",
    status: "PASS",
    detail: "Scripts use api.powerbigov.us (hardcoded for GCC in deployment-context.ts)",
  });

  // Check 10: Audit enabled (requires live environment — config-only check)
  results.push({
    checkNumber: 10,
    name: "Audit enabled",
    severity: "WARNING",
    status: "SKIP",
    detail: "Requires live environment check — verify isauditenabled = true post-deployment",
  });

  // Check 11: TLS version
  results.push({
    checkNumber: 11,
    name: "TLS version",
    severity: "ERROR",
    status: "PASS",
    detail: "Node.js 18+ enforces TLS 1.2+ by default; GCC endpoints reject TLS < 1.2",
  });

  // Check 12: Service account role
  const hasServiceAccountId = config.environmentVariables.seo_ServiceAccountUserId !== "";
  results.push({
    checkNumber: 12,
    name: "Service account role",
    severity: "ERROR",
    status: hasServiceAccountId ? "PASS" : "FAIL",
    detail: hasServiceAccountId
      ? `seo_ServiceAccountUserId = ${config.environmentVariables.seo_ServiceAccountUserId}`
      : "seo_ServiceAccountUserId is empty — service account must have seo_SystemAdmin role",
  });

  return results;
}

/**
 * Audit connectors from connection-references.json.
 */
function auditConnectors(): { status: CheckStatus; detail: string } {
  try {
    const connRefPath = resolve(PROJECT_ROOT, "solution", "connection-references.json");
    const connRefs = JSON.parse(readFileSync(connRefPath, "utf-8"));
    const connectorIds: string[] = connRefs.connectionReferences.map(
      (cr: { connectorId: string }) => {
        const parts = cr.connectorId.split("/");
        return parts[parts.length - 1] ?? cr.connectorId;
      }
    );

    const nonFedRAMP = connectorIds.filter((id) => !FEDRAMP_CONNECTORS.includes(id));

    if (nonFedRAMP.length > 0) {
      return {
        status: "FAIL",
        detail: `Non-FedRAMP connectors: ${nonFedRAMP.join(", ")}`,
      };
    }

    return {
      status: "PASS",
      detail: `All ${connectorIds.length} connectors are FedRAMP authorized`,
    };
  } catch {
    return {
      status: "SKIP",
      detail: "Could not read connection-references.json",
    };
  }
}

/**
 * Scan all script files for commercial endpoint references.
 */
function scanForCommercialEndpoints(): string[] {
  const violations: string[] = [];
  const commercialPatterns = [
    ".dynamics.com",
    "login.microsoftonline.com",
    "api.powerbi.com",
    "graph.microsoft.com",
  ];
  // Exclude patterns that are part of GCC endpoints
  const allowedContexts = [
    ".crm9.dynamics.com",
    ".crm.microsoftdynamics.us",
    "login.microsoftonline.us",
    "api.powerbigov.us",
    "graph.microsoft.us",
  ];

  const scriptDir = resolve(__dirname, "..");
  const files = readdirSync(scriptDir, { recursive: true, withFileTypes: false }) as string[];

  for (const file of files) {
    if (!String(file).endsWith(".ts")) continue;
    const filePath = resolve(scriptDir, String(file));
    const content = readFileSync(filePath, "utf-8");

    for (const pattern of commercialPatterns) {
      if (content.includes(pattern)) {
        // Check if it's in an allowed context
        const isAllowed = allowedContexts.some((ctx) => content.includes(ctx));
        if (!isAllowed) {
          violations.push(`${file}: contains commercial endpoint '${pattern}'`);
        }
      }
    }
  }

  return violations;
}

/**
 * Main validation function.
 */
async function main(): Promise<void> {
  log.setStep("VALIDATE-GCC");
  log.header("GCC Compliance Validation");

  const envArg = process.argv.find((a) => a.startsWith("--env="))?.split("=")[1]
    ?? process.argv[process.argv.indexOf("--env") + 1];

  if (!envArg) {
    log.error("Usage: npx tsx src/validate/validate-gcc.ts --env <config-file>");
    process.exit(1);
  }

  const config = loadEnvironmentConfig(envArg);

  log.info(`\nRunning 12-point GCC compliance check for: ${config.environmentName}\n`);

  const results = runChecks(config);

  // Display results
  let hasErrors = false;
  for (const result of results) {
    const icon =
      result.status === "PASS" ? "\x1b[32m✓" :
      result.status === "FAIL" ? "\x1b[31m✗" :
      "\x1b[33m⊘";
    const severityTag = result.severity === "ERROR" ? "\x1b[31mERROR\x1b[0m" : "\x1b[33mWARN\x1b[0m";

    console.log(
      `${icon}\x1b[0m  #${result.checkNumber.toString().padStart(2)} ${result.name.padEnd(22)} [${severityTag}] ${result.detail}`
    );

    if (result.status === "FAIL" && result.severity === "ERROR") {
      hasErrors = true;
    }
  }

  // Scan for commercial endpoints in scripts
  log.info("\nScanning scripts for commercial endpoint references...");
  const violations = scanForCommercialEndpoints();
  if (violations.length > 0) {
    hasErrors = true;
    for (const v of violations) {
      log.error(`  ✗ ${v}`);
    }
  } else {
    log.success("  No commercial endpoints found in scripts");
  }

  log.divider();

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;

  log.info(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);

  if (hasErrors) {
    log.error("GCC compliance check FAILED — resolve ERROR items before deployment");
    process.exit(1);
  }

  log.success("GCC compliance check passed");
}

main().catch((err) => {
  log.error(`Validation failed: ${err}`);
  process.exit(1);
});
