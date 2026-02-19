/**
 * Typed wrapper around the Power Platform CLI (pac) commands.
 * Uses --cloud UsGov for GCC environments.
 */

import { execSync } from "node:child_process";
import type { CloudType, SolutionImportType } from "../types/environment-config.js";
import * as log from "./logger.js";

interface PacExecResult {
  readonly stdout: string;
  readonly exitCode: number;
}

function execPac(args: string, isDryRun: boolean): PacExecResult {
  const command = `pac ${args}`;

  if (isDryRun) {
    log.dryRun(`Would execute: ${command}`);
    return { stdout: "", exitCode: 0 };
  }

  log.debug(`Executing: ${command}`);

  try {
    const stdout = execSync(command, {
      encoding: "utf-8",
      timeout: 600_000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout: stdout.trim(), exitCode: 0 };
  } catch (err: unknown) {
    const execError = err as { stdout?: string; stderr?: string; status?: number };
    const stderr = execError.stderr ?? "Unknown error";
    log.error(`pac command failed: ${stderr}`);
    return { stdout: execError.stdout ?? "", exitCode: execError.status ?? 1 };
  }
}

/**
 * Authenticate pac CLI with a service principal.
 */
export function authCreateServicePrincipal(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  cloudType: CloudType,
  isDryRun: boolean
): PacExecResult {
  const cloud = cloudType === "GCCHigh" ? "UsGovHigh" : "UsGov";
  return execPac(
    `auth create --tenant ${tenantId} --applicationId ${clientId} --clientSecret "${clientSecret}" --cloud ${cloud}`,
    isDryRun
  );
}

/**
 * List authenticated profiles.
 */
export function authList(isDryRun: boolean): PacExecResult {
  return execPac("auth list", isDryRun);
}

/**
 * Select an environment by URL.
 */
export function orgSelect(environmentUrl: string, isDryRun: boolean): PacExecResult {
  return execPac(`org select --environment ${environmentUrl}`, isDryRun);
}

/**
 * Get environment info (verifies connectivity).
 */
export function orgWho(isDryRun: boolean): PacExecResult {
  return execPac("org who", isDryRun);
}

/**
 * Import a solution zip.
 */
export function solutionImport(
  solutionPath: string,
  importType: SolutionImportType,
  publishOnImport: boolean,
  overwriteCustomizations: boolean,
  isDryRun: boolean
): PacExecResult {
  let args = `solution import --path "${solutionPath}"`;

  if (publishOnImport) {
    args += " --publish-changes";
  }
  if (overwriteCustomizations) {
    args += " --force-overwrite";
  }
  if (importType === "Managed") {
    args += " --import-as-holding false";
  }

  return execPac(args, isDryRun);
}

/**
 * Export a solution (for backup before import).
 */
export function solutionExport(
  solutionName: string,
  outputPath: string,
  isManaged: boolean,
  isDryRun: boolean
): PacExecResult {
  const managedFlag = isManaged ? " --managed" : "";
  return execPac(
    `solution export --name ${solutionName} --path "${outputPath}"${managedFlag}`,
    isDryRun
  );
}

/**
 * List solutions in the target environment.
 */
export function solutionList(isDryRun: boolean): PacExecResult {
  return execPac("solution list", isDryRun);
}

/**
 * Delete (uninstall) a solution.
 */
export function solutionDelete(solutionName: string, isDryRun: boolean): PacExecResult {
  return execPac(`solution delete --solution-name ${solutionName}`, isDryRun);
}

/**
 * Publish all customizations.
 */
export function solutionPublish(isDryRun: boolean): PacExecResult {
  return execPac("solution publish", isDryRun);
}
