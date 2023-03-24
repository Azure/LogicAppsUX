import { BaseConnectorService } from '../base';
import type { ListDynamicValue } from '../connector';

export class ConsumptionConnectorService extends BaseConnectorService {
  async getListDynamicValues(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    _parameterAlias: string | undefined,
    parameters: Record<string, any>,
    dynamicState: any,
    nodeInputs: any,
    nodeMetadata: any
  ): Promise<ListDynamicValue[]> {
    const { baseUrl, apiVersion, getConfiguration, httpClient } = this.options;
    const { operationId: dynamicOperation } = dynamicState;

    const invokeParameters = this._getInvokeParameters(parameters, dynamicState);
    const configuration = await getConfiguration(connectionId ?? '');

    if (this._isClientSupportedOperation(connectorId, operationId)) {
      return this.options.valuesClient[dynamicOperation]({
        operationId,
        parameters: invokeParameters,
        configuration,
        nodeInputs,
        nodeMetadata,
      });
    }

    const uri = `${baseUrl}/operationGroups/${connectorId.split('/').slice(-1)}/operations/${dynamicOperation}/dynamicInvoke`;
    const response = await httpClient.post({
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: { parameters: invokeParameters, configuration },
    });
    return this._getResponseFromDynamicApi(response, uri);
  }

  async getDynamicSchema(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    _parameterAlias: string | undefined,
    parameters: Record<string, any>,
    dynamicState: any,
    nodeInputs: any,
    nodeMetadata: any
  ): Promise<OpenAPIV2.SchemaObject> {
    const { baseUrl, apiVersion, getConfiguration, httpClient } = this.options;
    const {
      extension: { operationId: dynamicOperation },
      isInput,
    } = dynamicState;

    const invokeParameters = this._getInvokeParameters(parameters, dynamicState);
    const configuration = await getConfiguration(connectionId ?? '');

    if (this._isClientSupportedOperation(connectorId, operationId)) {
      return this.options.schemaClient[dynamicOperation]({
        operationId,
        parameters: invokeParameters,
        configuration,
        isInput,
        nodeInputs,
        nodeMetadata,
      });
    }

    const uri = `${baseUrl}/operationGroups/${connectorId.split('/').slice(-1)}/operations/${dynamicOperation}/dynamicInvoke`;
    const response = await httpClient.post({
      uri,
      queryParameters: { 'api-version': apiVersion },
      content: { parameters: invokeParameters, configuration },
    });
    return this._getResponseFromDynamicApi(response, uri);
  }
}
