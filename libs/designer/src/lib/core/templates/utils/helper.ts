import { type Template, isArmResourceId, isUndefinedOrEmptyString } from '@microsoft/logic-apps-shared';
import type { AppDispatch } from '../../../core';
import { overviewTab } from '../../../ui/panel/templatePanel/quickViewPanel/tabs/overviewTab';
import { workflowTab } from '../../../ui/panel/templatePanel/quickViewPanel/tabs/workflowTab';
import type { IntlShape } from 'react-intl';
import type { FilterObject } from '@microsoft/designer-ui';

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

export const getFilteredTemplates = (
  templates: Record<string, Template.Manifest>,
  filters: {
    keyword?: string;
    connectors?: FilterObject[];
    detailFilters: Record<string, FilterObject[]>;
  }
) => {
  const hello = Object.entries(templates).filter(([_key, templateManifest]) => {
    const hasKeyword =
      !filters.keyword ||
      (!isUndefinedOrEmptyString(filters.keyword) &&
        (templateManifest.title.includes(filters.keyword) || templateManifest.description.includes(filters.keyword)));

    if (!hasKeyword) {
      return false;
    }
    const hasConnectors =
      filters?.connectors?.some((connector) =>
        Object.values(templateManifest.connections)?.some((connection) => {
          const connectiorIdArray = connection.connectorId.split('/');
          return connector.value === connectiorIdArray[connectiorIdArray.length - 1];
        })
      ) ?? true;

    if (!hasConnectors) {
      return false;
    }

    const hasDetailFilters = Object.entries(filters.detailFilters).every(([filterName, filterItems]) => {
      const templateManifestDetailValue = templateManifest.details?.[filterName];
      if (!templateManifestDetailValue) {
        return true;
      }
      return filterItems.some((filterItem) => templateManifestDetailValue.includes(filterItem.value));
    });
    return hasDetailFilters;
  });

  const res = Object.fromEntries(hello);

  return res;
};
