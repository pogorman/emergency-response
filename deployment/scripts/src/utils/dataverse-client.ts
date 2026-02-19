/**
 * Dataverse Web API client for GCC endpoints.
 * Uses @azure/identity for MSAL auth and native fetch (Node 18+).
 */

import { ClientSecretCredential } from "@azure/identity";
import type { DeploymentContext } from "../types/deployment-context.js";
import type {
  ODataCollection,
  ODataEntity,
  DataverseApiError,
  WhoAmIResponse,
  GenericRecord,
  GrantAccessPayload,
} from "../types/dataverse-api.js";
import * as log from "./logger.js";

const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // Refresh 5 min before expiry

/**
 * Acquire or refresh an access token for Dataverse.
 */
export async function ensureToken(ctx: DeploymentContext): Promise<string> {
  if (
    ctx.accessToken &&
    ctx.tokenExpiresAt &&
    ctx.tokenExpiresAt.getTime() > Date.now() + TOKEN_REFRESH_MARGIN_MS
  ) {
    return ctx.accessToken;
  }

  const { config, endpoints } = ctx;
  const clientSecret = process.env[config.authentication.clientSecretEnvVar];
  if (!clientSecret) {
    throw new Error(
      `Missing environment variable: ${config.authentication.clientSecretEnvVar}`
    );
  }

  const credential = new ClientSecretCredential(
    config.tenantId,
    config.authentication.clientId,
    clientSecret,
    { authorityHost: endpoints.authEndpoint }
  );

  const scope = `${endpoints.dataverseUrl}/.default`;
  log.debug(`Acquiring token for scope: ${scope}`);

  const tokenResponse = await credential.getToken(scope);
  ctx.accessToken = tokenResponse.token;
  ctx.tokenExpiresAt = new Date(tokenResponse.expiresOnTimestamp);

  log.debug(`Token acquired, expires at ${ctx.tokenExpiresAt.toISOString()}`);
  return tokenResponse.token;
}

/**
 * Make an authenticated GET request to the Dataverse Web API.
 */
export async function apiGet<T>(
  ctx: DeploymentContext,
  path: string,
  isDryRun: boolean
): Promise<T> {
  if (isDryRun) {
    log.dryRun(`GET ${path}`);
    return {} as T;
  }

  const token = await ensureToken(ctx);
  const url = `${ctx.endpoints.dataverseApiUrl}/${path}`;
  log.debug(`GET ${url}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = (await response.json()) as DataverseApiError;
    throw new Error(
      `Dataverse API GET failed (${response.status}): ${errorBody.error?.message ?? response.statusText}`
    );
  }

  return (await response.json()) as T;
}

/**
 * Make an authenticated POST request to the Dataverse Web API.
 */
export async function apiPost<T>(
  ctx: DeploymentContext,
  path: string,
  body: unknown,
  isDryRun: boolean
): Promise<T | null> {
  if (isDryRun) {
    log.dryRun(`POST ${path}`);
    return null;
  }

  const token = await ensureToken(ctx);
  const url = `${ctx.endpoints.dataverseApiUrl}/${path}`;
  log.debug(`POST ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = (await response.json()) as DataverseApiError;
    throw new Error(
      `Dataverse API POST failed (${response.status}): ${errorBody.error?.message ?? response.statusText}`
    );
  }

  if (response.status === 204) return null;
  return (await response.json()) as T;
}

/**
 * Make an authenticated PATCH request to the Dataverse Web API.
 */
export async function apiPatch(
  ctx: DeploymentContext,
  path: string,
  body: unknown,
  isDryRun: boolean
): Promise<void> {
  if (isDryRun) {
    log.dryRun(`PATCH ${path}`);
    return;
  }

  const token = await ensureToken(ctx);
  const url = `${ctx.endpoints.dataverseApiUrl}/${path}`;
  log.debug(`PATCH ${url}`);

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = (await response.json()) as DataverseApiError;
    throw new Error(
      `Dataverse API PATCH failed (${response.status}): ${errorBody.error?.message ?? response.statusText}`
    );
  }
}

/**
 * Make an authenticated DELETE request.
 */
export async function apiDelete(
  ctx: DeploymentContext,
  path: string,
  isDryRun: boolean
): Promise<void> {
  if (isDryRun) {
    log.dryRun(`DELETE ${path}`);
    return;
  }

  const token = await ensureToken(ctx);
  const url = `${ctx.endpoints.dataverseApiUrl}/${path}`;
  log.debug(`DELETE ${url}`);

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      Accept: "application/json",
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorBody = (await response.json()) as DataverseApiError;
    throw new Error(
      `Dataverse API DELETE failed (${response.status}): ${errorBody.error?.message ?? response.statusText}`
    );
  }
}

/**
 * WhoAmI — verify connectivity and get org info.
 */
export async function whoAmI(
  ctx: DeploymentContext,
  isDryRun: boolean
): Promise<WhoAmIResponse> {
  return apiGet<WhoAmIResponse>(ctx, "WhoAmI", isDryRun);
}

/**
 * Query a collection with OData filter.
 */
export async function queryCollection<T>(
  ctx: DeploymentContext,
  entitySet: string,
  select?: string,
  filter?: string,
  isDryRun: boolean = false
): Promise<T[]> {
  const params: string[] = [];
  if (select) params.push(`$select=${select}`);
  if (filter) params.push(`$filter=${filter}`);

  const query = params.length > 0 ? `?${params.join("&")}` : "";
  const result = await apiGet<ODataCollection<T>>(ctx, `${entitySet}${query}`, isDryRun);
  return result.value ?? [];
}

/**
 * Create a record and return its ID.
 */
export async function createRecord(
  ctx: DeploymentContext,
  entitySet: string,
  data: GenericRecord,
  isDryRun: boolean
): Promise<string | null> {
  const result = await apiPost<ODataEntity>(ctx, entitySet, data, isDryRun);
  if (!result) return null;

  // Extract ID from the first property ending in 'id'
  const idKey = Object.keys(result).find(
    (k) => k.endsWith("id") && !k.startsWith("@")
  );
  return idKey ? (result[idKey] as string) : null;
}

/**
 * Grant access to a record for a team.
 */
export async function grantAccess(
  ctx: DeploymentContext,
  payload: GrantAccessPayload,
  isDryRun: boolean
): Promise<void> {
  await apiPost(ctx, "GrantAccess", payload, isDryRun);
}
