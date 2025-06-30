import type { OpenAPIV2, OperationManifest } from '../../../utils/src';
import { validateRequiredServiceArguments } from '../../../utils/src/lib/helpers/functions';
import type { ListDynamicValue } from '../connector';
import { OperationManifestService } from '../operationmanifest';
import { StandardConnectorService } from '../standard';
import type { StandardConnectorServiceOptions } from '../standard/connector';

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
    const { getConfiguration } = this.options;
    const operationManifestService = OperationManifestService();
    let manifest: OperationManifest | undefined = undefined;
    if (operationManifestService.isSupported(operationId)) {
      manifest = await operationManifestService.getOperationManifest(connectorId, operationId);
    }

    const configuration = await getConfiguration(connectionId ?? '', manifest);

    return this._getDynamicSchema(connectorId, operationId, parameters, dynamicState, configuration);
  }
}
