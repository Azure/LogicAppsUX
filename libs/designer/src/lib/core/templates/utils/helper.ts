import { type Template, isArmResourceId } from '@microsoft/logic-apps-shared';
import type { AppDispatch } from '../../../core';
import { overviewTab } from '../../../ui/panel/templatePanel/quickViewPanel/tabs/overviewTab';
import { workflowTab } from '../../../ui/panel/templatePanel/quickViewPanel/tabs/workflowTab';
import type { IntlShape } from 'react-intl';

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

const normalizeConnectorId = (connectorId: string, subscriptionId: string, location: string) => {
  if (!isArmResourceId(connectorId)) {
    return connectorId;
  }

  const result = connectorId.replaceAll('#subscription#', subscriptionId);
  return result.replaceAll('#location#', location);
};
