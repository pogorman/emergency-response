/**
 * Orchestrator: runs deployment steps 01-07 with CLI flags.
 *
 * Usage:
 *   npx tsx src/deploy/deploy-all.ts --env ../../config/dev.json
 *   npx tsx src/deploy/deploy-all.ts --env ../../config/dev.json --dry-run
 *   npx tsx src/deploy/deploy-all.ts --env ../../config/dev.json --skip-step solution-import --skip-step sample-data-import
 *   npx tsx src/deploy/deploy-all.ts --env ../../config/dev.json --verbose
 */

import { loadEnvironmentConfig } from "../utils/config-loader.js";
import {
  createDeploymentContext,
  type DeploymentStepName,
  type StepResult,
  type DeploymentOptions,
} from "../types/deployment-context.js";
import * as log from "../utils/logger.js";

import * as step01 from "./01-environment-setup.js";
import * as step02 from "./02-solution-import.js";
import * as step03 from "./03-environment-variables.js";
import * as step04 from "./04-connection-references.js";
import * as step05 from "./05-security-provision.js";
import * as step06 from "./06-sample-data-import.js";
import * as step07 from "./07-powerbi-setup.js";

interface DeploymentStep {
  readonly name: DeploymentStepName;
  readonly displayName: string;
  readonly run: (ctx: ReturnType<typeof createDeploymentContext>) => Promise<void>;
}

const STEPS: DeploymentStep[] = [
  { name: "environment-setup", displayName: "01 — Environment Setup", run: step01.run },
  { name: "solution-import", displayName: "02 — Solution Import", run: step02.run },
  { name: "environment-variables", displayName: "03 — Environment Variables", run: step03.run },
  { name: "connection-references", displayName: "04 — Connection References", run: step04.run },
  { name: "security-provision", displayName: "05 — Security Provisioning", run: step05.run },
  { name: "sample-data-import", displayName: "06 — Sample Data Import", run: step06.run },
  { name: "powerbi-setup", displayName: "07 — Power BI Setup", run: step07.run },
];

function parseArgs(): DeploymentOptions {
  const args = process.argv.slice(2);
  let envFile = "";
  let isDryRun = false;
  const skipSteps: string[] = [];
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--env" && args[i + 1]) {
      envFile = args[++i]!;
    } else if (arg.startsWith("--env=")) {
      envFile = arg.split("=")[1]!;
    } else if (arg === "--dry-run") {
      isDryRun = true;
    } else if (arg === "--skip-step" && args[i + 1]) {
      skipSteps.push(args[++i]!);
    } else if (arg.startsWith("--skip-step=")) {
      skipSteps.push(arg.split("=")[1]!);
    } else if (arg === "--verbose") {
      verbose = true;
    } else if (arg === "--help") {
      printUsage();
      process.exit(0);
    }
  }

  if (!envFile) {
    log.error("Missing required --env flag");
    printUsage();
    process.exit(1);
  }

  return { envFile, isDryRun, skipSteps, verbose };
}

function printUsage(): void {
  console.log(`
EmergencyResponseCoordination Deployment Orchestrator

Usage:
  npx tsx src/deploy/deploy-all.ts --env <config-file> [options]

Options:
  --env <file>           Path to environment config JSON (required)
  --dry-run              Preview actions without making changes
  --skip-step <step>     Skip a deployment step (repeatable)
  --verbose              Enable debug logging
  --help                 Show this help message

Steps:
  environment-setup      Verify/create target environment
  solution-import        Import solution (managed or unmanaged)
  environment-variables  Set all 18 environment variable values
  connection-references  Bind 5 connection references
  security-provision     Create BUs, teams, assign roles
  sample-data-import     Import 22 sample data files
  powerbi-setup          Configure Power BI workspace

Examples:
  npx tsx src/deploy/deploy-all.ts --env ../../config/dev.json --dry-run
  npx tsx src/deploy/deploy-all.ts --env ../../config/prod.json --skip-step sample-data-import
`);
}

async function main(): Promise<void> {
  const options = parseArgs();
  log.setVerbose(options.verbose);

  log.header("EmergencyResponseCoordination — Deployment");
  log.info(`Config: ${options.envFile}`);
  log.info(`Dry run: ${options.isDryRun}`);
  if (options.skipSteps.length > 0) {
    log.info(`Skipping: ${options.skipSteps.join(", ")}`);
  }

  // Load and validate config
  const config = loadEnvironmentConfig(options.envFile);
  const ctx = createDeploymentContext(config, options);

  log.info(`\nTarget: ${config.environmentName} (${config.cloudType} ${config.environmentType})`);
  log.info(`URL: ${config.environmentUrl}\n`);

  if (options.isDryRun) {
    log.warn("DRY RUN MODE — no changes will be made\n");
  }

  // Run each step
  const startTime = Date.now();

  for (const step of STEPS) {
    if (ctx.skipSteps.has(step.name)) {
      const result: StepResult = {
        step: step.name,
        status: "skipped",
        startedAt: new Date(),
        message: "Skipped by --skip-step flag",
      };
      ctx.stepResults.push(result);
      log.stepSummary(step.displayName, "skipped");
      continue;
    }

    const stepStart = Date.now();

    try {
      await step.run(ctx);

      const durationMs = Date.now() - stepStart;
      const result: StepResult = {
        step: step.name,
        status: "completed",
        startedAt: new Date(stepStart),
        completedAt: new Date(),
        durationMs,
      };
      ctx.stepResults.push(result);
      log.stepSummary(step.displayName, "completed", durationMs);
    } catch (err) {
      const durationMs = Date.now() - stepStart;
      const errorMessage = err instanceof Error ? err.message : String(err);
      const result: StepResult = {
        step: step.name,
        status: "failed",
        startedAt: new Date(stepStart),
        completedAt: new Date(),
        durationMs,
        error: errorMessage,
      };
      ctx.stepResults.push(result);
      log.stepSummary(step.displayName, "failed", durationMs);
      log.error(`  ${errorMessage}`);

      // Abort on failure
      log.error("\nDeployment aborted due to step failure.");
      log.info("Fix the issue and re-run with --skip-step for completed steps.\n");
      printSummary(ctx.stepResults, Date.now() - startTime);
      process.exit(1);
    }
  }

  printSummary(ctx.stepResults, Date.now() - startTime);
}

function printSummary(results: StepResult[], totalMs: number): void {
  log.divider();
  log.header("Deployment Summary");

  for (const result of results) {
    const duration = result.durationMs ? `${(result.durationMs / 1000).toFixed(1)}s` : "—";
    const icon =
      result.status === "completed" ? "✓" :
      result.status === "failed" ? "✗" :
      "⊘";
    console.log(`  ${icon} ${result.step.padEnd(25)} ${result.status.padEnd(10)} ${duration}`);
  }

  const completed = results.filter((r) => r.status === "completed").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  log.divider();
  log.info(
    `Total: ${completed} completed, ${failed} failed, ${skipped} skipped ` +
    `(${(totalMs / 1000).toFixed(1)}s)`
  );

  if (failed === 0) {
    log.success("\nDeployment completed successfully!");
  }
}

main().catch((err) => {
  log.error(`Deployment failed: ${err}`);
  process.exit(1);
});
