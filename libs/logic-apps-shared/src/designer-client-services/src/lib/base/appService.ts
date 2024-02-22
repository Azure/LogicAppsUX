import type { IAppServiceService } from '../appService';
import { getAzureResourceRecursive } from '../common/azure';
import type { ListDynamicValue } from '../connector';
import { isFunctionContainer } from '../helpers';
import type { IHttpClient } from '../httpClient';
import { ResponseCodes, SwaggerParser } from '@microsoft/logic-apps-shared';
import { ArgumentException, unmap } from '@microsoft/logic-apps-shared';

export interface BaseAppServiceServiceOptions {
  baseUrl: string;
  apiVersion: string;
  subscriptionId: string;
  httpClient: IHttpClient;
}

export class BaseAppServiceService implements IAppServiceService {
  constructor(public readonly options: BaseAppServiceServiceOptions) {
    const { apiVersion, subscriptionId, httpClient } = options;
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    } else if (!subscriptionId) {
      throw new ArgumentException('subscriptionId required');
    } else if (!httpClient) {
      throw new ArgumentException('httpClient required for workflow app');
    }
  }

  async fetchAppServices(): Promise<any> {
    const { apiVersion, subscriptionId, httpClient } = this.options;

    const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/sites`;
    const queryParameters = {
      'api-version': apiVersion,
      propertiesToInclude: 'SiteConfig',
    };

    const response = await getAzureResourceRecursive(httpClient, uri, queryParameters);
    return response.filter(connectorIsAppService);
  }

  async getOperationSchema(
    swaggerUrl: string,
    operationId: string,
    isInput: boolean,
    supportsAuthenticationParameter: boolean
  ): Promise<any> {
    if (!swaggerUrl) return Promise.resolve();
    const swagger = await this.fetchAppServiceApiSwagger(swaggerUrl);
    if (!operationId) return Promise.resolve();
    const operation = swagger.getOperationByOperationId(operationId);
    if (!operation) throw new Error('Operation not found');

    const paths = swagger.api.paths[operation.path];
    const rawOperation = paths[operation.method];
    const schema = { type: 'object', properties: {} as any, required: [] as string[] };

    if (isInput) {
      const baseUrl = swagger.api.host
        ? swagger.api.schemes?.length
          ? `${swagger.api.schemes.at(-1)}://${swagger.api.host}`
          : `http://${swagger.api.host}`
        : 'NotFound';
      schema.properties = {
        method: { type: 'string', default: operation.method, 'x-ms-visibility': 'hideInUI' },
        uri: {
          type: 'string',
          default: swagger.api.basePath ? `${baseUrl}${swagger.api.basePath}${operation.path}` : `${baseUrl}${operation.path}`,
          'x-ms-visibility': 'hideInUI',
          'x-ms-serialization': { property: { type: 'pathtemplate', parameterReference: 'inputs.operationDetails.pathParameters' } },
        },
      };
      schema.required = ['method', 'uri'];
      for (const parameter of rawOperation.parameters ?? []) {
        this._addParameterInSchema(schema, parameter);
      }

      if (supportsAuthenticationParameter) {
        schema.properties['authentication'] = {
          type: 'object',
          title: 'Authentication',
          description: 'Enter JSON object of authentication parameter',
          'x-ms-visibility': 'advanced',
          'x-ms-editor': 'authentication',
          'x-ms-editor-options': {
            supportedAuthTypes: ['None', 'Basic', 'ClientCertificate', 'ActiveDirectoryOAuth', 'Raw', 'ManagedServiceIdentity'],
          },
        };
      }
    } else {
      const { responses } = rawOperation;
      let response: any = {};

      if (responses[ResponseCodes.$200]) response = responses[ResponseCodes.$200];
      else if (responses[ResponseCodes.$201]) response = responses[ResponseCodes.$201];
      else if (responses[ResponseCodes.$default]) response = responses[ResponseCodes.$default];

      if (response.schema) schema.properties['body'] = response.schema;
      if (response.headers) schema.properties['headers'] = response.headers;
    }

    return schema;
  }

  private _addParameterInSchema(finalSchema: any, parameter: any) {
    const schemaProperties = finalSchema.properties;
    const { in: $in, name, required, schema } = parameter;
    switch ($in) {
      case 'header':
      case 'query': {
        const property = $in === 'header' ? 'headers' : 'queries';
        if (!schemaProperties[property]) schemaProperties[property] = { type: 'object', properties: {}, required: [] };
        schemaProperties[property].properties[name] = parameter;
        if (required) schemaProperties[property].required.push(name);
        break;
      }
      case 'path': {
        const pathProperty = 'pathParameters';
        if (!finalSchema.properties[pathProperty]) {
          // eslint-disable-next-line no-param-reassign
          finalSchema.properties[pathProperty] = { type: 'object', properties: {}, required: [] };
          finalSchema.required.push(pathProperty);
        }

        schemaProperties[pathProperty].properties[name] = {
          ...parameter,
          'x-ms-deserialization': { type: 'pathtemplateproperties', parameterReference: `inputs.operationDetails.uri` },
        };
        if (required) schemaProperties[pathProperty].required.push(name);
        break;
      }
      default: {
        // eslint-disable-next-line no-param-reassign
        finalSchema.properties[$in] = schema;
        break;
      }
    }
  }

  async getOperations(swaggerUrl: string): Promise<ListDynamicValue[]> {
    const swagger = await this.fetchAppServiceApiSwagger(swaggerUrl);
    const operations = swagger.getOperations();

    return unmap(operations).map((operation: any) => ({
      value: operation.operationId,
      displayName: operation.summary ?? operation.operationId,
      description: operation.description,
    }));
  }

  private async fetchAppServiceApiSwagger(swaggerUrl: string): Promise<SwaggerParser> {
    const response = await this.options.httpClient.get<any>({
      uri: swaggerUrl,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
    const swaggerDoc = await SwaggerParser.parse(response);
    return new SwaggerParser(swaggerDoc);
  }
}

function connectorIsAppService(connector: any): boolean {
  if (isFunctionContainer(connector.kind)) return false;

  const url = connector?.properties?.siteConfig?.apiDefinition?.url;
  const allowedOrigins = connector?.properties?.siteConfig?.cors;
  return url && allowedOrigins;
}
