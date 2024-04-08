import type { ICustomCodeService, UploadCustomCodeAppFilePayload, UploadCustomCodePayload } from '../customcode';
import type { IHttpClient } from '../httpClient';

export interface CustomCodeServiceOptions {
  apiVersion: string;
  baseUrl: string;
  subscriptionId: string;
  resourceGroup: string;
  appName: string;
  workflowName: string;
  httpClient: IHttpClient;
}

export class StandardCustomCodeService implements ICustomCodeService {
  constructor(public readonly options: CustomCodeServiceOptions) {
    const { apiVersion, baseUrl, subscriptionId, resourceGroup, appName, workflowName, httpClient } = this.options;
    if (!apiVersion) {
      throw new Error('apiVersion required');
    } else if (!baseUrl) {
      throw new Error('baseUrl required');
    } else if (!subscriptionId) {
      throw new Error('subscriptionId required');
    } else if (!resourceGroup) {
      throw new Error('resourceGroup required');
    } else if (!appName) {
      throw new Error('appName required');
    } else if (!workflowName) {
      throw new Error('workflowName required');
    } else if (!httpClient) {
      throw new Error('httpClient required');
    }
  }

  async uploadCustomCodeAppFile({ fileName, fileData }: UploadCustomCodeAppFilePayload): Promise<void> {
    const { apiVersion, baseUrl, subscriptionId, resourceGroup, appName, httpClient } = this.options;
    if (!(fileName && fileData)) return;
    const uri = `${baseUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${appName}/hostruntime/admin/vfs/${fileName}`;

    const queryParameters = {
      relativePath: 1,
      'api-version': apiVersion,
    };

    const headers = {
      'Cache-Control': 'no-cache',
      'If-Match': '*',
    };
    const blobifiedData = new Blob([fileData]);
    try {
      await httpClient.put<any, Blob>({
        uri,
        queryParameters,
        headers,
        content: blobifiedData,
      });
    } catch (error: any) {
      if (error?.httpStatusCode !== 404) {
        throw error;
      }
    }
  }

  async uploadCustomCode({ fileData, fileName, fileExtension }: UploadCustomCodePayload): Promise<void> {
    const { apiVersion, baseUrl, subscriptionId, resourceGroup, appName, workflowName, httpClient } = this.options;
    const contentType = fileExtension.substring(fileExtension.indexOf('.') + 1) ?? 'plain/text';
    const uri = `${baseUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${appName}/hostruntime/admin/vfs/${workflowName}/${fileName}`;

    const queryParameters = {
      relativePath: 1,
      'api-version': apiVersion,
    };

    const headers = {
      'Cache-Control': 'no-cache',
      'Content-Type': contentType,
      'If-Match': '*',
    };
    const blobifiedData = new Blob([fileData], { type: contentType });
    try {
      await httpClient.put<any, Blob>({
        uri,
        queryParameters,
        headers,
        content: blobifiedData,
      });
    } catch (error: any) {
      if (error?.httpStatusCode !== 404) {
        throw error;
      }
    }
  }

  async deleteCustomCode(fileName: string): Promise<void> {
    const { apiVersion, baseUrl, subscriptionId, resourceGroup, appName, workflowName, httpClient } = this.options;
    const uri = `${baseUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${appName}/hostruntime/admin/vfs/${workflowName}/${fileName}`;
    const headers: Record<string, string | string[]> = {
      'If-Match': ['*'],
    };
    const queryParameters = {
      relativePath: 1,
      'api-version': apiVersion,
    };
    try {
      await httpClient.delete({
        uri,
        queryParameters,
        headers,
      });
    } catch (error: any) {
      if (error?.httpStatusCode !== 404) {
        throw error;
      }
    }
  }
}
