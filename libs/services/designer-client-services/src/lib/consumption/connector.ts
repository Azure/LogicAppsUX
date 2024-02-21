import type { BaseConnectorServiceOptions } from '../base';
import { BaseConnectorService } from '../base';
import type { ListDynamicValue, ManagedIdentityRequestProperties, TreeDynamicExtension, TreeDynamicValue } from '../connector';
import type { OpenAPIV2 } from '@microsoft/logic-apps-shared';
import { ArgumentException, UnsupportedException, equals, getResourceName, optional } from '@microsoft/logic-apps-shared';

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
    connectorId: string,
    parameters: Record<string, any>,
    managedIdentityProperties?: ManagedIdentityRequestProperties
  ): Promise<any> {
    const { baseUrl, workflowReferenceId } = this.options;
    return this._executeAzureDynamicApi(
      connectionId,
      connectorId,
      `${baseUrl}${connectionId}`,
      parameters,
      managedIdentityProperties ? { workflowReference: { id: workflowReferenceId } } : undefined
    );
  }

  async getListDynamicValues(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
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
        parameters,
      },
    });
    return this._getResponseFromDynamicApi(response, uri)?.value;
  }

  async getDynamicSchema(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    parameters: Record<string, any>,
    dynamicState: any,
    isManagedIdentityConnection?: boolean
  ): Promise<OpenAPIV2.SchemaObject> {
    const { apiVersion, httpClient } = this.options;
    const {
      extension: { operationId: dynamicOperation },
      isInput,
      contextParameterAlias,
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

    const uri = `${connectionId}/dynamicProperties`;
    const response = await httpClient.post({
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: {
        ...optional('properties', this._getPropertiesIfNeeded(isManagedIdentityConnection)),
        location: isInput ? 'input' : 'output',
        dynamicInvocationDefinition: dynamicState.extension,
        parameters,
        contextParameterAlias,
      },
    });
    return this._getResponseFromDynamicApi(response, uri);
  }

  async getTreeDynamicValues(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    parameters: Record<string, any>,
    dynamicExtension: TreeDynamicExtension,
    isManagedIdentityConnection?: boolean
  ): Promise<TreeDynamicValue[]> {
    const { apiVersion, httpClient } = this.options;
    const { dynamicState, selectionState } = dynamicExtension;

    const uri = `${connectionId}/dynamicTree`;
    const response = await httpClient.post({
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: {
        ...optional('properties', this._getPropertiesIfNeeded(isManagedIdentityConnection)),
        dynamicInvocationDefinition: dynamicState,
        parameters,
        selectionState,
      },
    });
    const values = this._getResponseFromDynamicApi(response, uri)?.value;
    return (values || []).map((item: any) => ({
      value: item,
      displayName: item.displayName,
      isParent: item.isParent ?? equals(item.nodeType, 'parent'),
    }));
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
