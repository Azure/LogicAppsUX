import type { IApiManagementService } from '../apimanagement';
import type { ListDynamicValue } from '../connector';
import type { IHttpClient } from '../httpClient';
import { ResponseCodes, SwaggerParser } from '@microsoft/parsers-logic-apps';
import { ArgumentException, equals, unmap } from '@microsoft/utils-logic-apps';
import { QueryClient } from 'react-query';

export interface ApiManagementServiceOptions {
  apiVersion: string;
  baseUrl: string;
  subscriptionId: string;
  httpClient: IHttpClient;
}

export class ApiManagementInstanceService implements IApiManagementService {
  private _swaggers: Record<string, SwaggerParser> = {};
  private queryClient: QueryClient;

  constructor(public readonly options: ApiManagementServiceOptions) {
    const { apiVersion, baseUrl, subscriptionId, httpClient } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    } else if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    } else if (!subscriptionId) {
      throw new ArgumentException('subscriptionId required');
    } else if (!httpClient) {
      throw new ArgumentException('httpClient required for workflow app');
    }
    this.queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          refetchInterval: false,
          refetchIntervalInBackground: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          refetchOnMount: false,
        },
      },
    });
  }

  async fetchApiManagementInstances(): Promise<any> {
    const { apiVersion, subscriptionId, httpClient } = this.options;
    const response = await httpClient.get<any>({
      uri: `/subscriptions/${subscriptionId}/providers/Microsoft.ApiManagement/service`,
      queryParameters: { 'api-version': apiVersion },
    });

    return response.value.filter((instance: any) => !equals(instance.sku ? instance.sku.name : '', 'Consumption'));
  }

  async fetchApisInApiM(apiInstanceId: string): Promise<any> {
    const { apiVersion, httpClient } = this.options;
    const response = await httpClient.get<any>({
      uri: `${apiInstanceId}/apis`,
      queryParameters: { 'api-version': apiVersion },
    });

    return response.value;
  }

  fetchApiMSwagger(apimApiId: string): Promise<any> {
    const { apiVersion, httpClient } = this.options;

    const response = httpClient.get<any>({
      uri: apimApiId,
      queryParameters: { 'api-version': apiVersion },
      headers: {
        accept: 'application/vnd.swagger.doc+json',
      },
    });
    return response;
  }

  public async getOperations(apimApiId: string): Promise<ListDynamicValue[]> {
    const swagger = await this._getSwaggerForAPIM(apimApiId);
    const operations = swagger.getOperations();

    return unmap(operations).map((operation) => ({
      value: operation.operationId,
      displayName: operation.summary ?? operation.operationId,
      description: operation.description,
    }));
  }

  public async getOperationSchema(apimApiId: string, operationId: string, isInput: boolean): Promise<any> {
    const swagger = await this._getSwaggerForAPIM(apimApiId);
    const operation = swagger.getOperationByOperationId(operationId);
    const paths = swagger.api.paths[operation.path];
    const rawOperation = paths[operation.method];
    const schema = { type: 'object', properties: {} as any, required: [] as string[] };

    if (isInput) {
      schema.properties = {
        method: { type: 'string', default: operation.method, 'x-ms-visibility': 'hideInUI' },
        pathTemplate: {
          type: 'object',
          properties: {
            template: { type: 'string', default: operation.path, 'x-ms-visibility': 'hideInUI' },
          },
          required: ['template'],
        },
      };
      schema.required = ['method', 'pathTemplate'];
      for (const parameter of rawOperation.parameters ?? []) {
        this._addParameterInSchema(schema, parameter);
      }
    } else {
      const { responses } = rawOperation;
      let response: any = {};

      if (responses[ResponseCodes.$200]) {
        response = responses[ResponseCodes.$200];
      } else if (responses[ResponseCodes.$201]) {
        response = responses[ResponseCodes.$201];
      } else if (responses[ResponseCodes.$default]) {
        response = responses[ResponseCodes.$default];
      }

      if (response.schema) {
        schema.properties['body'] = response.schema;
      }

      if (response.headers) {
        schema.properties['headers'] = response.headers;
      }
    }

    return schema;
  }

  private async _getSwaggerForAPIM(apimApiId: string): Promise<SwaggerParser> {
    const normalizedName = apimApiId.toLowerCase();
    if (this._swaggers[normalizedName]) {
      return this._swaggers[normalizedName];
    }

    const swagger = await this.queryClient.fetchQuery(['apimSwagger', apimApiId?.toLowerCase()], async () => {
      const swagger = await this.fetchApiMSwagger(apimApiId);
      return SwaggerParser.parse(swagger);
    });

    this._swaggers[normalizedName] = new SwaggerParser(swagger);
    return this._swaggers[normalizedName];
  }

  private _addParameterInSchema(finalSchema: any, parameter: any) {
    const schemaProperties = finalSchema.properties;
    const { in: $in, name, required, schema } = parameter;
    switch ($in) {
      case 'header':
      case 'query':
        // eslint-disable-next-line no-case-declarations
        const property = $in === 'header' ? 'headers' : 'queries';
        if (!schemaProperties[property]) {
          schemaProperties[property] = { type: 'object', properties: {}, required: [] };
        }

        schemaProperties[property].properties[name] = parameter;
        if (required) {
          schemaProperties[property].required.push(name);
        }
        break;
      case 'path':
        // eslint-disable-next-line no-case-declarations
        const pathProperty = 'pathTemplate';
        if (!schemaProperties[pathProperty].properties.parameters) {
          schemaProperties[pathProperty].properties.parameters = { type: 'object', properties: {}, required: [] };
          schemaProperties[pathProperty].required.push('parameters');
        }

        schemaProperties[pathProperty].properties.parameters.properties[name] = parameter;
        if (required) {
          schemaProperties[pathProperty].properties.parameters.required.push(name);
        }
        break;
      default:
        // eslint-disable-next-line no-param-reassign
        finalSchema.properties[$in] = schema;
        break;
    }
  }
}
