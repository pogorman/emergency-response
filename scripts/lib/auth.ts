import { DeviceCodeCredential, type DeviceCodeInfo } from "@azure/identity";

export interface AuthConfig {
  tenantId: string;
  envUrl: string;
  isCommercial: boolean;
}

export interface DataverseClient {
  fetch: (path: string, options?: RequestInit) => Promise<Response>;
  envUrl: string;
  baseUrl: string;
}

export async function authenticate(config: AuthConfig): Promise<DataverseClient> {
  const authorityHost = config.isCommercial
    ? "https://login.microsoftonline.com"
    : "https://login.microsoftonline.us";

  const credential = new DeviceCodeCredential({
    tenantId: config.tenantId,
    authorityHost,
    userPromptCallback: (info: DeviceCodeInfo) => {
      console.log(`\nTo sign in, open ${info.verificationUri} and enter code: ${info.userCode}\n`);
    },
  });

  // Normalize env URL — strip trailing slash
  const envUrl = config.envUrl.replace(/\/+$/, "");
  const scope = `${envUrl}/.default`;

  // Test auth by getting a token
  console.log("Authenticating via device code flow...");
  const tokenResponse = await credential.getToken(scope);
  if (!tokenResponse) {
    throw new Error("Failed to acquire token");
  }
  console.log("Authenticated successfully.");

  const baseUrl = `${envUrl}/api/data/v9.2`;

  const getToken = async (): Promise<string> => {
    const token = await credential.getToken(scope);
    return token.token;
  };

  const dvFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
    const token = await getToken();
    const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
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
