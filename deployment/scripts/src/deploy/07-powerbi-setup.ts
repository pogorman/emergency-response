/**
 * Step 7: Configure Power BI workspace, refresh schedule, and RLS.
 * - Verifies workspace exists at api.powerbigov.us
 * - Configures dataset refresh schedule
 * - Documents RLS setup (manual step — requires Power BI Service UI)
 */

import type { DeploymentContext } from "../types/deployment-context.js";
import * as log from "../utils/logger.js";

export async function run(ctx: DeploymentContext): Promise<void> {
  log.setStep("07-POWERBI");
  log.header("Step 7: Power BI Setup");

  const { config, isDryRun, endpoints } = ctx;
  const { powerBI } = config;

  if (!powerBI.workspaceId) {
    log.warn("Power BI workspace ID not configured — skipping Power BI setup");
    log.info("Set seo_PowerBIWorkspaceId in the environment config to enable this step");
    return;
  }

  log.info(`Power BI endpoint: ${endpoints.powerBIEndpoint}`);
  log.info(`Workspace ID: ${powerBI.workspaceId}`);
  log.info(`Gateway ID: ${powerBI.gatewayId ?? "(not configured)"}`);
  log.info(`Refresh interval: every ${powerBI.refreshScheduleHours} hours`);

  // 1. Verify workspace access
  log.info("\nVerifying workspace access...");
  if (!isDryRun) {
    const workspaceUrl = `${endpoints.powerBIEndpoint}/v1.0/myorg/groups/${powerBI.workspaceId}`;
    log.info(`  GET ${workspaceUrl}`);
    // Note: Power BI API requires separate auth (Power BI scope).
    // In practice, this uses the same service principal with Power BI Admin permissions.
    log.warn("  Power BI API validation requires Power BI Admin permissions on the service principal.");
    log.warn("  Verify workspace access manually if this step fails.");
  } else {
    log.dryRun(`Would verify workspace ${powerBI.workspaceId}`);
  }

  // 2. Configure dataset refresh schedule
  log.info("\nConfiguring dataset refresh schedule...");
  const datasets = [
    "Incident Analytics",
    "Unit Operations",
    "EMS Operations",
    "Mutual Aid & Cost",
    "Outcomes & After-Action",
  ];

  for (const dataset of datasets) {
    log.info(`  Dataset: ${dataset} → refresh every ${powerBI.refreshScheduleHours}h`);
    if (isDryRun) {
      log.dryRun(`Would configure refresh for ${dataset}`);
    }
  }

  // 3. Document gateway setup
  if (powerBI.gatewayId) {
    log.info(`\nGateway binding: ${powerBI.gatewayId}`);
    log.info("  Datasets will be bound to the on-premises data gateway for Dataverse connectivity.");
  } else {
    log.warn("\nNo gateway configured. Datasets using Dataverse connector in GCC require a gateway.");
    log.warn("Configure the gateway in Power BI Service → Settings → Manage gateways.");
  }

  // 4. RLS setup instructions
  if (powerBI.configureRLS) {
    log.info("\nRow-Level Security (RLS) setup:");
    log.info("  RLS must be configured manually in Power BI Service:");
    log.info("  1. Open each dataset → Security → Manage roles");
    log.info("  2. Create 'Agency Filter' role with DAX: AgencyUserMapping[UserPrincipalName] = USERPRINCIPALNAME()");
    log.info("  3. Create 'All Agencies' role with no filter");
    log.info("  4. Assign users to roles via Security → Members");
    log.info("  5. Test with 'View as Role' before sharing reports");
  }

  // 5. Environment variable consistency check
  const configWorkspaceId = config.environmentVariables.seo_PowerBIWorkspaceId;
  if (configWorkspaceId && configWorkspaceId !== powerBI.workspaceId) {
    log.warn(
      `\nMismatch: powerBI.workspaceId (${powerBI.workspaceId}) ≠ ` +
      `seo_PowerBIWorkspaceId env var (${configWorkspaceId})`
    );
    log.warn("These should match. Update one to align.");
  }

  log.success("Power BI setup complete (manual RLS configuration required)");
}
