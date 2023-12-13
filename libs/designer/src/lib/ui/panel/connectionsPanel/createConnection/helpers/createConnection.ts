import { getUniqueConnectionName } from '../../../../../core/queries/connections';
import { getConnectionParametersForAzureConnection } from '../../../../../core/utils/connectors/connections';
import type { ConnectionCreationInfo, ConnectionParametersMetadata } from '@microsoft/designer-client-services-logic-apps';
import { ConnectionService } from '@microsoft/designer-client-services-logic-apps';
import type { AssistedConnectionProps } from '@microsoft/designer-ui';
import type {
  ConnectionMetadata,
  ConnectionParameterSet,
  ConnectionParameterSetValues,
  Connector,
  OperationManifest,
} from '@microsoft/utils-logic-apps';

interface CreateConnectionProps {
  connector: Connector;
  displayName?: string;
  selectedParameterSet?: ConnectionParameterSet;
  parameterValues: Record<string, any>;
  isOAuthConnection?: boolean;
  alternativeParameterValues?: Record<string, any>;
  assistedConnectionProps?: AssistedConnectionProps;
  operationManifest?: OperationManifest;
  connectionMetadata?: ConnectionMetadata;
  selectedSubResource?: string;
}

export const createConnection = async ({
  connector,
  displayName,
  selectedParameterSet,
  parameterValues,
  isOAuthConnection,
  alternativeParameterValues,
  assistedConnectionProps,
  operationManifest,
  connectionMetadata,
  selectedSubResource,
}: CreateConnectionProps) => {
  let outputParameterValues = parameterValues;

  if (selectedParameterSet) {
    const requiredParameters = Object.entries(selectedParameterSet?.parameters)?.filter(
      ([, parameter]) => parameter?.uiDefinition?.constraints?.required === 'true'
    );
    requiredParameters?.forEach(([key, parameter]) => {
      if (!outputParameterValues?.[key]) {
        outputParameterValues[key] = parameter?.uiDefinition?.constraints?.default;
      }
    });
  }

  // Assign connection parameters from resource selector experience
  if (assistedConnectionProps) {
    const assistedParams = await getConnectionParametersForAzureConnection(
      operationManifest?.properties.connection?.type,
      selectedSubResource
    );
    outputParameterValues = { ...outputParameterValues, ...assistedParams };
  }

  // If oauth, find the oauth parameter and assign the redirect url
  if (isOAuthConnection && selectedParameterSet) {
    const oAuthParameter = Object.entries(selectedParameterSet?.parameters).find(
      ([_, parameter]) => !!parameter?.oAuthSettings?.redirectUrl
    );
    if (oAuthParameter) {
      const oAuthParameterKey = oAuthParameter?.[0];
      const oAuthParameterObj = oAuthParameter?.[1];
      const redirectUrl = oAuthParameterObj?.oAuthSettings?.redirectUrl;
      outputParameterValues[oAuthParameterKey] = redirectUrl;
    }
  }

  const connectionParameterSetValues: ConnectionParameterSetValues = {
    name: selectedParameterSet?.name ?? '',
    values: Object.keys(outputParameterValues).reduce((acc: any, key) => {
      // eslint-disable-next-line no-param-reassign
      acc[key] = { value: outputParameterValues[key] };
      return acc;
    }, {}),
  };

  const connectionInfo: ConnectionCreationInfo = {
    displayName,
    connectionParametersSet: selectedParameterSet ? connectionParameterSetValues : undefined,
    connectionParameters: outputParameterValues,
    alternativeParameterValues,
  };

  const parametersMetadata: ConnectionParametersMetadata = {
    connectionMetadata: connectionMetadata,
    connectionParameterSet: selectedParameterSet,
    connectionParameters: selectedParameterSet?.parameters ?? connector?.properties.connectionParameters,
  };

  let connection, error;

  const newName = await getUniqueConnectionName(connector.id);
  if (isOAuthConnection) {
    await ConnectionService()
      .createAndAuthorizeOAuthConnection(newName, connector?.id ?? '', connectionInfo, parametersMetadata)
      .then(({ connection: c, errorMessage }) => {
        connection = c;
        error = errorMessage;
      })
      .catch((errorMessage) => (error = errorMessage));
  } else {
    await ConnectionService()
      .createConnection(newName, connector, connectionInfo, parametersMetadata)
      .then((c) => (connection = c))
      .catch((errorMessage) => (error = errorMessage));
  }

  return { connection, error };
};
