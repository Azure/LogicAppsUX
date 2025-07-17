import { getIntl } from '../../../intl/src';
import type { OpenAPIV2, OperationInfo } from '../../../utils/src';
import { ArgumentException, equals, ConnectorServiceException, ConnectorServiceErrorCode, parseErrorMessage } from '../../../utils/src';
import type {
  IConnectorService,
  ListDynamicValue,
  ManagedIdentityRequestProperties,
  TreeDynamicExtension,
  TreeDynamicValue,
} from '../connector';
import { getClientRequestIdFromHeaders } from '../helpers';
import type { IHttpClient } from '../httpClient';

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
  apiHubServiceDetails?: {
    apiVersion: string;
    baseUrl: string;
  };
}

export abstract class BaseConnectorService implements IConnectorService {
  constructor(protected readonly options: BaseConnectorServiceOptions) {
    const { apiVersion, baseUrl, httpClient, clientSupportedOperations, schemaClient, valuesClient } = options;
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    }
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    }
    if (!httpClient) {
      throw new ArgumentException('httpClient required');
    }
    if (!clientSupportedOperations) {
      throw new ArgumentException('clientSupportedOperations required');
    }
    if (!schemaClient) {
      throw new ArgumentException('schemaClient required');
    }
    if (!valuesClient) {
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
    parameters: Record<string, any>,
    dynamicState: any,
    isManagedIdentityConnection?: boolean
  ): Promise<ListDynamicValue[]>;

  abstract getDynamicSchema(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    parameters: Record<string, any>,
    dynamicState: any,
    isManagedIdentityConnection?: boolean
  ): Promise<OpenAPIV2.SchemaObject>;

  abstract getTreeDynamicValues(
    _connectionId: string | undefined,
    _connectorId: string,
    _operationId: string,
    _parameters: Record<string, any>,
    _dynamicState: TreeDynamicExtension,
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
    }
    const clientRequestId = getClientRequestIdFromHeaders(connectorResponse.headers);
    const defaultErrorMessage = intl.formatMessage(
      { defaultMessage: 'Error executing the API - {url}', id: 'XHQwyJ', description: 'Error message to show on dynamic call failure' },
      { url: requestUrl }
    );
    const errorMessage = this._getErrorMessageFromConnectorResponse(connectorResponse, defaultErrorMessage, intl, clientRequestId);

    throw new ConnectorServiceException(ConnectorServiceErrorCode.API_EXECUTION_FAILED_WITH_ERROR, errorMessage, { connectorResponse });
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
          id: '04AwK7',
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
            defaultMessage: `More diagnostic information: x-ms-client-request-id is ''{clientRequestId}''.`,
            id: 'cWpWiU',
            description:
              "Diagnostics information for error message. Don't remove the double single quotes around the placeholder text, which is needed to wrap the placeholder text in single quotes.",
          },
          { clientRequestId }
        )}`
      : errorMessage;
  }

  protected async _executeAzureDynamicApi(
    dynamicInvokeUrl: string,
    apiVersion: string,
    parameters: Record<string, any>,
    properties?: ManagedIdentityRequestProperties | { workflowReference: { id: string } }
  ): Promise<any> {
    const intl = getIntl();
    const method = parameters['method'];
    const baseUri = `${dynamicInvokeUrl}/dynamicInvoke`;
    const queryParameters = { 'api-version': apiVersion };

    const request = {
      method,
      path: parameters['path'],
      body: parameters['body'],
      queries: parameters['queries'],
      headers: parameters['headers'],
    };
    const content = properties ? { request, properties } : { request };

    try {
      const initialResponse = await this._fetchData(baseUri, queryParameters, content);

      const nextLink = initialResponse.nextLink || initialResponse['@odata.nextLink'];
      const isArrayPagination = Array.isArray(initialResponse.value) && nextLink;

      if (isArrayPagination) {
        const paginationResult = await this._getAllPagedValues(initialResponse, request.headers);
        return {
          ...initialResponse,
          value: paginationResult.values,
          __usedNextPage: true,
          __paginationIncomplete: paginationResult.incomplete,
          __paginationError: paginationResult.error,
        };
      }

      return initialResponse;
    } catch (ex: any) {
      throw this._handleError(ex, intl, method, baseUri, parameters['path']);
    }
  }

  private async _fetchData(baseUri: string, queryParameters: Record<string, any>, content: any) {
    const initialResponse = await this.options.httpClient.post({
      uri: baseUri,
      queryParameters,
      content,
    });

    return this._getResponseFromDynamicApi(initialResponse, baseUri);
  }

  private async _getAllPagedValues(
    initialResponse: any,
    headers: Record<string, any>
  ): Promise<{ values: any[]; incomplete: boolean; error?: string }> {
    let pageData = initialResponse;
    const allValues: any[] = Array.isArray(pageData.value) ? [...pageData.value] : [];

    let nextLink: string | undefined = pageData.nextLink || pageData['@odata.nextLink'];
    let incomplete = false;
    let lastError: string | undefined;

    while (nextLink) {
      try {
        const pagedResponse = await this.options.httpClient.get({
          uri: nextLink,
          headers,
          includeAuth: true,
        });

        pageData = this._getResponseFromDynamicApi({ response: { statusCode: 'OK', body: pagedResponse, headers } }, nextLink);

        if (!pageData || !Array.isArray(pageData.value)) {
          throw new Error(`Invalid response at nextLink: ${nextLink}`);
        }

        allValues.push(...pageData.value);
        nextLink = pageData.nextLink || pageData['@odata.nextLink'];
      } catch (error: any) {
        incomplete = true;
        lastError = parseErrorMessage(error);
        break;
      }
    }

    return {
      values: allValues,
      incomplete,
      error: lastError,
    };
  }

  private _handleError(ex: any, intl: IntlShape, method: string, baseUri: string, path: string) {
    const errorMessage =
      ex.message ??
      intl.formatMessage(
        {
          defaultMessage: "Error occurred while executing the following API parameters: ''{parameters}''",
          id: 'VYqwse',
          description:
            'Error message when executing dynamic API in managed connector. Do not remove the double single quotes around the placeholder text.',
        },
        { parameters: path }
      );

    return new ConnectorServiceException(
      ConnectorServiceErrorCode.API_EXECUTION_FAILED,
      errorMessage,
      { requestMethod: method, uri: baseUri, inputPath: path },
      ex
    );
  }
}
