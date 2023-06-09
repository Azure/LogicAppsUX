import type { IFunctionService } from '../function';
import { isFunctionContainer } from '../helpers';
import type { IHttpClient } from '../httpClient';
import { SwaggerParser } from '@microsoft/parsers-logic-apps';
import { ArgumentException, unmap } from '@microsoft/utils-logic-apps';

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
    const functionAppsResponse = await this.options.httpClient.get<any>({
      uri: this.getFunctionAppsRequestPath(),
      queryParameters: { 'api-version': this.options.apiVersion },
    });

    const apps = functionAppsResponse.value.filter((app: any) => isFunctionContainer(app.kind));
    return apps;
  }

  async fetchFunctionAppsFunctions(functionAppId: string) {
    const { baseUrl } = this.options;
    const functionsResponse = await this.options.httpClient.get<any>({
      uri: `${baseUrl}/${functionAppId}/functions`,
      queryParameters: { 'api-version': this.options.apiVersion },
    });
    return functionsResponse?.value ?? [];
  }

  async fetchFunctionKey(functionId: string) {
    const { baseUrl } = this.options;
    const keysResponse = await this.options.httpClient.post<any, any>({
      uri: `${baseUrl}/${functionId}/listkeys`,
      queryParameters: { 'api-version': this.options.apiVersion },
    });
    return keysResponse?.default ?? 'NotFound';
  }

  private async fetchApiDefinitionUrl(functionAppId: string) {
    const response = await this.options.httpClient.get<any>({
      uri: `https://management.azure.com/${functionAppId}/config/web`,
      queryParameters: { 'api-version': this.options.apiVersion },
    });
    if (!response?.properties?.apiDefinition?.url) {
      throw new Error('ApiDefinitionUrl not found');
    }
    return response?.properties?.apiDefinition?.url ?? '';
  }

  private async fetchApiDefinition(apiDefinitionUrl: string) {
    const response = await this.options.httpClient.get<any>({
      uri: apiDefinitionUrl,
    });
    return response;
  }

  private async fetchFunctionAppSwagger(functionAppId: string) {
    const apiDefinitionUrl = await this.fetchApiDefinitionUrl(functionAppId);
    const response = await this.fetchApiDefinition(apiDefinitionUrl);
    const swaggerDoc = await SwaggerParser.parse(response);
    return new SwaggerParser(swaggerDoc);
  }

  async fetchFunctionAppsSwaggerFunctions(functionAppId: string) {
    try {
      const swagger = await this.fetchFunctionAppSwagger(functionAppId);

      const functions = swagger.getOperations();

      return unmap(functions).map((swaggerFunction: any) => ({
        id: swaggerFunction.operationId,
        // value: swaggerFunction.operationId,
        name: swaggerFunction.summary ?? swaggerFunction.operationId,
        // description: swaggerFunction.description,
      }));
    } catch (error) {
      console.error(error);
      return [];
    }
  }
}
