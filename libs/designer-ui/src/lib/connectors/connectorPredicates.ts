import type { IsConnectorFn } from '@microsoft/designer-client-services-logic-apps';
import { HostService } from '@microsoft/designer-client-services-logic-apps';
import { isBuiltInConnectorId, isCustomConnectorId, isString } from '@microsoft/logic-apps-shared';

export const isBuiltInConnector: IsConnectorFn = (connector) => {
  const hostIsBuiltInConnectorFn = HostService()?.isBuiltInConnector;
  if (hostIsBuiltInConnectorFn) {
    return hostIsBuiltInConnectorFn(connector);
  }

  const connectorId = isString(connector) ? connector : connector.id;
  return isBuiltInConnectorId(connectorId);
};

export const isCustomConnector: IsConnectorFn = (connector) => {
  const hostIsCustomConnectorFn = HostService()?.isCustomConnector;
  if (hostIsCustomConnectorFn) {
    return hostIsCustomConnectorFn(connector);
  }

  const connectorId = isString(connector) ? connector : connector.id;
  return isCustomConnectorId(connectorId);
};
