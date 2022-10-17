import type { IConnectorService, ListDynamicValue, ManagedIdentityRequestProperties } from '../connector';
import type { IHttpClient } from '../httpClient';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { LegacyDynamicSchemaExtension, LegacyDynamicValuesExtension } from '@microsoft-logic-apps/parsers';
import { Types } from '@microsoft-logic-apps/parsers';
import type { OperationInfo } from '@microsoft-logic-apps/utils';
import {
  UnsupportedException,
  getJSONValue,
  getObjectPropertyValue,
  isArmResourceId,
  isNullOrUndefined,
  ArgumentException,
  ConnectorServiceErrorCode,
  ConnectorServiceException,
  equals,
} from '@microsoft-logic-apps/utils';
import type { IntlShape } from 'react-intl';

type GetSchemaFunction = (args: Record<string, any>) => Promise<OpenAPIV2.SchemaObject>;
type GetValuesFunction = (args: Record<string, any>) => Promise<ListDynamicValue[]>;
type GetConfigurationFunction = (connectionId: string) => Promise<Record<string, any>>;

interface StandardConnectorServiceOptions {
  apiVersion: string;
  baseUrl: string;
  httpClient: IHttpClient;
  clientSupportedOperations: OperationInfo[];
  getConfiguration: GetConfigurationFunction;
  schemaClient: Record<string, GetSchemaFunction>;
  valuesClient: Record<string, GetValuesFunction>;
  apiHubServiceDetails: {
    apiVersion: string;
    baseUrl: string;
    subscriptionId: string;
    resourceGroup: string;
  };
  workflowReferenceId: string;
}

