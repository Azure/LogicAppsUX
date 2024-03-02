import {
  apiManagementConnectorId,
  dataOperationConnectorId,
  flatFileConnectorId,
  flatfiledecoding,
  flatfileencoding,
  httpaction,
  httpConnectorId,
  httpswaggeraction,
  httpwebhookaction,
  parsejson,
  query,
  select,
} from '../base/operationmanifest';
import type { IStaticResultSchemaService } from '../staticresult';
import { getStaticResultSchemaForAPIConnector } from './schemas/apiConnector';
import type { StaticResultRootSchemaType } from './schemas/baseactionresult';
import { FlatFileDecodingStaticResultSchema } from './schemas/flatfiledecoding';
import { FlatFileEncodingStaticResultSchema } from './schemas/flatfileencoding';
import { HttpStaticResultSchema } from './schemas/httpresult';
import { ParseJsonStaticResultSchema } from './schemas/parseJson';
import { QueryStaticResultSchema } from './schemas/query';
import type { ManifestParser, SwaggerParser } from '@microsoft/logic-apps-shared';
import {
  isCustomConnectorId,
  isManagedConnectorId,
  isSharedManagedConnectorId,
  isSharedManagedConnectorIdFromPApps,
} from '@microsoft/logic-apps-shared';

/**
 * Factory method to provide the static result root schema for an operation
 */
export class StaticResultSchemaService implements IStaticResultSchemaService {
  getOperationResultSchema(
    connectorId: string,
    operationId: string,
    parser?: SwaggerParser | ManifestParser
  ): Promise<StaticResultRootSchemaType | undefined> {
    switch (connectorId.toLowerCase()) {
      case httpConnectorId.toLowerCase():
        switch (operationId.toLowerCase()) {
          case httpaction:
          case httpswaggeraction:
          case httpwebhookaction:
            return Promise.resolve(HttpStaticResultSchema);
          default:
            break;
        }
        break;

      case flatFileConnectorId.toLowerCase():
        switch (operationId.toLowerCase()) {
          case flatfiledecoding:
            return Promise.resolve(FlatFileDecodingStaticResultSchema);
          case flatfileencoding:
            return Promise.resolve(FlatFileEncodingStaticResultSchema);
          default:
            break;
        }
        break;

      case apiManagementConnectorId.toLowerCase():
        return Promise.resolve(HttpStaticResultSchema);
      case dataOperationConnectorId.toLowerCase():
        switch (operationId.toLowerCase()) {
          case parsejson:
            return Promise.resolve(ParseJsonStaticResultSchema);
          case query:
          case select:
            return Promise.resolve(QueryStaticResultSchema);
          default:
            break;
        }

        break;
      default:
        if (
          (isSharedManagedConnectorId(connectorId) ||
            isSharedManagedConnectorIdFromPApps(connectorId) ||
            isCustomConnectorId(connectorId) ||
            isManagedConnectorId(connectorId)) &&
          parser
        ) {
          return getStaticResultSchemaForAPIConnector(operationId, parser);
        }

        break;
    }
    return Promise.resolve(undefined);
  }
}
