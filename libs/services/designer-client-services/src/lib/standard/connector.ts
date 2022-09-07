import { getIntl } from "@microsoft-logic-apps/intl";
import type { OperationInfo } from "@microsoft-logic-apps/utils";
import { ArgumentException, ConnectorServiceErrorCode, ConnectorServiceException, equals } from "@microsoft-logic-apps/utils";
import type { IntlShape } from "react-intl";
import type { IConnectorService, ListDynamicValue } from "../connector";
import type { IHttpClient } from "../httpClient";

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
            headers: { 'Content-Type': 'application/json' }
        });
        return this._getResponseFromDynamicApi(response, uri);
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
        const { extension: {operationId: dynamicOperation }, isInput } = dynamicState;

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
            headers: { 'Content-Type': 'application/json' }
        });
        return this._getResponseFromDynamicApi(response, uri);
    }

    private _isClientSupportedOperation(connectorId: string, operationId: string): boolean {
        return this.options.clientSupportedOperations.some(operationInfo => equals(connectorId, operationInfo.connectorId) && equals(operationId, operationInfo.operationId));
    }

    private _getInvokeParameters(parameters: Record<string, any>, dynamicState: any): Record<string, any> { // tslint:disable-line: no-any
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
            const defaultErrorMessage = intl.formatMessage({ defaultMessage: 'Error executing the api - {url}', description: 'Error message to show on dynamic call failure' }, { url: requestUrl });
            const errorMessage = this._getErrorMessageFromConnectorResponse(connectorResponse, defaultErrorMessage, intl, clientRequestId);

            throw new ConnectorServiceException(ConnectorServiceErrorCode.API_EXECUTION_FAILED_WITH_ERROR, errorMessage, { connectorResponse });
        }
    }

    private _getErrorMessageFromConnectorResponse(response: any, defaultErrorMessage: string, intl: IntlShape, clientRequestId?: string): string {
        const {
            body: { error, message },
            statusCode,
        } = response;
        let errorMessage: string;

        if (statusCode !== undefined && message) {
            const errorCode = statusCode;
            errorMessage = intl.formatMessage({
                defaultMessage: "Error code: '{errorCode}', Message: '{message}'.",
                description: 'Dynamic call error message'
            }, { errorCode, message });
        } else if (error && error.message) {
            errorMessage = error.message;
        } else {
            errorMessage = defaultErrorMessage;
        }

        return clientRequestId
            ? `${errorMessage} ${intl.formatMessage({
                defaultMessage: "More diagnostic information: x-ms-client-request-id is '{clientRequestId}'.",
                description: 'Diagnostics information on error message'}, { clientRequestId })}`
            : errorMessage;
    }
}

function getClientRequestIdFromHeaders(headers: Headers | Record<string, string>): string {
    if (headers) {
        return headers instanceof Headers ? headers.get('x-ms-client-request-id') as string : headers['x-ms-client-request-id'] as string;
    }

    return '';
}
