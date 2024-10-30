import axios from 'axios';

export class HybridAppUtility {
  public static getHybridAppBaseRelativeUrl(appId: string | undefined): string {
    if (!appId) {
      throw new Error(`Invalid value for appId: '${appId}'`);
    }

    return `${appId}/providers/Microsoft.App/logicApps/${appId.split('/').pop()}`;
  }

  public static async getProxy<T>(uri: string, data: any, headers: Record<string, string>, params?: Record<string, any>): Promise<T> {
    const [baseUri, path] = uri.split('hostruntime');
    const appName = baseUri.split('/');
    appName.pop();

    return (
      await axios.post<T>(`${baseUri}providers/Microsoft.App/logicapps/${appName.pop()}/invoke?api-version=2024-02-02-preview`, data, {
        headers: {
          ...headers,
          'x-ms-logicapps-proxy-path': `${path}`,
          'x-ms-logicapps-proxy-method': 'GET',
        },
        params,
      })
    ).data;
  }

  public static async postProxy<T>(uri: string, data: any, headers: Record<string, string>, params?: Record<string, any>): Promise<T> {
    const splitUri = uri.split('/hostruntime/');
    const appName = splitUri[0].split('/').pop();
    return (
      await axios.post<T>(`${splitUri[0]}/providers/Microsoft.App/logicapps/${appName}/invoke?api-version=2024-02-02-preview`, data, {
        headers: {
          ...headers,
          'x-ms-logicapps-proxy-path': `/${splitUri[1]}`,
          'x-ms-logicapps-proxy-method': 'POST',
        },
        params,
      })
    ).data;
  }

  public static async postProxyResponse<T>(uri: string, data: any, headers: Record<string, string>, params?: Record<string, any>) {
    const [baseUri, path] = uri.split('/hostruntime/');
    const appName = baseUri.split('/').pop();

    return await axios.post<T>(`${baseUri}/providers/Microsoft.App/logicapps/${appName}/invoke?api-version=2024-02-02-preview`, data, {
      headers: {
        ...headers,
        'x-ms-logicapps-proxy-path': `${path}/`,
        'x-ms-logicapps-proxy-method': 'POST',
      },
      params,
    });
  }

  public static isHybridLogicApp(uri: string) {
    return uri.toLowerCase().includes('microsoft.app');
  }
}
