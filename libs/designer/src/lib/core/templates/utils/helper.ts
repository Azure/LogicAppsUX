import { type Template, isArmResourceId } from '@microsoft/logic-apps-shared';
import type { AppDispatch } from '../../../core';
import { overviewTab } from '../../../ui/panel/templatePanel/quickViewPanel/tabs/overviewTab';
import { workflowTab } from '../../../ui/panel/templatePanel/quickViewPanel/tabs/workflowTab';
import type { IntlShape } from 'react-intl';
import type { FilterObject } from '@microsoft/designer-ui';
import Fuse from 'fuse.js';

export const getQuickViewTabs = (intl: IntlShape, dispatch: AppDispatch) => {
  return [workflowTab(intl, dispatch), overviewTab(intl, dispatch)];
};

export const getUniqueConnectors = (
  connections: Record<string, Template.Connection>,
  subscriptionId: string,
  location: string
): Template.Connection[] => {
  const result: Template.Connection[] = [];
  const finalConnectorIds: string[] = [];
  const allConnections = Object.values(connections);

  while (allConnections.length > 0) {
    const connection = allConnections.shift() as Template.Connection;
    const normalizedConnectorId = normalizeConnectorId(connection.connectorId, subscriptionId, location).toLowerCase();
    if (!finalConnectorIds.includes(normalizedConnectorId)) {
      result.push({ ...connection, connectorId: normalizedConnectorId });
    }
  }

  return result;
};

export const normalizeConnectorId = (connectorId: string, subscriptionId: string, location: string) => {
  if (!isArmResourceId(connectorId)) {
    return connectorId;
  }

  const result = connectorId.replaceAll('#subscription#', subscriptionId);
  return result.replaceAll('#location#', location);
};

const templateSearchOptions = {
  isCaseSensitive: false,
  includeScore: false,
  threshold: 0,
  ignoreLocation: true,
  keys: [
    'title',
    'description',
    {
      name: 'manifest',
      weight: 2,
      getFn: ([_name, template]: [string, Template.Manifest]) => [
        ...template.skus,
        ...(template.tags ?? []),
        ...(template.kinds ?? []),
        ...Object.values(template.details),
      ],
    },
    {
      name: 'parameters',
      weight: 3,
      getFn: ([_name, template]: [string, Template.Manifest]) =>
        template.parameters?.reduce((acc: string[], parameter) => acc.concat([parameter.displayName, parameter.description]), []),
    },
    {
      name: 'connections',
      weight: 3,
      getFn: ([_name, template]: [string, Template.Manifest]) =>
        template.connections
          ? Object.values(template.connections)?.reduce(
              (acc: string[], connection) => acc.concat([connection.connectorId.split('/').slice(-1)[0]]),
              []
            )
          : [],
    },
  ],
};

export const getFilteredTemplates = (
  templates: Record<string, Template.Manifest>,
  filters: {
    keyword?: string;
    connectors?: FilterObject[];
    detailFilters: Record<string, FilterObject[]>;
  },
  isConsumption: boolean
): string[] => {
  const filteredTemplateEntries = Object.entries(templates).filter(([_templateName, templateManifest]) => {
    if (!templateManifest.skus.includes(isConsumption ? 'consumption' : 'standard')) {
      return false;
    }

    const hasConnectors =
      filters?.connectors?.some((connector) =>
        Object.values(templateManifest.connections)?.some(
          (connection) => connector.value === connection.connectorId.split('/').slice(-1)[0]
        )
      ) ?? true;

    if (!hasConnectors) {
      return false;
    }

    const hasDetailFilters = Object.entries(filters.detailFilters).every(([filterName, filterItems]) => {
      const templateManifestDetailValue = templateManifest.details?.[filterName];
      if (!templateManifestDetailValue) {
        return false;
      }
      return filterItems.some((filterItem) => filterItem.value === templateManifestDetailValue);
    });
    return hasDetailFilters;
  });

  if (!filters.keyword) {
    return Object.keys(Object.fromEntries(filteredTemplateEntries));
  }

  const fuse = new Fuse(filteredTemplateEntries, templateSearchOptions);
  const searchedTemplateNames = fuse.search(filters.keyword).map(({ item }) => item[0]);

  return searchedTemplateNames;
};

export const getConnectorResources = (intl: IntlShape) => {
  return {
    connected: intl.formatMessage({
      defaultMessage: 'Connected',
      id: 'oOGTSo',
      description: 'Connected text',
    }),
    notConnected: intl.formatMessage({
      defaultMessage: 'Not Connected',
      id: '3HrFPS',
      description: 'Not Connected text',
    }),
  };
};
