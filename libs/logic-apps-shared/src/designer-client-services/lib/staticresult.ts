import { StaticResultSchemaService } from './staticresultschema';
import type { ManifestParser, OpenApiSchema, SwaggerParser } from '@microsoft/logic-apps-shared';

/**
 * The operation result schema service.
 */
export interface IStaticResultSchemaService {
  /**
   * Gets the operation result schema for an operation.
   * @arg {string} connectorId - The connector id.
   * @arg {string} operationId - The operation id.
   * @arg {SwaggerParser | ManifestParser} [parser] - The supported parser for the node type.
   * @return {Promise<OpenApiSchema>}
   */
  getOperationResultSchema(
    connectorId: string,
    operationId: string,
    parser?: SwaggerParser | ManifestParser
  ): Promise<OpenApiSchema | undefined>;
}

let service: IStaticResultSchemaService;

export const StaticResultService = (): IStaticResultSchemaService => {
  if (!service) {
    service = new StaticResultSchemaService();
  }

  return service;
};
