export interface ManagedIdentityData {
  clientId: string;
  principalId: string;
}

export interface ManagedIdentity {
  type: ResourceIdentityType;
  tenantId?: string;
  principalId?: string;
  userAssignedIdentities?: Record<string, ManagedIdentityData>;
}

export enum ResourceIdentityType {
  SYSTEM_ASSIGNED = 'SystemAssigned',
  USER_ASSIGNED = 'UserAssigned',
  SYSTEM_ASSIGNED_USER_ASSIGNED = 'SystemAssigned, UserAssigned',
  NONE = 'None',
}
