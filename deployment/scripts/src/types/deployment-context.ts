/**
 * Shared deployment context passed between deployment steps.
 * Built up progressively as each step completes.
 */

import type { EnvironmentConfig, CloudType } from "./environment-config.js";

export type DeploymentStepName =
  | "environment-setup"
  | "solution-import"
  | "environment-variables"
  | "connection-references"
  | "security-provision"
  | "sample-data-import"
  | "powerbi-setup";

export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface StepResult {
  readonly step: DeploymentStepName;
  readonly status: StepStatus;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly durationMs?: number;
  readonly message?: string;
  readonly error?: string;
}

export interface ResolvedEndpoints {
  readonly dataverseUrl: string;
  readonly dataverseApiUrl: string;
  readonly authEndpoint: string;
  readonly graphEndpoint: string;
  readonly powerBIEndpoint: string;
}

export interface DeploymentContext {
  /** Loaded and validated environment config */
  readonly config: EnvironmentConfig;

  /** Resolved API endpoints based on cloudType */
  readonly endpoints: ResolvedEndpoints;

  /** Whether this is a dry run (no mutations) */
  readonly isDryRun: boolean;

  /** Steps to skip (by step name) */
  readonly skipSteps: ReadonlySet<DeploymentStepName>;

  /** Accumulated step results */
  readonly stepResults: StepResult[];

  /** MSAL access token (refreshed per step) */
  accessToken?: string;

  /** Token expiry timestamp */
  tokenExpiresAt?: Date;

  /** GUID map: symbolic ref → Dataverse GUID (built during sample data import) */
  readonly refMap: Map<string, string>;

  /** Business Unit GUIDs created during security provisioning */
  readonly businessUnitIds: Map<string, string>;

  /** Team GUIDs created during security provisioning */
  readonly teamIds: Map<string, string>;
}

export interface DeploymentOptions {
  readonly envFile: string;
  readonly isDryRun: boolean;
  readonly skipSteps: string[];
  readonly verbose: boolean;
}

/**
 * Resolve GCC endpoints from cloud type and environment URL.
 */
export function resolveEndpoints(
  environmentUrl: string,
  cloudType: CloudType
): ResolvedEndpoints {
  const authDomain = "login.microsoftonline.us";
  const graphDomain = "graph.microsoft.us";
  const powerBIDomain = "api.powerbigov.us";

  const baseUrl = environmentUrl.replace(/\/+$/, "");
  const apiUrl = `${baseUrl}/api/data/v9.2`;

  return {
    dataverseUrl: baseUrl,
    dataverseApiUrl: apiUrl,
    authEndpoint: `https://${authDomain}`,
    graphEndpoint: `https://${graphDomain}`,
    powerBIEndpoint: `https://${powerBIDomain}`,
  };
}

/**
 * Create initial deployment context from config + options.
 */
export function createDeploymentContext(
  config: EnvironmentConfig,
  options: DeploymentOptions
): DeploymentContext {
  return {
    config,
    endpoints: resolveEndpoints(config.environmentUrl, config.cloudType),
    isDryRun: options.isDryRun,
    skipSteps: new Set(options.skipSteps as DeploymentStepName[]),
    stepResults: [],
    refMap: new Map(),
    businessUnitIds: new Map(),
    teamIds: new Map(),
  };
}
