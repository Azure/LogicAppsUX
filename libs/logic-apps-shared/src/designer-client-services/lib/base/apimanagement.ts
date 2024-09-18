import { getIntl } from '../../../intl/src';
import { ResponseCodes, SwaggerParser } from '../../../parsers';
import { ArgumentException, equals, includes, unmap } from '../../../utils/src';
import type { IApiManagementService } from '../apimanagement';
import { getAzureResourceRecursive } from '../common/azure';
import type { ListDynamicValue } from '../connector';
import type { IHttpClient } from '../httpClient';

import type { QueryClient } from '@tanstack/react-query';

export interface ApiManagementServiceOptions {
  apiVersion: string;
  baseUrl: string;
  subscriptionId: string;
  httpClient: IHttpClient;
  queryClient: QueryClient;
  includeBasePathInTemplate?: boolean;
}

export class BaseApiManagementService implements IApiManagementService {
  private _swaggers: Record<string, SwaggerParser> = {};

  constructor(public readonly options: ApiManagementServiceOptions) {
    const { apiVersion, baseUrl, subscriptionId, httpClient, queryClient } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    }
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    }
    if (!subscriptionId) {
      throw new ArgumentException('subscriptionId required');
    }
    if (!httpClient) {
      throw new ArgumentException('httpClient required for api management service');
    }
    if (!queryClient) {
      throw new ArgumentException('queryClient required for api management service');
    }
  }

  async fetchApiManagementInstances(): Promise<any> {
    const { apiVersion, subscriptionId, httpClient } = this.options;

    const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.ApiManagement/service`;
    const queryParameters = { 'api-version': apiVersion };
    const response = await getAzureResourceRecursive(httpClient, uri, queryParameters);

    return response.filter((instance: any) => !equals(instance.sku ? instance.sku.name : '', 'Consumption'));
  }

  async fetchApisInApiM(apiInstanceId: string): Promise<any> {
    const { apiVersion, httpClient } = this.options;

    const uri = `${apiInstanceId}/apis`;
    const queryParameters = { 'api-version': apiVersion };
    const response = await getAzureResourceRecursive(httpClient, uri, queryParameters);

    return response;
  }

  public async fetchApiMSwagger(apimApiId: string): Promise<SwaggerParser> {
    const normalizedName = apimApiId.toLowerCase();
    if (this._swaggers[normalizedName]) {
      return this._swaggers[normalizedName];
    }

    const swagger = await this.options.queryClient.fetchQuery(['apimSwagger', apimApiId?.toLowerCase()], async () => {
      const swagger = await this._getSwaggerForAPIM(apimApiId);
      return SwaggerParser.parse(swagger);
    });

    this._swaggers[normalizedName] = new SwaggerParser(swagger);
    return this._swaggers[normalizedName];
  }

  public async getOperations(apimApiId: string): Promise<ListDynamicValue[]> {
    const swagger = await this.fetchApiMSwagger(apimApiId);
    const operations = swagger.getOperations();

    return unmap(operations).map((operation) => ({
      value: operation.operationId,
      displayName: operation.summary ?? operation.operationId,
      description: operation.description,
    }));
  }

  public async getOperationSchema(apimApiId: string, operationId: string, isInput: boolean): Promise<any> {
    const swagger = await this.fetchApiMSwagger(apimApiId);
    const operation = swagger.getOperationByOperationId(operationId);

    if (!operation) {
      throw new Error('APIM Operation not found');
    }

    const intl = getIntl();
    const paths = swagger.api.paths[operation.path];
    const rawOperation = paths[operation.method];
    const schema = { type: 'object', properties: {} as any, required: [] as string[] };

    if (isInput) {
      schema.properties = {
        method: { type: 'string', title: 'Method', default: operation.method, 'x-ms-visibility': 'hideInUI' },
        pathTemplate: {
          type: 'object',
          properties: {
            template: {
              type: 'string',
              title: 'Path Template',
              default: this.options.includeBasePathInTemplate
                ? swagger.api.basePath
                  ? `${swagger.api.basePath}${operation.path}`
                  : operation.path
                : operation.path,
              'x-ms-visibility': 'hideInUI',
            },
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
        schema.properties['body'] = {
          title: intl.formatMessage({ defaultMessage: 'Body', id: 'VZh+w2', description: 'Title for body outputs' }),
          ...response.schema,
        };
      }
      if (response.headers) {
        schema.properties['headers'] = {
          title: intl.formatMessage({ defaultMessage: 'Headers', id: 'voRDKP', description: 'Title for header outputs' }),
          ...response.headers,
        };
      }
    }

    // APIM apis in portal do not allow marking the body as required, so we are doing it here
    //     Users can mark body parameters as required,
    //     and to show them as required the body needs to also be marked as required
    if ((schema?.properties?.['body']?.required ?? []).length > 0) {
      schema.required.push('body');
    }

    return schema;
  }

  private async _getSwaggerForAPIM(apimApiId: string): Promise<any> {
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

  private _addParameterInSchema(finalSchema: any, parameter: any) {
    const schemaProperties = finalSchema.properties;
    const { in: $in, name, required, schema } = parameter;
    switch ($in) {
      case 'header':
      case 'query': {
        const property = $in === 'header' ? 'headers' : 'queries';
        this._setScalarParameterInSchema(finalSchema, property, parameter);
        break;
      }
      case 'path': {
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
      }
      case 'formData': {
        const formDataParameter = {
          ...parameter,
          'x-ms-serialization': { property: { type: 'formdata', parameterReference: `formData.$.${name}` } },
        };
        if (parameter.type === 'file') {
          if (!includes(name, '"') && !includes(name, '@')) {
            const intl = getIntl();
            const properties: Record<string, any> = {
              $content: {
                ...parameter,
                type: undefined,
                'x-ms-summary': intl.formatMessage(
                  { defaultMessage: '{fileContent} (content)', id: 'Rj/V1x', description: 'Title for file name parameter' },
                  { fileContent: parameter['x-ms-summary'] ?? name }
                ),
                'x-ms-serialization': { property: { type: 'formdata', parameterReference: `formData.$.${name}.$content` } },
                name: undefined,
              },
            };
            if (parameter.format !== 'contentonly') {
              properties['$filename'] = {
                ...parameter,
                type: 'string',
                'x-ms-summary': intl.formatMessage(
                  { defaultMessage: '{fileName} (file name)', id: 'UYRIS/', description: 'Title for file name parameter' },
                  { fileName: parameter['x-ms-summary'] ?? name }
                ),
                'x-ms-serialization': { property: { type: 'formdata', parameterReference: `formData.$.${name}.$filename` } },
                name: undefined,
              };
            }

            this._setScalarParameterInSchema(finalSchema, $in, {
              ...formDataParameter,
              type: 'object',
              properties,
              required: required ? ['$content'] : [],
            });
          }

          break;
        }

        this._setScalarParameterInSchema(finalSchema, $in, formDataParameter);
        break;
      }
      default: {
        // eslint-disable-next-line no-param-reassign
        finalSchema.properties[$in] = schema;
        break;
      }
    }
  }

  private _setScalarParameterInSchema(finalSchema: any, property: any, parameter: any) {
    const schemaProperties = finalSchema.properties;
    const { name, required } = parameter;

    if (!schemaProperties[property]) {
      schemaProperties[property] = { type: 'object', properties: {}, required: [] };
    }

    schemaProperties[property].properties[name] = parameter;
    if (required) {
      schemaProperties[property].required.push(name);
      if (!finalSchema.required.includes(property)) {
        finalSchema.required.push(property);
      }
    }
  }
}
