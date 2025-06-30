import type { OpenAPIV2, OperationManifest } from '../../../utils/src';
import { UnsupportedException } from '../../../utils/src';
import { validateRequiredServiceArguments } from '../../../utils/src/lib/helpers/functions';
import type { ListDynamicValue } from '../connector';
import { OperationManifestService } from '../operationmanifest';
import { StandardConnectorService } from '../standard';
import type { StandardConnectorServiceOptions } from '../standard/connector';
import { getHybridAppBaseRelativeUrl, hybridApiVersion, isHybridLogicApp } from '../standard/hybrid';

export class StandardVSCodeConnectorService extends StandardConnectorService {
  constructor(override readonly options: StandardConnectorServiceOptions) {
    super({
      ...options,
      baseUrl: options.apiHubServiceDetails?.baseUrl ?? options.baseUrl,
      apiVersion: options.apiHubServiceDetails?.apiVersion ?? options.apiVersion,
    });
    const { apiVersion, baseUrl, getConfiguration } = options;
    validateRequiredServiceArguments({ apiVersion, baseUrl, getConfiguration });
  }

  async getListDynamicValues(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    parameters: Record<string, any>,
    dynamicState: any
  ): Promise<ListDynamicValue[]> {
    const { getConfiguration } = this.options;
    const operationManifestService = OperationManifestService();
    let manifest: OperationManifest | undefined = undefined;

    if (operationManifestService.isSupported(operationId)) {
      manifest = await operationManifestService.getOperationManifest(connectorId, operationId);
    }

    const configuration = await getConfiguration(connectionId ?? '', manifest);
    return this._listDynamicValues(connectorId, operationId, parameters, dynamicState, configuration);
  }

  async getDynamicSchema(
    connectionId: string | undefined,
    connectorId: string,
    operationId: string,
    parameters: Record<string, any>,
    dynamicState: any
  ): Promise<OpenAPIV2.SchemaObject> {
    const { baseUrl, apiVersion, getConfiguration, httpClient } = this.options;
    const {
      extension: { operationId: dynamicOperation },
      isInput,
    } = dynamicState;
    const operationManifestService = OperationManifestService();

    const invokeParameters = this._getInvokeParameters(parameters, dynamicState);
    let manifest: OperationManifest | undefined = undefined;

    if (operationManifestService.isSupported(operationId)) {
      manifest = await operationManifestService.getOperationManifest(connectorId, operationId);
    }
    const configuration = await getConfiguration(connectionId ?? '', manifest);
    if (this._isClientSupportedOperation(connectorId, operationId)) {
      if (!this.options.schemaClient?.[dynamicOperation]) {
        throw new UnsupportedException(`Operation ${dynamicOperation} is not implemented by the schema client.`);
      }
      return this.options.schemaClient?.[dynamicOperation]({
        operationId,
        parameters: invokeParameters,
        configuration,
        isInput,
      });
    }

    const uri = `${baseUrl}/operationGroups/${connectorId.split('/').slice(-1)}/operations/${dynamicOperation}/dynamicInvoke`;

    let response = null;
    if (isHybridLogicApp(uri)) {
      response = await httpClient.post({
        uri: `${getHybridAppBaseRelativeUrl(baseUrl.split('hostruntime')[0])}/invoke?api-version=${hybridApiVersion}`,
        headers: {
          'x-ms-logicapps-proxy-path': `/runtime/webhooks/workflow/api/management/operationGroups/${connectorId
            .split('/')
            .slice(-1)}/operations/${dynamicOperation}/dynamicInvoke`,
          'x-ms-logicapps-proxy-method': 'POST',
        },
        content: { parameters: invokeParameters, configuration },
      });
    } else {
      response = await httpClient.post({
        uri,
        queryParameters: { 'api-version': apiVersion },
        content: { parameters: invokeParameters, configuration },
      });
    }

    return this._getResponseFromDynamicApi(response, uri);
  }
}
