import { StaticResultSchemaService } from './staticresultschema';
import type { Schema, SwaggerParser } from '@microsoft/parsers-logic-apps';

/**
 * The operation result schema service.
 */
export interface IStaticResultSchemaService {
  /**
   * Gets the operation result schema for an operation.
   * @arg {string} connectorId - The connector id.
   * @arg {string} operationId - The operation id.
   * @arg {SwaggerParser} [swagger] - The swagger if the node type supports.
   * @return {Promise<Schema>}
   */
  getOperationResultSchema(connectorId: string, operationId: string, swaggerParser?: SwaggerParser): Promise<Schema | undefined>;
}

let service: IStaticResultSchemaService;

export const StaticResultService = (): IStaticResultSchemaService => {
  if (!service) {
    service = new StaticResultSchemaService();
  }

  return service;
};
