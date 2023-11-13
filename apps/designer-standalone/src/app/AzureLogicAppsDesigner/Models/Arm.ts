export interface ManagedIdentityData {
  clientId: string;
  principalId: string;
}

export const ResourceIdentityType = {
  SYSTEM_ASSIGNED: 'SystemAssigned',
  USER_ASSIGNED: 'UserAssigned',
  SYSTEM_ASSIGNED_USER_ASSIGNED: 'SystemAssigned, UserAssigned',
  NONE: 'None',
};
export type ResourceIdentityType = (typeof ResourceIdentityType)[keyof typeof ResourceIdentityType];

export interface ManagedIdentity {
  type: ResourceIdentityType;
  tenantId?: string;
  principalId?: string;
  userAssignedIdentities?: Record<string, ManagedIdentityData>;
}

export interface ArmResource<TProperties> {
  id: string;
  name: string;
  type: string;
  kind?: string;
  location: string;
  identity?: ManagedIdentity;
  properties: TProperties;
}

export interface ArmResources<TResource> {
  value: TResource[];
  nextLink?: string;
}

export interface ArmError {
  error: ArmErrorInfo;
}

export interface ArmErrorInfo {
  message: string;
  details?: { message: string }[];
}
