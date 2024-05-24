import type { VFSObject } from '@microsoft/logic-apps-shared';
import axios from 'axios';

export class HybridAppUtility {
  public static getHybridAppBaseRelativeUrl(appId: string | undefined): string {
    if (!appId) {
      throw new Error(`Invalid value for appId: '${appId}'`);
    }

    return `${appId}/providers/Microsoft.App/logicApps/${appId.split('/').pop()}`;
  }

  public static async postProxy(uri: string, data: object | null, headers: object, params: object | null): Promise<VFSObject[]> {
    const appName = uri.split('hostruntime')[0].split('/');
    appName.pop();

    return (
      await axios.post<VFSObject[]>(
        `${uri.split('hostruntime')[0]}/providers/Microsoft.App/logicapps/${appName.pop()}/invoke?api-version=2024-02-02-preview`,
        data,
        {
          headers: {
            ...headers,
            'x-ms-logicapps-proxy-path': `${uri.split('hostruntime')[1]}/?relativePath=1`,
            'x-ms-logicapps-proxy-method': 'GET',
          },
          params,
        }
      )
    ).data;
  }

  public static isHybridLogicApp(uri: string) {
    return uri.indexOf('providers/Microsoft.App/containerApps') !== -1;
  }
}
