import { StaticResultSchemaService } from './staticresultschema';
import type { ManifestParser, Schema, SwaggerParser } from '@microsoft/parsers-logic-apps';

/**
 * The operation result schema service.
 */
export interface IStaticResultSchemaService {
  /**
   * Gets the operation result schema for an operation.
   * @arg {string} connectorId - The connector id.
   * @arg {string} operationId - The operation id.
   * @arg {SwaggerParser | ManifestParser} [parser] - The supported parser for the node type.
   * @return {Promise<Schema>}
   */
  getOperationResultSchema(connectorId: string, operationId: string, parser?: SwaggerParser | ManifestParser): Promise<Schema | undefined>;
}

let service: IStaticResultSchemaService;

export const StaticResultService = (): IStaticResultSchemaService => {
  if (!service) {
    service = new StaticResultSchemaService();
  }

  return service;
};
