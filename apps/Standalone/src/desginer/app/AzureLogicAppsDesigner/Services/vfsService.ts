import { VFSObject } from '@microsoft/logic-apps-shared';
import axios from 'axios';
import { environment } from '../../../../environments/environment';

export const fetchFilesFromFolder = async (uri: string): Promise<VFSObject[]> => {
  return (
    await axios.get<VFSObject[]>(uri, {
      headers: {
        Authorization: `Bearer ${environment.armToken}`,
      },
      params: {
        relativePath: 1,
        'api-version': '2018-11-01',
      },
    })
  ).data;
};

export const fetchFileData = async (uri: string): Promise<string> => {
  return (
    await axios.get<string>(uri, {
      headers: {
        Authorization: `Bearer ${environment.armToken}`,
        'If-Match': ['*'],
      },
      params: {
        relativePath: 1,
        'api-version': '2018-11-01',
      },
    })
  ).data;
};
