#!/usr/bin/env node
/**
 * Load sample data into a live Dataverse environment.
 * Uses raw device-code OAuth flow (no @azure/identity dependency).
 *
 * Usage:
 *   npx tsx load-sample-data.ts --url https://org.crm9.dynamics.com --tenant-id <guid>
 *   npx tsx load-sample-data.ts --url ... --tenant-id ... --dry-run
 *   npx tsx load-sample-data.ts --url ... --tenant-id ... --commercial
 *   npx tsx load-sample-data.ts --url ... --tenant-id ... --entity seo_Hydrant
 */

import { parseArgs } from "node:util";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { readSpecs } from "./lib/spec-reader.js";
import { importSampleData } from "./lib/data-loader.js";
import type { DataverseClient } from "./lib/auth.js";

// ── CLI Args ───────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    url: { type: "string" },
    "tenant-id": { type: "string" },
    "dry-run": { type: "boolean", default: false },
    commercial: { type: "boolean", default: false },
    entity: { type: "string" },
  },
  strict: true,
});

if (!values.url || !values["tenant-id"]) {
  console.error(
    "Usage: npx tsx load-sample-data.ts --url <env-url> --tenant-id <guid> [--dry-run] [--commercial] [--entity seo_TableName]",
  );
  process.exit(1);
}

const dryRun = values["dry-run"] ?? false;
const isCommercial = values.commercial ?? false;
const entityFilter = values.entity ?? null;
const envUrl = values.url!.replace(/\/+$/, "");
const tenantId = values["tenant-id"]!;

// ── Resolve project root ───────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// ── Raw device-code auth (no @azure/identity) ──────────────────────────

const DYNAMICS_CLIENT_ID = "51f81489-12ee-4a9e-aaae-a2591f45987d";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

let cachedToken: { token: string; expiresAt: number; refreshToken: string } | null = null;

