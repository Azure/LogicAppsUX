import type { IAppServiceService } from '../appService';
import type { ListDynamicValue } from '../connector';
import { areSwaggerOperationPathsMatching } from '../helpers';
import type { IHttpClient } from '../httpClient';
import { ResponseCodes, SwaggerParser } from '@microsoft/parsers-logic-apps';
import { ArgumentException, equals, unmap } from '@microsoft/utils-logic-apps';

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

  protected getAppServiceRequestPath(): string {
    return `/subscriptions/${this.options.subscriptionId}/providers/Microsoft.Web/sites`;
  }

  async fetchAppServices(): Promise<any> {
    const functionAppsResponse = await this.options.httpClient.get<any>({
      uri: this.getAppServiceRequestPath(),
      queryParameters: {
        'api-version': this.options.apiVersion,
        propertiesToInclude: 'SiteConfig',
      },
    });

    const apps = functionAppsResponse.value.filter(connectorIsAppService);
    return apps;
  }

  public async fetchAppServiceApiSwagger(swaggerUrl: string): Promise<any> {
    const response = await this.options.httpClient.get<any>({
      uri: swaggerUrl,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
    const swaggerDoc = await SwaggerParser.parse(response);
    return new SwaggerParser(swaggerDoc);
  }

  public async getOperationSchema(swaggerUrl: string, operationId: string, isInput: boolean): Promise<any> {
    const swagger = await this.fetchAppServiceApiSwagger(swaggerUrl);

    const operation = swagger.getOperationByOperationId(operationId);
    if (!operation) throw new Error('Operation not found');

    const paths = swagger.api.paths[operation.path];
    const rawOperation = paths[operation.method];
    const schema = { type: 'object', properties: {} as any, required: [] as string[] };

    if (isInput) {
      schema.properties = {
        method: { type: 'string', default: operation.method, 'x-ms-visibility': 'hideInUI' },
        uri: { type: 'string', default: `https://${swagger.api.host}${operation.path}`, 'x-ms-visibility': 'hideInUI' },
        pathTemplate: {
          type: 'object',
          properties: {
            template: { type: 'string', default: operation.path, 'x-ms-visibility': 'hideInUI' },
          },
          required: ['template'],
        },
      };
      schema.required = ['method', 'pathTemplate', 'uri'];
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
        const pathProperty = 'pathTemplate';
        if (!schemaProperties[pathProperty].properties.parameters) {
          schemaProperties[pathProperty].properties.parameters = { type: 'object', properties: {}, required: [] };
          schemaProperties[pathProperty].required.push('parameters');
        }

        schemaProperties[pathProperty].properties.parameters.properties[name] = parameter;
        if (required) schemaProperties[pathProperty].properties.parameters.required.push(name);
        break;
      }
      default: {
        // eslint-disable-next-line no-param-reassign
        finalSchema.properties[$in] = schema;
        break;
      }
    }
  }

  public async getOperations(swaggerUrl: string): Promise<ListDynamicValue[]> {
    const swagger = await this.fetchAppServiceApiSwagger(swaggerUrl);
    const operations = swagger.getOperations();

    return unmap(operations).map((operation: any) => ({
      value: operation.operationId,
      displayName: operation.summary ?? operation.operationId,
      description: operation.description,
    }));
  }

  public async getOperationFromPathAndMethod(swaggerUrl: string, fullPath: string, method: string): Promise<any> {
    const swagger = await this.fetchAppServiceApiSwagger(swaggerUrl);
    const path = fullPath.split(swagger.api.host ?? '').pop() ?? '';
    const operations = swagger.getOperations();
    return unmap(operations).find(
      (operation: any) => areSwaggerOperationPathsMatching(operation.path, path) && operation.method === method
    );
  }

  public async getOperationFromId(swaggerUrl: string, operationId: string): Promise<any> {
    const swagger = await this.fetchAppServiceApiSwagger(swaggerUrl);
    const operations = swagger.getOperations();
    return unmap(operations).find((operation: any) => operation.operationId === operationId);
  }
}

// tslint:disable-next-line: no-any
function connectorIsAppService(connector: any): boolean {
  if (isFunctionContainer(connector.kind)) return false;

  const url = connector?.properties?.siteConfig?.apiDefinition?.url;
  const allowedOrigins = connector?.properties?.siteConfig?.cors;
  return url && allowedOrigins;
}

export function isFunctionContainer(kind: any): boolean {
  if (typeof kind !== 'string') return false;

  const kinds = kind.split(',');
  return (
    kinds.some(($kind) => equals($kind, 'functionapp')) && !kinds.some(($kind) => equals($kind, 'botapp') || equals($kind, 'workflowapp'))
  );
}
