import type { Connector, OperationApi } from '../../models';
import { isBuiltInConnectorId, isCustomConnectorId } from '../connections';
import { isString } from '../functions';
import { getAllConnectorProperties } from './connectorProperties';
import { HostService } from '@microsoft/designer-client-services-logic-apps';

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
