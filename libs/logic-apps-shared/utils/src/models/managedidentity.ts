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

export const ResourceIdentityType = {
  SYSTEM_ASSIGNED: 'SystemAssigned',
  USER_ASSIGNED: 'UserAssigned',
  SYSTEM_ASSIGNED_USER_ASSIGNED: 'SystemAssigned, UserAssigned',
  NONE: 'None',
};

export type ResourceIdentityType = (typeof ResourceIdentityType)[keyof typeof ResourceIdentityType];