export class StandardConnectorService implements IConnectorService {
  constructor(private readonly options: StandardConnectorServiceOptions) {
    const { apiVersion, baseUrl, httpClient, clientSupportedOperations, schemaClient, valuesClient } = options;
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    } else if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    } else if (!httpClient) {
      throw new ArgumentException('httpClient required');
    } else if (!clientSupportedOperations) {
      throw new ArgumentException('clientSupportedOperations required');
    } else if (!schemaClient) {
      throw new ArgumentException('schemaClient required');
    } else if (!valuesClient) {
      throw new ArgumentException('valuesClient required');
    }
  }

  async getLegacyDynamicValues(
    connectionId: string,
    connectorId: string,
    parameters: Record<string, any>,
    extension: LegacyDynamicValuesExtension,
    parameterArrayType: string,
    isManagedIdentityTypeConnection?: boolean,
    managedIdentityProperties?: ManagedIdentityRequestProperties
  ): Promise<ListDynamicValue[]> {
    const response = await this._executeAzureDynamicApi(
      connectionId,
      connectorId,
      parameters,
      isManagedIdentityTypeConnection,
      managedIdentityProperties
    );
    const values = getObjectPropertyValue(response, extension['value-collection'] ? extension['value-collection'].split('/') : []);
    if (values && values.length) {
      return values.map((property: any) => {
        let value: any, displayName: any;
        let isSelectable = true;

        if (parameterArrayType && parameterArrayType !== Types.Object) {
          displayName = value = getJSONValue(property);
        } else {
          value = getObjectPropertyValue(property, extension['value-path'].split('/'));
          displayName = extension['value-title'] ? getObjectPropertyValue(property, extension['value-title'].split('/')) : value;
        }

        const description = extension['value-description']
          ? getObjectPropertyValue(property, extension['value-description'].split('/'))
          : undefined;

        if (extension['value-selectable']) {
          const selectableValue = getObjectPropertyValue(property, extension['value-selectable'].split('/'));
          if (!isNullOrUndefined(selectableValue)) {
            isSelectable = selectableValue;
          }
        }

        return { value, displayName, description, disabled: !isSelectable };
      });
    }

    return response;
  }

  async getListDynamicValues(
    connectionId: string,
    connectorId: string,
    operationId: string,
    _parameterAlias: string | undefined,
    parameters: Record<string, any>,
    dynamicState: any
  ): Promise<ListDynamicValue[]> {
    const { baseUrl, apiVersion, getConfiguration, httpClient } = this.options;
    const { operationId: dynamicOperation } = dynamicState;

    const invokeParameters = this._getInvokeParameters(parameters, dynamicState);
    const configuration = await getConfiguration(connectionId);

    if (this._isClientSupportedOperation(connectorId, operationId)) {
      return this.options.valuesClient[dynamicOperation]({ parameters: invokeParameters, configuration });
    }

    const uri = `${baseUrl}/operationGroups/${connectorId.split('/').slice(-1)}/operations/${dynamicOperation}/dynamicInvoke`;
    const response = await httpClient.post({
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: { parameters: invokeParameters, configuration },
    });
    return this._getResponseFromDynamicApi(response, uri);
  }

  async getLegacyDynamicSchema(
    connectionId: string,
    connectorId: string,
    parameters: Record<string, any>,
    extension: LegacyDynamicSchemaExtension,
    isManagedIdentityTypeConnection?: boolean,
    managedIdentityProperties?: ManagedIdentityRequestProperties
  ): Promise<OpenAPIV2.SchemaObject | null> {
    const response = await this._executeAzureDynamicApi(
      connectionId,
      connectorId,
      parameters,
      isManagedIdentityTypeConnection,
      managedIdentityProperties
    );

    if (!response) {
      return null;
    }

    const schemaPath = extension['value-path'] ? extension['value-path'].split('/') : undefined;
    return schemaPath
      ? getObjectPropertyValue(
          response,
          schemaPath.length && equals(schemaPath[schemaPath.length - 1], 'properties') ? schemaPath.splice(-1, 1) : schemaPath
        ) ?? null
      : { properties: response, type: Types.Object };
  }

  async getDynamicSchema(
    connectionId: string,
    connectorId: string,
    operationId: string,
    _parameterAlias: string | undefined,
    parameters: Record<string, any>,
    dynamicState: any
  ): Promise<OpenAPIV2.SchemaObject> {
    const { baseUrl, apiVersion, getConfiguration, httpClient } = this.options;
    const {
      extension: { operationId: dynamicOperation },
      isInput,
    } = dynamicState;

    const invokeParameters = this._getInvokeParameters(parameters, dynamicState);
    const configuration = await getConfiguration(connectionId);

    if (this._isClientSupportedOperation(connectorId, operationId)) {
      return this.options.schemaClient[dynamicOperation]({ parameters: invokeParameters, isInput, configuration });
    }

    const uri = `${baseUrl}/operationGroups/${connectorId.split('/').slice(-1)}/operations/${dynamicOperation}/dynamicInvoke`;
    const response = await httpClient.post({
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: { parameters: invokeParameters, configuration },
    });
    return this._getResponseFromDynamicApi(response, uri);
  }

  private _isClientSupportedOperation(connectorId: string, operationId: string): boolean {
    return this.options.clientSupportedOperations.some(
      (operationInfo) => equals(connectorId, operationInfo.connectorId) && equals(operationId, operationInfo.operationId)
    );
  }

  private _getInvokeParameters(parameters: Record<string, any>, dynamicState: any): Record<string, any> {
    // tslint:disable-line: no-any
    const invokeParameters = { ...parameters };
    const additionalParameters = dynamicState.parameters;

    if (additionalParameters) {
      for (const parameterName of Object.keys(additionalParameters)) {
        const { value } = additionalParameters[parameterName];

        if (value !== undefined) {
          invokeParameters[parameterName] = value;
        }
      }
    }

    return invokeParameters;
  }

  private _getResponseFromDynamicApi(responseJson: any, requestUrl: string): any {
    const intl = getIntl();
    const connectorResponse = responseJson.response ?? responseJson;
    if (connectorResponse.statusCode === 'OK') {
      return connectorResponse.body;
    } else {
      const clientRequestId = getClientRequestIdFromHeaders(connectorResponse.headers);
      const defaultErrorMessage = intl.formatMessage(
        { defaultMessage: 'Error executing the api - {url}', description: 'Error message to show on dynamic call failure' },
        { url: requestUrl }
      );
      const errorMessage = this._getErrorMessageFromConnectorResponse(connectorResponse, defaultErrorMessage, intl, clientRequestId);

      throw new ConnectorServiceException(ConnectorServiceErrorCode.API_EXECUTION_FAILED_WITH_ERROR, errorMessage, { connectorResponse });
    }
  }

  private _getErrorMessageFromConnectorResponse(
    response: any,
    defaultErrorMessage: string,
    intl: IntlShape,
    clientRequestId?: string
  ): string {
    const {
      body: { error, message },
      statusCode,
    } = response;
    let errorMessage: string;

    if (statusCode !== undefined && message) {
      const errorCode = statusCode;
      errorMessage = intl.formatMessage(
        {
          defaultMessage: "Error code: '{errorCode}', Message: '{message}'.",
          description: 'Dynamic call error message',
        },
        { errorCode, message }
      );
    } else if (error && error.message) {
      errorMessage = error.message;
    } else {
      errorMessage = defaultErrorMessage;
    }

    return clientRequestId
      ? `${errorMessage} ${intl.formatMessage(
          {
            defaultMessage: "More diagnostic information: x-ms-client-request-id is '{clientRequestId}'.",
            description: 'Diagnostics information on error message',
          },
          { clientRequestId }
        )}`
      : errorMessage;
  }

  private async _executeAzureDynamicApi(
    connectionId: string,
    connectorId: string,
    parameters: Record<string, any>,
    isManagedIdentityTypeConnection?: boolean,
    managedIdentityProperties?: ManagedIdentityRequestProperties
  ): Promise<any> {
    const { baseUrl, apiHubServiceDetails, httpClient } = this.options;
    const intl = getIntl();
    const method = parameters['method'];
    const uri = isManagedIdentityTypeConnection
      ? `${baseUrl}/dynamicInvoke`
      : isArmResourceId(connectorId)
      ? pathCombine(`${apiHubServiceDetails.baseUrl}/${connectionId}/extensions/proxy`, parameters['path'])
      : pathCombine(`${baseUrl}/${connectionId}/extensions/proxy`, parameters['path']);

    if (isManagedIdentityTypeConnection) {
      const request = {
        method,
        path: parameters['path'],
        body: parameters['body'],
        queries: parameters['queries'],
        headers: parameters['headers'],
      };

      try {
        const response = await httpClient.post({
          uri,
          queryParameters: { 'api-version': apiHubServiceDetails.apiVersion },
          content: { request, properties: managedIdentityProperties },
        });

        return this._getResponseFromDynamicApi(response, uri);
      } catch (ex: any) {
        throw new ConnectorServiceException(
          ConnectorServiceErrorCode.API_EXECUTION_FAILED,
          ex && ex.message
            ? ex.message
            : intl.formatMessage(
                {
                  defaultMessage: `Error executing the api '{parameters}'.`,
                  description: 'Error message when execute dynamic api in managed connector',
                },
                { parameters: parameters['path'] }
              ),
          {
            requestMethod: method,
            uri,
            inputPath: parameters['path'],
          },
          ex
        );
      }
    } else {
      try {
        const options = {
          uri,
          queryParameters: { 'api-version': apiHubServiceDetails.apiVersion, ...parameters['queries'] },
          headers: parameters['headers'],
        };
        const bodyContent = parameters['body'];
        switch (method.toLowerCase()) {
          case 'get':
            return httpClient.get(options);
          case 'post':
            return httpClient.post(bodyContent ? { ...options, content: bodyContent } : options);
          case 'put':
            return httpClient.put(bodyContent ? { ...options, content: bodyContent } : options);
          default:
            throw new UnsupportedException(`Unsupported dynamic call connector method - '${method}'`);
        }
      } catch (ex: any) {
        throw new ConnectorServiceException(
          ConnectorServiceErrorCode.API_EXECUTION_FAILED,
          ex && ex.message
            ? ex.message
            : intl.formatMessage(
                {
                  defaultMessage: `Error executing the api '{parameters}'.`,
                  description: 'Error message when execute dynamic api in managed connector',
                },
                { parameters: parameters['path'] }
              ),
          {
            requestMethod: method,
            uri,
            inputPath: parameters['path'],
          },
          ex
        );
      }
    }
  }
}

function pathCombine(url: string, path: string): string {
  let pathUrl: string;

  if (!url || !path) {
    pathUrl = url || path;
    return pathUrl;
  }

  return `${trimUrl(url)}/${trimUrl(path)}`;
}

function getClientRequestIdFromHeaders(headers: Headers | Record<string, string>): string {
  if (headers) {
    return headers instanceof Headers ? (headers.get('x-ms-client-request-id') as string) : (headers['x-ms-client-request-id'] as string);
  }

  return '';
}

function trimUrl(url: string): string {
  let updatedUrl = url;
  if (updatedUrl[0] === '/') {
    updatedUrl = updatedUrl.substring(1, updatedUrl.length);
  }

  if (updatedUrl[updatedUrl.length - 1] === '/') {
    updatedUrl = updatedUrl.substring(0, updatedUrl.length - 1);
  }

  return updatedUrl;
}
