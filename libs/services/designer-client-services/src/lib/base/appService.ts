import type { IAppServiceService } from '../appService';
import type { ListDynamicValue } from '../connector';
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

  public async getOperationSchema(swaggerUrl: string, operationData: any, isInput: boolean): Promise<any> {
    const { operationId, operationPath, operationMethod } = operationData;
    const swagger = await this.fetchAppServiceApiSwagger(swaggerUrl);
    console.log('$$$ getting schema for operation', operationData, swagger);

    let operation;
    if (operationId) operation = swagger.getOperationByOperationId(operationId);
    else if (operationPath && operationMethod) operation = swagger.getOperationByPathAndMethod(operationPath, operationMethod);
    if (!operation) throw new Error('Operation not found');

    console.log('$$$ operation', operation);

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

    console.log('%%% appservice > operations: ', operations);

    return unmap(operations).map((operation: any) => ({
      value: operation.operationId,
      displayName: operation.summary ?? operation.operationId,
      description: operation.description,
    }));
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
