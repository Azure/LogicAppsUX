import { VFSObject } from '@microsoft/logic-apps-shared';
import axios from 'axios';
import { environment } from '../../../../environments/environment';

const params = {
  relativePath: 1,
  'api-version': '2018-11-01',
};

export const fetchFilesFromFolder = async (uri: string): Promise<VFSObject[]> => {
  return (
    await axios.get<VFSObject[]>(uri, {
      headers: {
        Authorization: `Bearer ${environment.armToken}`,
      },
      params,
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
      params,
    })
  ).data;
};
