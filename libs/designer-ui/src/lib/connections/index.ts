import { HostService } from '@microsoft/designer-client-services-logic-apps';
import { isBuiltInConnector, isCustomConnector } from '@microsoft/logic-apps-shared';

export const isDesignerBuiltInConnector: typeof isBuiltInConnector = (connectorId) => {
  const isBuiltInConnectorFn = HostService()?.isBuiltInConnector ?? isBuiltInConnector;
  return isBuiltInConnectorFn(connectorId);
};

export const isDesignerCustomConnector: typeof isCustomConnector = (connectorId) => {
  const isCustomConnectorFn = HostService()?.isCustomConnector ?? isCustomConnector;
  return isCustomConnectorFn(connectorId);
};
