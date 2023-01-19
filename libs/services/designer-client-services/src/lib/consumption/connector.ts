import { BaseConnectorService } from '../base';
import type { ListDynamicValue } from '../connector';

export class ConsumptionConnectorService extends BaseConnectorService {
  // We only use legacy for consumption
  async getListDynamicValues(
    _connectionId: string | undefined,
    _connectorId: string,
    _operationId: string,
    _parameterAlias: string | undefined,
    _parameters: Record<string, any>,
    _dynamicState: any
  ): Promise<ListDynamicValue[]> {
    console.error('TRYING TO GET LIST DYNAMIC VALUES FOR CONSUMPTION');
    return [];
  }

  async getDynamicSchema(
    _connectionId: string | undefined,
    _connectorId: string,
    _operationId: string,
    _parameterAlias: string | undefined,
    _parameters: Record<string, any>,
    _dynamicState: any
  ): Promise<OpenAPIV2.SchemaObject> {
    console.error('TRYING TO GET DYNAMIC SCHEMA FOR CONSUMPTION');
    return {};
  }
}
