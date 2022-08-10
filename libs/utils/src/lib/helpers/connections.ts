import { equals, getPropertyValue } from './functions';

const BUILT_IN_CONNECTOR_IDS = {
  APIMANAGEMENT: 'connectionProviders/apimanagement',
  APPSERVICES: 'connectionProviders/appservice',
  FUNCTION: 'connectionProviders/function',
  WORKFLOW: 'connectionProviders/workflow',
  BATCH_GROUP: 'connectionProviders/batch',
  BUTTON_GROUP: 'connectionProviders/buttonGroup',
  CONTROL_GROUP: 'connectionProviders/control',
  DATA_OPERATIONS_GROUP: 'connectionProviders/dataOperation',
  DATETIME_GROUP: 'connectionProviders/datetime',
  GEOFENCE_GROUP: 'connectionProviders/geofenceGroup',
  HTTP_GROUP: 'connectionProviders/http',
  INTEGRATION_ACCOUNT_GROUP: 'connectionProviders/integrationAccount',
  POWERAPPS_GROUP: 'connectionProviders/powerappsGroup',
  REQUEST_RESPONSE_GROUP: 'connectionProviders/request',
  SCHEDULE_GROUP: 'connectionProviders/schedule',
  TEAMS_GROUP: 'connectionProviders/teams',
  VARIABLE_GROUP: 'connectionProviders/variable',
  VIRTUALAGENT_GROUP: 'connectionProviders/virtualagentGroup',
};

export function isBuiltInConnector(connectorId: string): boolean {
  return (
    Object.keys(BUILT_IN_CONNECTOR_IDS).some((c) => equals(getPropertyValue(BUILT_IN_CONNECTOR_IDS, c), connectorId)) ||
    isBuiltInSwaggerConnector(connectorId)
  );
}

const BUILT_IN_SWAGGER_CONNECTOR_IDS = {
  FLAT_FILE_GROUP: 'connectionProviders/flatFile',
  LIQUID_GROUP: 'connectionProviders/liquid',
  XML_GROUP: 'connectionProviders/xml',
};

export function isBuiltInSwaggerConnector(connectorId: string): boolean {
  return Object.keys(BUILT_IN_SWAGGER_CONNECTOR_IDS).some((c) => equals(getPropertyValue(BUILT_IN_SWAGGER_CONNECTOR_IDS, c), connectorId));
}
