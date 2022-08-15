import { equals } from './functions';
import { getIntl } from '@microsoft-logic-apps/intl';

export const getConnectorCategoryString = (connectorId: string): string => {
  const intl = getIntl();

  const builtInText = intl.formatMessage({
    defaultMessage: 'Built-in',
    description: '"Built-in" category name',
  });
  const azureText = intl.formatMessage({
    defaultMessage: 'Azure',
    description: 'Azure name text (not sure if this changes in different languages)',
  });

  return isBuiltInConnector(connectorId) ? builtInText : azureText;
};

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
