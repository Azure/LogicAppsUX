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

export const getLogicalCategories = (): OperationRuntimeCategory[] => {
  const intl = getIntl();

  const all = intl.formatMessage({
    defaultMessage: 'All',
    id: '4mxRH9',
    description: 'Filter by All category of connectors',
  });

  const aiAgent = intl.formatMessage({
    defaultMessage: 'AI Agent',
    id: 'cQ/Ocu',
    description: 'Filter by AI Agent category of connectors',
  });

  const actionInApp = intl.formatMessage({
    defaultMessage: 'Action in an app',
    id: 'FF5p6Q',
    description: 'Filter by Action in an app category of connectors',
  });

  const dataTransformation = intl.formatMessage({
    defaultMessage: 'Data transformation',
    id: 'tfuHEQ',
    description: 'Filter by Data transformation category of connectors',
  });

  const simpleOperations = intl.formatMessage({
    defaultMessage: 'Simple Operations',
    id: 'uTTO2H',
    description: 'Filter by Simple Operations category of connectors',
  });

  const humanInTheLoop = intl.formatMessage({
    defaultMessage: 'Human in the loop',
    id: 'SbIePr',
    description: 'Filter by Human in the loop category of connectors',
  });

  return [
    {
      key: 'all',
      text: all,
    },
    {
      key: 'aiAgent',
      text: aiAgent,
    },
    {
      key: 'actionInApp',
      text: actionInApp,
    },
    {
      key: 'dataTransformation',
      text: dataTransformation,
    },
    {
      key: 'simpleOperations',
      text: simpleOperations,
    },
    {
      key: 'humanInTheLoop',
      text: humanInTheLoop,
    },
  ];
};

export const getShouldUseSingleColumn = (clientWidth?: number): boolean => (clientWidth ?? 0) < 400;

export const getListHeight = (isSingleColumn: boolean): number => (isSingleColumn ? 800 : 400);

export const getOperationCardDataFromOperation = (operation: DiscoveryOperation<DiscoveryResultTypes>): OperationActionData => {
  const { id, properties } = operation;
  const { summary: title, description, api, trigger, annotation, capabilities } = properties;

  return {
    id,
    title,
    description,
    brandColor: api.brandColor,
    iconUri: api.iconUri,
    connectorName: api.displayName,
    category: getConnectorCategoryString(api),
    isTrigger: capabilities?.includes('triggers') || !!trigger,
    isBuiltIn: isBuiltInConnector(api),
    isCustom: isCustomConnector(api),
    apiId: api.id,
    releaseStatus: annotation?.status,
  };
};

export const filterOperationData = (data: OperationActionData, filters?: Record<string, string>): boolean => {
  const actionType = filters?.['actionType'];
  if (!actionType || !data.id) {
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
