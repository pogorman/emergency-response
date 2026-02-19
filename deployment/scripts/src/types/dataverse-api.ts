/**
 * Dataverse Web API response types.
 * Covers the subset of the API used by deployment scripts.
 */

/** Standard OData collection response */
export interface ODataCollection<T> {
  readonly "@odata.context"?: string;
  readonly "@odata.count"?: number;
  readonly "@odata.nextLink"?: string;
  readonly value: T[];
}

/** Standard OData single-entity response */
export interface ODataEntity {
  readonly "@odata.context"?: string;
  readonly "@odata.etag"?: string;
  readonly [key: string]: unknown;
}

/** Dataverse environment metadata */
export interface EnvironmentMetadata {
  readonly organizationid: string;
  readonly uniquename: string;
  readonly friendlyname: string;
  readonly version: string;
  readonly isgovernmentcloud: boolean;
  readonly isauditenabled: boolean;
  readonly environmenttype: string;
  readonly region: string;
}

/** Solution record */
export interface SolutionRecord {
  readonly solutionid: string;
  readonly uniquename: string;
  readonly friendlyname: string;
  readonly version: string;
  readonly ismanaged: boolean;
  readonly installedon: string;
}

/** Business Unit record */
export interface BusinessUnitRecord {
  readonly businessunitid: string;
  readonly name: string;
  readonly parentbusinessunitid?: string;
  readonly isdisabled: boolean;
}

/** Team record */
export interface TeamRecord {
  readonly teamid: string;
  readonly name: string;
  readonly teamtype: number;
  readonly businessunitid: string;
  readonly isdefault: boolean;
}

/** Security role record */
export interface SecurityRoleRecord {
  readonly roleid: string;
  readonly name: string;
  readonly businessunitid: string;
}

/** Environment variable definition */
export interface EnvVarDefinitionRecord {
  readonly environmentvariabledefinitionid: string;
  readonly schemaname: string;
  readonly displayname: string;
  readonly type: number;
  readonly defaultvalue?: string;
}

/** Environment variable value */
export interface EnvVarValueRecord {
  readonly environmentvariablevalueid: string;
  readonly value: string;
  readonly _environmentvariabledefinitionid_value: string;
}

/** Connection reference record */
export interface ConnectionReferenceRecord {
  readonly connectionreferenceid: string;
  readonly connectionreferencelogicalname: string;
  readonly connectionid?: string;
}

/** Field security profile record */
export interface FieldSecurityProfileRecord {
  readonly fieldsecurityprofileid: string;
  readonly name: string;
}

/** System user record */
export interface SystemUserRecord {
  readonly systemuserid: string;
  readonly fullname: string;
  readonly internalemailaddress: string;
  readonly businessunitid: string;
  readonly isdisabled: boolean;
}

/** Generic entity record for sample data import */
export interface GenericRecord {
  readonly [key: string]: unknown;
}

/** API error response */
export interface DataverseApiError {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly innererror?: {
      readonly message: string;
      readonly type: string;
      readonly stacktrace: string;
    };
  };
}

/** Batch request item */
export interface BatchRequestItem {
  readonly method: "GET" | "POST" | "PATCH" | "DELETE";
  readonly url: string;
  readonly body?: unknown;
  readonly headers?: Record<string, string>;
}

/** Import solution async operation */
export interface AsyncOperationRecord {
  readonly asyncoperationid: string;
  readonly name: string;
  readonly statuscode: number;
  readonly message?: string;
  readonly completedon?: string;
}

/** GrantAccess request payload */
export interface GrantAccessPayload {
  readonly Target: {
    readonly "@odata.type": string;
    readonly [key: string]: string;
  };
  readonly PrincipalAccess: {
    readonly Principal: {
      readonly "@odata.type": string;
      readonly teamid: string;
    };
    readonly AccessMask: string;
  };
}

/** WhoAmI response */
export interface WhoAmIResponse {
  readonly BusinessUnitId: string;
  readonly UserId: string;
  readonly OrganizationId: string;
}
