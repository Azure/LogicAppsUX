import { HostService, getAllConnectorProperties, isBuiltInConnectorId, isCustomConnectorId, isString } from '@microsoft/logic-apps-shared';
import type { Connector, OperationApi } from '@microsoft/logic-apps-shared';

export const isBuiltInConnector = (connector: Connector | OperationApi | string): boolean => {
  const hostIsBuiltInConnectorFn = HostService()?.isBuiltInConnector;
  if (hostIsBuiltInConnectorFn) {
    const connectorParameter = isString(connector) ? connector : getAllConnectorProperties(connector);
    return hostIsBuiltInConnectorFn(connectorParameter);
  }

  const connectorId = isString(connector) ? connector : connector.id;
  return isBuiltInConnectorId(connectorId);
};

export const isCustomConnector = (connector: Connector | OperationApi | string): boolean => {
  const hostIsCustomConnectorFn = HostService()?.isCustomConnector;
  if (hostIsCustomConnectorFn) {
    const connectorParameter = isString(connector) ? connector : getAllConnectorProperties(connector);
    return hostIsCustomConnectorFn(connectorParameter);
  }

  const connectorId = isString(connector) ? connector : connector.id;
  return isCustomConnectorId(connectorId);
};
