/**
 * Step 1: Verify/create target Dataverse environment.
 * - Authenticates pac CLI with service principal
 * - Verifies environment connectivity via WhoAmI
 * - Validates environment type matches config
 */

import type { DeploymentContext } from "../types/deployment-context.js";
import * as log from "../utils/logger.js";
import * as pac from "../utils/pac-wrapper.js";
import { whoAmI } from "../utils/dataverse-client.js";

export async function run(ctx: DeploymentContext): Promise<void> {
  log.setStep("01-ENV-SETUP");
  log.header("Step 1: Environment Setup");

  const { config, isDryRun } = ctx;

  // 1. Authenticate pac CLI
  log.info("Authenticating pac CLI with service principal...");
  const clientSecret = process.env[config.authentication.clientSecretEnvVar];
  if (!clientSecret && !isDryRun) {
    throw new Error(`Missing environment variable: ${config.authentication.clientSecretEnvVar}`);
  }

  const authResult = pac.authCreateServicePrincipal(
    config.tenantId,
    config.authentication.clientId,
    clientSecret ?? "dry-run-placeholder",
    config.cloudType,
    isDryRun
  );

  if (authResult.exitCode !== 0 && !isDryRun) {
    throw new Error("pac auth failed — check service principal credentials");
  }
  log.success("pac CLI authenticated");

  // 2. Select target environment
  log.info(`Selecting environment: ${config.environmentUrl}`);
  const orgResult = pac.orgSelect(config.environmentUrl, isDryRun);
  if (orgResult.exitCode !== 0 && !isDryRun) {
    throw new Error(`Failed to select environment: ${config.environmentUrl}`);
  }

  // 3. Verify connectivity via pac org who
  log.info("Verifying environment connectivity...");
  const whoResult = pac.orgWho(isDryRun);
  if (whoResult.exitCode !== 0 && !isDryRun) {
    throw new Error("pac org who failed — environment may not exist or is unreachable");
  }
  if (!isDryRun) {
    log.info(`pac org who output:\n${whoResult.stdout}`);
  }

  // 4. Verify connectivity via Dataverse Web API WhoAmI
  log.info("Verifying Dataverse Web API connectivity...");
  const whoAmIResult = await whoAmI(ctx, isDryRun);
  if (!isDryRun) {
    log.info(`Organization ID: ${whoAmIResult.OrganizationId}`);
    log.info(`User ID: ${whoAmIResult.UserId}`);
    log.info(`Business Unit ID: ${whoAmIResult.BusinessUnitId}`);
  }

  // 5. Validate environment type
  log.info(`Expected environment type: ${config.environmentType}`);
  log.info(`Cloud type: ${config.cloudType}`);

  log.success("Environment setup verified");
}
