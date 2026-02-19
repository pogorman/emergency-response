/**
 * Step 5: Create Business Units, teams, assign roles, field security.
 * - Creates one BU per agency in config
 * - Creates 4 owner teams per BU (Dispatchers, Responders, EMS, Command)
 * - Creates Mutual Aid Partners org-scoped team
 * - Assigns security roles to teams
 */

import type { DeploymentContext } from "../types/deployment-context.js";
import type { BusinessUnitRecord, TeamRecord, SecurityRoleRecord } from "../types/dataverse-api.js";
import * as log from "../utils/logger.js";
import { queryCollection, createRecord, apiPost } from "../utils/dataverse-client.js";

const TEAM_TEMPLATES = [
  { suffix: "Dispatchers", roles: ["seo_Dispatcher", "seo_DispatchSupervisor"] },
  { suffix: "Responders", roles: ["seo_Responder", "seo_StationOfficer"] },
  { suffix: "EMS", roles: ["seo_EMSProvider"] },
  { suffix: "Command", roles: ["seo_IncidentCommander"] },
];

export async function run(ctx: DeploymentContext): Promise<void> {
  log.setStep("05-SECURITY");
  log.header("Step 5: Security Provisioning");

  const { config, isDryRun } = ctx;

  if (config.agencies.length === 0) {
    log.info("No agencies in config — skipping BU/team provisioning");
    return;
  }

  // 1. Get root Business Unit
  log.info("Querying root Business Unit...");
  const rootBUs = await queryCollection<BusinessUnitRecord>(
    ctx,
    "businessunits",
    "businessunitid,name",
    "parentbusinessunitid eq null",
    isDryRun
  );

  const rootBUId = rootBUs[0]?.businessunitid;
  if (!rootBUId && !isDryRun) {
    throw new Error("Could not find root Business Unit");
  }
  log.info(`Root BU: ${rootBUs[0]?.name ?? "N/A"} (${rootBUId ?? "dry-run"})`);

  // 2. Get existing BUs
  log.info("Querying existing Business Units...");
  const existingBUs = await queryCollection<BusinessUnitRecord>(
    ctx,
    "businessunits",
    "businessunitid,name",
    undefined,
    isDryRun
  );
  const existingBUNames = new Set(existingBUs.map((bu) => bu.name));

  // 3. Get security roles
  log.info("Querying security roles...");
  const roles = await queryCollection<SecurityRoleRecord>(
    ctx,
    "roles",
    "roleid,name,_businessunitid_value",
    `startswith(name,'seo_')`,
    isDryRun
  );
  const roleMap = new Map<string, string>();
  for (const role of roles) {
    roleMap.set(role.name, role.roleid);
  }

  // 4. Create BUs and teams for each agency
  for (const agency of config.agencies) {
    log.info(`\nProvisioning agency: ${agency.name} (${agency.code})`);

    // Create BU if it doesn't exist
    let buId: string | null = null;
    if (existingBUNames.has(agency.name)) {
      const existing = existingBUs.find((bu) => bu.name === agency.name);
      buId = existing?.businessunitid ?? null;
      log.info(`  BU exists: ${agency.name} (${buId})`);
    } else {
      log.info(`  Creating BU: ${agency.name}`);
      buId = await createRecord(
        ctx,
        "businessunits",
        {
          name: agency.name,
          "parentbusinessunitid@odata.bind": `/businessunits(${rootBUId})`,
        },
        isDryRun
      );
      log.success(`  BU created: ${agency.name} (${buId ?? "dry-run"})`);
    }

    if (buId) {
      ctx.businessUnitIds.set(agency.code, buId);
    }

    // Create 4 owner teams per BU
    for (const template of TEAM_TEMPLATES) {
      const teamName = `${agency.name} ${template.suffix}`;
      log.info(`  Creating team: ${teamName}`);

      const teamId = await createRecord(
        ctx,
        "teams",
        {
          name: teamName,
          teamtype: 0, // Owner team
          "businessunitid@odata.bind": `/businessunits(${buId})`,
        },
        isDryRun
      );

      if (teamId) {
        ctx.teamIds.set(`${agency.code}-${template.suffix}`, teamId);
      }

      // Assign roles to team
      for (const roleName of template.roles) {
        const roleId = roleMap.get(roleName);
        if (roleId) {
          log.debug(`    Assigning role ${roleName} to team ${teamName}`);
          await apiPost(
            ctx,
            `teams(${teamId})/teamroles_association/$ref`,
            { "@odata.id": `${ctx.endpoints.dataverseApiUrl}/roles(${roleId})` },
            isDryRun
          );
        } else if (!isDryRun) {
          log.warn(`    Role ${roleName} not found — skipping`);
        }
      }
    }
  }

  // 5. Create Mutual Aid Partners org-scoped team
  log.info("\nCreating Mutual Aid Partners team (org-scoped)...");
  const mutualAidTeamId = await createRecord(
    ctx,
    "teams",
    {
      name: "Mutual Aid Partners",
      teamtype: 0,
      "businessunitid@odata.bind": `/businessunits(${rootBUId})`,
    },
    isDryRun
  );
  if (mutualAidTeamId) {
    ctx.teamIds.set("MutualAidPartners", mutualAidTeamId);
  }

  log.success(
    `Security provisioning complete: ${config.agencies.length} agencies, ` +
    `${config.agencies.length * 4 + 1} teams`
  );
}
