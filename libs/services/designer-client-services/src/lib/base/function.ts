import { getAzureResourceRecursive } from '../common/azure';
import type { ListDynamicValue } from '../connector';
import type { IFunctionService } from '../function';
import { isFunctionContainer } from '../helpers';
import type { IHttpClient } from '../httpClient';
import { ResponseCodes, SwaggerParser } from '@microsoft/logic-apps-shared';
import { ArgumentException, unmap } from '@microsoft/logic-apps-shared';

export interface BaseFunctionServiceOptions {
  baseUrl: string;
  apiVersion: string;
  subscriptionId: string;
  httpClient: IHttpClient;
}

export class BaseFunctionService implements IFunctionService {
  constructor(public readonly options: BaseFunctionServiceOptions) {
    const { apiVersion, subscriptionId, httpClient } = options;
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    } else if (!subscriptionId) {
      throw new ArgumentException('subscriptionId required');
    } else if (!httpClient) {
      throw new ArgumentException('httpClient required for workflow app');
    }
  }

  private getFunctionAppsRequestPath(): string {
    return `/subscriptions/${this.options.subscriptionId}/providers/Microsoft.Web/sites`;
  }

  async fetchFunctionApps(): Promise<any> {
    const { apiVersion, httpClient } = this.options;

    const uri = this.getFunctionAppsRequestPath();
    const queryParameters = { 'api-version': apiVersion };
    const response = await getAzureResourceRecursive(httpClient, uri, queryParameters);
    return response.filter((app: any) => isFunctionContainer(app.kind));
  }

  async fetchFunctionAppsFunctions(functionAppId: string) {
    const { baseUrl, apiVersion, httpClient } = this.options;

    const uri = `${baseUrl}/${functionAppId}/functions`;
    const queryParameters = { 'api-version': apiVersion };
    const response = await getAzureResourceRecursive(httpClient, uri, queryParameters);
    return response ?? [];
  }

  async fetchFunctionKey(functionId: string) {
    const { baseUrl, apiVersion, httpClient } = this.options;
    const keysResponse = await httpClient.post<any, any>({
      uri: `${baseUrl}/${functionId}/listkeys`,
      queryParameters: { 'api-version': apiVersion },
    });
    return keysResponse?.default ?? 'NotFound';
  }

  async fetchSwaggerUrl(functionAppId: string) {
    const { baseUrl } = this.options;
    const response = await this.options.httpClient.get<any>({
      uri: `${baseUrl}/${functionAppId}/config/web`,
      queryParameters: { 'api-version': this.options.apiVersion },
    });
    if (!response?.properties?.apiDefinition?.url) {
      throw new Error('ApiDefinitionUrl not found');
    }
    return response.properties.apiDefinition.url;
  }

  private async fetchFunctionSwagger(swaggerUrl: string) {
    const response = await this.options.httpClient.get<any>({
      uri: swaggerUrl,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
    const swaggerDoc = await SwaggerParser.parse(response);
    return new SwaggerParser(swaggerDoc);
  }

  public async fetchFunctionAppSwagger(functionAppId: string) {
    const apiDefinitionUrl = await this.fetchSwaggerUrl(functionAppId);
    return this.fetchFunctionSwagger(apiDefinitionUrl);
  }

  public async getOperationSchema(functionAppId: string, operationId: string, isInput: boolean): Promise<any> {
    const swagger = await this.fetchFunctionAppSwagger(functionAppId);
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
      const basePath = swagger?.api?.basePath ?? '';
      schema.properties = {
        method: { type: 'string', default: operation.method, 'x-ms-visibility': 'hideInUI' },
        uri: {
          type: 'string',
          default: `${baseUrl}${basePath}${operation.path}`,
          'x-ms-visibility': 'hideInUI',
          'x-ms-serialization': { property: { type: 'pathtemplate', parameterReference: 'operationDetails.pathParameters' } },
        },
      };
      schema.required = ['method', 'uri'];
      for (const parameter of rawOperation.parameters ?? []) {
        this._addParameterInSchema(schema, parameter);
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
          'x-ms-deserialization': { type: 'pathtemplateproperties', parameterReference: `operationDetails.uri` },
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

  async getOperations(functionAppId: string): Promise<ListDynamicValue[]> {
    const swagger = await this.fetchFunctionAppSwagger(functionAppId);
    const operations = swagger.getOperations();

    return unmap(operations).map((operation: any) => ({
      value: operation.operationId,
      displayName: operation.summary ?? operation.operationId,
      description: operation.description,
    }));
  }
}
