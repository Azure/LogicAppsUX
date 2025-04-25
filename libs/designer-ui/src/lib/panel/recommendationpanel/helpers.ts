import type { DiscoveryOperation, DiscoveryResultTypes, OperationRuntimeCategory } from '@microsoft/logic-apps-shared';
import { getIntl } from '@microsoft/logic-apps-shared';
import { getConnectorCategoryString } from '../../utils';
import { isBuiltInConnector, isCustomConnector } from '../../connectors';
import type { OperationActionData } from './interfaces';

export const getDefaultRuntimeCategories = (): OperationRuntimeCategory[] => {
  const intl = getIntl();

  const all = intl.formatMessage({
    defaultMessage: 'All',
    id: '4mxRH9',
    description: 'Filter by All category of connectors',
  });

  const builtIn = intl.formatMessage({
    defaultMessage: 'Built-in',
    id: 'Vq9q5J',
    description: 'Filter by In App category of connectors',
  });

  const shared = intl.formatMessage({
    defaultMessage: 'Shared',
    id: '00xlpa',
    description: 'Filter by Shared category of connectors',
  });

  const custom = intl.formatMessage({
    defaultMessage: 'Custom',
    id: 'byTBrn',
    description: 'Filter by Custom category of connectors',
  });

  return [
    {
      key: 'all',
      text: all,
    },
    {
      key: 'inapp',
      text: builtIn,
    },
    {
      key: 'shared',
      text: shared,
    },
    {
      key: 'custom',
      text: custom,
    },
  ];
};

export const getShouldUseSingleColumn = (clientWidth?: number): boolean => (clientWidth ?? 0) < 560;

export const getListHeight = (isSingleColumn: boolean): number => (isSingleColumn ? 800 : 400);

export const getOperationCardDataFromOperation = (operation: DiscoveryOperation<DiscoveryResultTypes>): OperationActionData => {
  const { id, properties } = operation;
  const { summary: title, description, api, trigger, annotation } = properties;

  return {
    id,
    title,
    description,
    brandColor: api.brandColor,
    iconUri: api.iconUri,
    connectorName: api.displayName,
    category: getConnectorCategoryString(api),
    isTrigger: !!trigger,
    isBuiltIn: isBuiltInConnector(api),
    isCustom: isCustomConnector(api),
    apiId: api.id,
    releaseStatus: annotation?.status,
  };
};

export const filterOperationData = (data: OperationActionData, filters?: Record<string, string>): boolean => {
  const actionType = filters?.['actionType'];
  if (!actionType) {
    return true;
  }
  if (actionType === 'actions') {
    return !data.isTrigger;
  }
  if (actionType === 'triggers') {
    return !!data.isTrigger;
  }
  return true;
};
