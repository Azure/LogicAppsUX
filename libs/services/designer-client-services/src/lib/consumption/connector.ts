import type { BaseConnectorServiceOptions } from '../base';
import { BaseConnectorService } from '../base';
import type { ListDynamicValue, ManagedIdentityRequestProperties, TreeDynamicValue } from '../connector';
import type { OpenAPIV2 } from '@microsoft/utils-logic-apps';
import { ArgumentException, UnsupportedException, getResourceName, optional } from '@microsoft/utils-logic-apps';

interface ConsumptionConnectorServiceOptions extends BaseConnectorServiceOptions {
  workflowReferenceId: string;
}

export class ConsumptionConnectorService extends BaseConnectorService {
  constructor(override readonly options: ConsumptionConnectorServiceOptions) {
    super(options);
    const { workflowReferenceId } = options;
    if (!workflowReferenceId) {
      throw new ArgumentException('workflowReferenceId required');
    }
  }

  async getLegacyDynamicContent(
    connectionId: string,
    _connectorId: string,
    parameters: Record<string, any>,
    managedIdentityProperties?: ManagedIdentityRequestProperties
  ): Promise<any> {
    const { baseUrl, apiVersion, workflowReferenceId } = this.options;
    return this._executeAzureDynamicApi(
      connectionId,
      `${baseUrl}${connectionId}`,
      apiVersion,
      parameters,
      managedIdentityProperties ? { workflowReference: { id: workflowReferenceId } } : undefined
    );
  }

  async getListDynamicValues(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    _parameterAlias: string | undefined,
    parameters: Record<string, any>,
    dynamicState: any,
    isManagedIdentityConnection?: boolean
  ): Promise<ListDynamicValue[]> {
    const { apiVersion, httpClient } = this.options;
    const { operationId: dynamicOperation } = dynamicState;

    const invokeParameters = this._getInvokeParameters(parameters, dynamicState);

    if (this._isClientSupportedOperation(connectorId, operationId)) {
      if (!this.options.valuesClient?.[dynamicOperation]) {
        throw new UnsupportedException(`Operation ${dynamicOperation} is not implemented by the values client.`);
      }
      return this.options.valuesClient?.[dynamicOperation]({
        operationId,
        parameters: invokeParameters,
      });
    }

    const uri = `${connectionId}/dynamicList`;
    const response = await httpClient.post({
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: {
        ...optional('properties', this._getPropertiesIfNeeded(isManagedIdentityConnection)),
        dynamicInvocationDefinition: dynamicState,
        parameters: invokeParameters,
      },
    });
    return this._getResponseFromDynamicApi(response, uri)?.value;
  }

  async getDynamicSchema(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    _parameterAlias: string | undefined,
    parameters: Record<string, any>,
    dynamicState: any,
    isManagedIdentityConnection?: boolean
  ): Promise<OpenAPIV2.SchemaObject> {
    const { apiVersion, httpClient } = this.options;
    const {
      extension: { operationId: dynamicOperation },
      isInput,
    } = dynamicState;

    const invokeParameters = this._getInvokeParameters(parameters, dynamicState);

    if (this._isClientSupportedOperation(connectorId, operationId)) {
      if (!this.options.schemaClient?.[dynamicOperation]) {
        throw new UnsupportedException(`Operation ${dynamicOperation} is not implemented by the schema client.`);
      }
      return this.options.schemaClient?.[dynamicOperation]({
        operationId,
        parameters: invokeParameters,
        isInput,
      });
    }

    const uri = `${connectionId}/dynamicSchema`;
    const response = await httpClient.post({
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: {
        ...optional('properties', this._getPropertiesIfNeeded(isManagedIdentityConnection)),
        location: isInput ? 'Input' : undefined,
        dynamicInvocationDefinition: dynamicState.extension,
        parameters: invokeParameters,
      },
    });
    return this._getResponseFromDynamicApi(response, uri);
  }

  async getTreeDynamicValues(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    parameterAlias: string | undefined,
    parameters: Record<string, any>,
    dynamicState: any,
    isManagedIdentityConnection?: boolean
  ): Promise<TreeDynamicValue[]> {
    const { apiVersion, httpClient } = this.options;
    const invokeParameters = this._getInvokeParameters(parameters, dynamicState);

    const uri = `${connectionId}/dynamicTree`;
    const response = await httpClient.post({
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: {
        ...optional('properties', this._getPropertiesIfNeeded(isManagedIdentityConnection)),
        dynamicInvocationDefinition: dynamicState,
        parameters: invokeParameters,
      },
    });
    return this._getResponseFromDynamicApi(response, uri)?.value;
  }

  private _getPropertiesIfNeeded(isManagedIdentityConnection?: boolean):
    | {
        workflowReference: { name: string; id: string; type: string };
      }
    | undefined {
    if (isManagedIdentityConnection) {
      const { workflowReferenceId } = this.options;
      return {
        workflowReference: {
          name: getResourceName(workflowReferenceId),
          id: workflowReferenceId,
          type: 'Microsoft.Logic/workflows',
        },
      };
    }

    return undefined;
  }
}
