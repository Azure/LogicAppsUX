import type { ManagedIdentity } from '../models';
import { ResourceIdentityType } from '../models';
import { equals } from './functions';

export function isArmResourceId(resourceId: string): boolean {
  return resourceId ? resourceId.startsWith('/subscriptions/') : false;
}

export const isBuiltInConnector = (connectorId: string) => {
  // NOTE(lakshmia): connectorId format: connectionProviders/{connector}
  const fields = connectorId.split('/');
  if (fields.length !== 2) return false;
  return equals(fields[0], 'connectionProviders');
};

export const isCustomConnector = (connectorId: string) => {
  // NOTE(lakshmia): connectorId format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/customApis/{connector}
  const fields = connectorId.split('/');
  if (fields.length !== 9) return false;

  if (!equals(fields[1], 'subscriptions')) return false;
  if (!equals(fields[3], 'resourcegroups')) return false;
  if (!equals(fields[5], 'providers')) return false;
  if (!equals(fields[6], 'microsoft.web')) return false;
  if (!equals(fields[7], 'customApis')) return false;

  return true;
};

export const isIsManagedConnector = (connectorId: string) => {
  // NOTE(lakshmia): connectorId format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/integrationServiceEnvironments/{ise}/managedApis/{connector}
  const fields = connectorId.split('/');
  if (fields.length !== 11) return false;

  if (!equals(fields[1], 'subscriptions')) return false;
  if (!equals(fields[3], 'resourcegroups')) return false;
  if (!equals(fields[5], 'providers')) return false;
  if (!equals(fields[6], 'microsoft.logic')) return false;
  if (!equals(fields[7], 'integrationserviceenvironments')) return false;
  if (!equals(fields[9], 'managedapis')) return false;

  return true;
};

export const isSharedManagedConnector = (connectorId: string) => {
  // NOTE(lakshmia): connectorId format: /subscriptions/{sub}/providers/Microsoft.Web/locations/{location}/managedApis/{connector}
  const fields = connectorId.split('/');
  if (fields.length !== 9) return false;

  if (!equals(fields[1], 'subscriptions')) return false;
  if (!equals(fields[3], 'providers')) return false;
  if (!equals(fields[4], 'microsoft.web')) return false;
  if (!equals(fields[5], 'locations')) return false;
  if (!equals(fields[7], 'managedapis')) return false;

  return true;
};

export const getUniqueName = (keys: string[], prefix: string): { name: string; index: number } => {
  const set = new Set(keys.map((name) => name.split('::')[0]));

  let index = 1;
  let name = prefix;
  while (set.has(name)) {
    name = `${prefix}-${++index}`;
  }

  return { name, index };
};

export const isIdentityAssociatedWithLogicApp = (managedIdentity: ManagedIdentity | undefined): boolean => {
  return (
    !!managedIdentity &&
    (equals(managedIdentity.type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED) ||
      equals(managedIdentity.type, ResourceIdentityType.SYSTEM_ASSIGNED) ||
      (equals(managedIdentity.type, ResourceIdentityType.USER_ASSIGNED) &&
        !!managedIdentity.userAssignedIdentities &&
        Object.keys(managedIdentity.userAssignedIdentities).length > 0))
  );
};
