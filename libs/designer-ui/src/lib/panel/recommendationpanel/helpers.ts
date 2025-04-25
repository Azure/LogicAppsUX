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

export const getShouldUseSingleColumn = (clientWidth: number | undefined): boolean => (clientWidth ?? 0) < 560;

export const getListHeight = (isSingleColumn: boolean): number => (isSingleColumn ? 80 * 10 : 80 * 5);

export const getOperationCardDataFromOperation = (operation: DiscoveryOperation<DiscoveryResultTypes>): OperationActionData => ({
  id: operation.id,
  title: operation.properties.summary,
  description: operation.properties.description,
  brandColor: operation.properties.api.brandColor,
  iconUri: operation.properties.api.iconUri,
  connectorName: operation.properties.api.displayName,
  category: getConnectorCategoryString(operation.properties.api),
  isTrigger: !!operation.properties?.trigger,
  isBuiltIn: isBuiltInConnector(operation.properties.api),
  isCustom: isCustomConnector(operation.properties.api),
  apiId: operation.properties.api.id,
  releaseStatus: operation.properties.annotation?.status,
});

export const filterOperationData = (data: any, filters?: Record<string, string>) => {
  return (
    !filters?.['actionType'] ||
    (filters?.['actionType'] === 'actions' && !data.isTrigger) ||
    (filters?.['actionType'] === 'triggers' && data.isTrigger) ||
    data.isTrigger === undefined
  );
};
