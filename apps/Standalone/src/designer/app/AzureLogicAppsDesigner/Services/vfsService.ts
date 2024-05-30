import type { VFSObject } from '@microsoft/logic-apps-shared';
import axios from 'axios';
import { environment } from '../../../../environments/environment';
import { HybridAppUtility } from '../Utilities/HybridAppUtilities';

const params = {
  relativePath: 1,
  'api-version': '2018-11-01',
};

export const fetchFilesFromFolder = async (uri: string): Promise<VFSObject[]> => {
  if (HybridAppUtility.isHybridLogicApp(uri)) {
    return await HybridAppUtility.getProxy(
      `${uri}/?relativePath=1`,
      null,
      {
        Authorization: `Bearer ${environment.armToken}`,
      },
      null
    );
  }

  return (
    await axios.get<VFSObject[]>(uri, {
      headers: {
        Authorization: `Bearer ${environment.armToken}`,
      },
      params,
    })
  ).data;
};

export const fetchFileData = async <T>(uri: string): Promise<T> => {
  return (
    await axios.get<T>(uri, {
      headers: {
        Authorization: `Bearer ${environment.armToken}`,
        'If-Match': ['*'],
      },
      params,
    })
  ).data;
};
