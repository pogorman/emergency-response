/**
 * TypeScript interfaces for environment configuration JSON files.
 * Maps to deployment/_schema/deployment-definition-schema.json
 */

export type CloudType = "GCC" | "GCCHigh";
export type EnvironmentType = "Sandbox" | "Production";
export type SolutionImportType = "Managed" | "Unmanaged";

export interface AuthenticationConfig {
  readonly clientId: string;
  readonly authority: string;
  readonly clientSecretEnvVar: string;
  readonly certificateThumbprintEnvVar?: string;
}

export interface SolutionConfig {
  readonly uniqueName: string;
  readonly importType: SolutionImportType;
  readonly solutionFilePath?: string;
  readonly publishOnImport: boolean;
  readonly overwriteUnmanagedCustomizations: boolean;
}

export interface AgencyConfig {
  readonly name: string;
  readonly code: string;
  readonly agencyType?: string;
}

export interface SampleDataConfig {
  readonly importSampleData: boolean;
  readonly includePhiRecords: boolean;
  readonly sampleDataPath: string;
}

export interface PowerBIConfig {
  readonly workspaceId: string;
  readonly gatewayId?: string;
  readonly refreshScheduleHours: number;
  readonly configureRLS: boolean;
}

export interface EnvironmentVariables {
  readonly seo_DefaultAgencyId: string;
  readonly seo_DefaultJurisdictionId: string;
  readonly seo_MapDefaultLatitude: string;
  readonly seo_MapDefaultLongitude: string;
  readonly seo_MapDefaultZoom: string;
  readonly seo_EnableMutualAidCostTracking: string;
  readonly seo_PatientRecordRetentionDays: string;
  readonly seo_MCIPatientThreshold: string;
  readonly seo_MutualAidExpiryWarningDays: string;
  readonly seo_DispatchSupervisorEmail: string;
  readonly seo_FlowErrorNotificationEmail: string;
  readonly seo_ServiceAccountUserId: string;
  readonly seo_GPSUpdateIntervalSeconds: string;
  readonly seo_OfflineSyncIntervalMinutes: string;
  readonly seo_DefaultDashboardId: string;
  readonly seo_PowerBIWorkspaceId: string;
  readonly seo_PowerBIDatasetRefreshHours: string;
  readonly seo_NFPAResponseTimeBenchmarkMinutes: string;
  readonly [key: string]: string;
}

export interface ConnectionReferences {
  readonly seo_DataverseConnection: string;
  readonly seo_Office365UsersConnection: string;
  readonly seo_SharePointConnection: string;
  readonly seo_OutlookConnection: string;
  readonly seo_PowerBIConnection: string;
  readonly [key: string]: string;
}

export interface EnvironmentConfig {
  readonly environmentName: string;
  readonly environmentType: EnvironmentType;
  readonly environmentUrl: string;
  readonly tenantId: string;
  readonly cloudType: CloudType;
  readonly authentication: AuthenticationConfig;
  readonly solution: SolutionConfig;
  readonly environmentVariables: EnvironmentVariables;
  readonly connectionReferences: ConnectionReferences;
  readonly agencies: readonly AgencyConfig[];
  readonly sampleData: SampleDataConfig;
  readonly powerBI: PowerBIConfig;
}

/** GCC endpoint map keyed by cloud type */
export const GCC_ENDPOINTS = {
  GCC: {
    dataverse: ".crm9.dynamics.com",
    auth: "login.microsoftonline.us",
    graph: "graph.microsoft.us",
    powerBI: "api.powerbigov.us",
    resource: "https://*.crm9.dynamics.com",
  },
  GCCHigh: {
    dataverse: ".crm.microsoftdynamics.us",
    auth: "login.microsoftonline.us",
    graph: "graph.microsoft.us",
    powerBI: "api.powerbigov.us",
    resource: "https://*.crm.microsoftdynamics.us",
  },
} as const;

/** All 18 environment variable schema names */
export const ALL_ENV_VAR_NAMES = [
  "seo_DefaultAgencyId",
  "seo_DefaultJurisdictionId",
  "seo_MapDefaultLatitude",
  "seo_MapDefaultLongitude",
  "seo_MapDefaultZoom",
  "seo_EnableMutualAidCostTracking",
  "seo_PatientRecordRetentionDays",
  "seo_MCIPatientThreshold",
  "seo_MutualAidExpiryWarningDays",
  "seo_DispatchSupervisorEmail",
  "seo_FlowErrorNotificationEmail",
  "seo_ServiceAccountUserId",
  "seo_GPSUpdateIntervalSeconds",
  "seo_OfflineSyncIntervalMinutes",
  "seo_DefaultDashboardId",
  "seo_PowerBIWorkspaceId",
  "seo_PowerBIDatasetRefreshHours",
  "seo_NFPAResponseTimeBenchmarkMinutes",
] as const;

/** All 5 connection reference schema names */
export const ALL_CONNECTION_REF_NAMES = [
  "seo_DataverseConnection",
  "seo_Office365UsersConnection",
  "seo_SharePointConnection",
  "seo_OutlookConnection",
  "seo_PowerBIConnection",
] as const;
