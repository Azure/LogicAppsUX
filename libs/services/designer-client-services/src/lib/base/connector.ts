import type { IConnectorService, ListDynamicValue, ManagedIdentityRequestProperties, TreeDynamicValue } from '../connector';
import { getClientRequestIdFromHeaders, pathCombine } from '../helpers';
import type { IHttpClient } from '../httpClient';
import { getIntl } from '@microsoft/intl-logic-apps';
import type { OpenAPIV2, OperationInfo } from '@microsoft/utils-logic-apps';
import {
  UnsupportedException,
  ArgumentException,
  ConnectorServiceErrorCode,
  ConnectorServiceException,
  equals,
} from '@microsoft/utils-logic-apps';
import type { IntlShape } from 'react-intl';

type GetSchemaFunction = (args: Record<string, any>) => Promise<OpenAPIV2.SchemaObject>;
type GetValuesFunction = (args: Record<string, any>) => Promise<ListDynamicValue[]>;

export interface BaseConnectorServiceOptions {
  apiVersion: string;
  baseUrl: string;
  httpClient: IHttpClient;
  clientSupportedOperations: OperationInfo[];
  schemaClient?: Record<string, GetSchemaFunction>;
  valuesClient?: Record<string, GetValuesFunction>;
}

export abstract class BaseConnectorService implements IConnectorService {
  constructor(protected readonly options: BaseConnectorServiceOptions) {
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

  abstract getLegacyDynamicContent(
    connectionId: string,
    connectorId: string,
    parameters: Record<string, any>,
    managedIdentityProperties?: ManagedIdentityRequestProperties
  ): Promise<any>;

  abstract getListDynamicValues(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    _parameterAlias: string | undefined,
    parameters: Record<string, any>,
    dynamicState: any,
    isManagedIdentityConnection?: boolean
  ): Promise<ListDynamicValue[]>;

  abstract getDynamicSchema(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    _parameterAlias: string | undefined,
    parameters: Record<string, any>,
    dynamicState: any,
    isManagedIdentityConnection?: boolean
  ): Promise<OpenAPIV2.SchemaObject>;

  abstract getTreeDynamicValues(
    _connectionId: string | undefined,
    _connectorId: string,
    _operationId: string,
    _parameterAlias: string | undefined,
    _parameters: Record<string, any>,
    _dynamicState: any,
    isManagedIdentityConnection?: boolean
  ): Promise<TreeDynamicValue[]>;

  protected _isClientSupportedOperation(connectorId: string, operationId: string): boolean {
    return this.options.clientSupportedOperations.some(
      (operationInfo) => equals(connectorId, operationInfo.connectorId) && equals(operationId, operationInfo.operationId)
    );
  }

  protected _getInvokeParameters(parameters: Record<string, any>, dynamicState: any): Record<string, any> {
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

  protected _getResponseFromDynamicApi(responseJson: any, requestUrl: string): any {
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
          defaultMessage: `Error code: ''{errorCode}'', Message: ''{message}''.`,
          description:
            'Dynamic call error message. Do not remove the double single quotes around the placeholder texts, as it is needed to wrap the placeholder text in single quotes.',
        },
        { errorCode, message }
      );
    } else {
      errorMessage = error?.message ?? defaultErrorMessage;
    }

    return clientRequestId
      ? `${errorMessage} ${intl.formatMessage(
          {
            defaultMessage: "More diagnostic information: x-ms-client-request-id is ''{clientRequestId}''.",
            description:
              'Diagnostics information on error message. Do not remove the double single quotes around the placeholder texts, as it is needed to wrap the placeholder text in single quotes.',
          },
          { clientRequestId }
        )}`
      : errorMessage;
  }

  protected async _executeAzureDynamicApi(
    connectionId: string,
    dynamicInvokeUrl: string,
    dynamicInvokeApiVersion: string,
    parameters: Record<string, any>,
    managedIdentityProperties?: ManagedIdentityRequestProperties | { workflowReference: { id: string } }
  ): Promise<any> {
    const { baseUrl, apiVersion, httpClient } = this.options;
    const intl = getIntl();
    const method = parameters['method'];
    const isManagedIdentityTypeConnection = !!managedIdentityProperties;
    const uri = isManagedIdentityTypeConnection
      ? `${dynamicInvokeUrl}/dynamicInvoke`
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
          queryParameters: { 'api-version': dynamicInvokeApiVersion },
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
                  defaultMessage: "Error occurred while executing the following API parameters: ''{parameters}''",
                  description:
                    'Error message when execute dynamic api in managed connector. Do not remove the double single quotes around the placeholder text, as it is needed to wrap the placeholder text in single quotes.',
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
          queryParameters: { 'api-version': apiVersion, ...parameters['queries'] },
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
                  defaultMessage: "Error executing the api ''{parameters}''.",
                  description:
                    'Error message when execute dynamic api in managed connector. Do not remove the double single quotes around the placeholder text, as it is needed to wrap the placeholder text in single quotes.',
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