async function getDeviceCodeToken(): Promise<TokenResponse> {
  const authorityHost = isCommercial
    ? "https://login.microsoftonline.com"
    : "https://login.microsoftonline.us";
  const tokenEndpoint = `${authorityHost}/${tenantId}/oauth2/v2.0/token`;
  const deviceCodeEndpoint = `${authorityHost}/${tenantId}/oauth2/v2.0/devicecode`;
  const scope = `${envUrl}/.default offline_access`;

  // Step 1: Request device code
  const dcRes = await fetch(deviceCodeEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: DYNAMICS_CLIENT_ID, scope }),
  });
  if (!dcRes.ok) {
    const err = await dcRes.text();
    throw new Error(`Device code request failed: ${dcRes.status} ${err}`);
  }
  const dcData = (await dcRes.json()) as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    message: string;
    interval: number;
    expires_in: number;
  };

  console.log(`\n${dcData.message}\n`);

  // Step 2: Poll for token
  const interval = (dcData.interval || 5) * 1000;
  const deadline = Date.now() + dcData.expires_in * 1000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval));

    const tokenRes = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DYNAMICS_CLIENT_ID,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: dcData.device_code,
      }),
    });

    const tokenData = (await tokenRes.json()) as Record<string, unknown>;

    if (tokenData.error === "authorization_pending") continue;
    if (tokenData.error === "slow_down") {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    if (tokenData.error) {
      throw new Error(`Token error: ${tokenData.error} — ${tokenData.error_description}`);
    }

    return tokenData as unknown as TokenResponse;
  }

  throw new Error("Device code expired before user authenticated.");
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const authorityHost = isCommercial
    ? "https://login.microsoftonline.com"
    : "https://login.microsoftonline.us";
  const tokenEndpoint = `${authorityHost}/${tenantId}/oauth2/v2.0/token`;

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: DYNAMICS_CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: `${envUrl}/.default offline_access`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${err}`);
  }

  return (await res.json()) as TokenResponse;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  let tokenData: TokenResponse;
  if (cachedToken?.refreshToken) {
    try {
      tokenData = await refreshAccessToken(cachedToken.refreshToken);
    } catch {
      tokenData = await getDeviceCodeToken();
    }
  } else {
    tokenData = await getDeviceCodeToken();
  }

  cachedToken = {
    token: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };

  return cachedToken.token;
}

function buildClient(): DataverseClient {
  const baseUrl = `${envUrl}/api/data/v9.2`;

  const dvFetch = async (urlPath: string, options: RequestInit = {}): Promise<Response> => {
    const token = await getAccessToken();
    const url = urlPath.startsWith("http") ? urlPath : `${baseUrl}${urlPath}`;
    const headers = new Headers(options.headers as HeadersInit);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("OData-MaxVersion", "4.0");
    headers.set("OData-Version", "4.0");
    headers.set("Accept", "application/json");
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json; charset=utf-8");
    }
    if (!headers.has("Prefer")) {
      headers.set("Prefer", "return=representation");
    }
    return fetch(url, { ...options, headers });
  };

  return { fetch: dvFetch, envUrl, baseUrl };
}

// ── Entity set name query ──────────────────────────────────────────────

async function getEntitySetNames(
  client: DataverseClient,
  schemaNames: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  // Query by LogicalName (lowercase) in batches — more reliable than SchemaName
  for (let i = 0; i < schemaNames.length; i += 10) {
    const batch = schemaNames.slice(i, i + 10);
    const filter = batch.map((n) => `LogicalName eq '${n.toLowerCase()}'`).join(" or ");
    const url = `/EntityDefinitions?$select=SchemaName,LogicalName,EntitySetName&$filter=${encodeURIComponent(filter)}`;

    const res = await client.fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`  WARNING: EntityDefinitions query failed: ${res.status} ${errText}`);
      // Try one at a time as fallback
      for (const name of batch) {
        const singleUrl = `/EntityDefinitions(LogicalName='${name.toLowerCase()}')?$select=SchemaName,EntitySetName`;
        const singleRes = await client.fetch(singleUrl);
        if (singleRes.ok) {
          const entity = (await singleRes.json()) as { SchemaName: string; EntitySetName: string };
          map.set(name, entity.EntitySetName);
        }
      }
      continue;
    }
    const data = (await res.json()) as {
      value: Array<{ SchemaName: string; LogicalName: string; EntitySetName: string }>;
    };
    for (const entity of data.value) {
      // Find matching spec name
      const specName = schemaNames.find((n) => n.toLowerCase() === entity.LogicalName);
      if (specName) {
        map.set(specName, entity.EntitySetName);
      }
    }
  }

  return map;
}

// ── Main ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startTime = Date.now();

  if (dryRun) {
    console.log("=== DRY RUN MODE — no changes will be made ===\n");
  }

  // Step 1: Read specs
  console.log("Step 1: Reading project specs...");
  const specs = readSpecs(projectRoot);
  console.log(`  ${specs.tables.length} tables, ${specs.sampleData.size} sample data files`);

  const totalRecords = Array.from(specs.sampleData.values()).reduce(
    (sum, f) => sum + f.records.length,
    0,
  );
  console.log(`  ${totalRecords} total records to import`);

  // Step 2: Authenticate
  console.log("\nStep 2: Authenticating via device code...");
  await getAccessToken();
  console.log("  Authenticated successfully.");

  const client = buildClient();

  // Step 3: WhoAmI
  console.log("\nStep 3: Verifying connectivity...");
  const res = await client.fetch("/WhoAmI");
  if (!res.ok) {
    throw new Error(`WhoAmI failed: ${res.status} ${await res.text()}`);
  }
  const whoAmI = (await res.json()) as { UserId: string; OrganizationId: string };
  console.log(`  User: ${whoAmI.UserId}`);
  console.log(`  Org:  ${whoAmI.OrganizationId}`);

  // Step 4: Get entity set names
  console.log("\nStep 4: Retrieving entity set names...");
  const entitySetMap = await getEntitySetNames(
    client,
    specs.tables.map((t) => t.schemaName),
  );
  console.log(`  Retrieved ${entitySetMap.size} entity set names.`);

  if (entitySetMap.size === 0) {
    throw new Error("No entity set names found — are the tables deployed?");
  }

  // Show mapping for verification
  for (const [schema, entitySet] of entitySetMap) {
    console.log(`    ${schema} → ${entitySet}`);
  }

  // Step 5: Import sample data
  console.log("\nStep 5: Importing sample data...");
  await importSampleData(client, specs, entitySetMap, dryRun, entityFilter);

  // Done
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Sample data import complete in ${elapsed}s.`);
  console.log(`${"=".repeat(60)}`);
}

main().catch((err) => {
  console.error("\nFATAL ERROR:", err instanceof Error ? err.message : err);
  process.exit(1);
});
