import type { OperationInfo } from '@microsoft/logic-apps-shared';
import { getOperationManifest } from '../queries/operation';
import { getSupportedChannelsFromManifest } from '../actions/bjsworkflow/initialize';

export const getSupportedChannels = async (id: string, operationInfo: OperationInfo): Promise<any[]> => {
  if (operationInfo) {
    const manifest = await getOperationManifest(operationInfo);
    const supportedChannels = getSupportedChannelsFromManifest(id, { ...operationInfo, type: 'agent' }, manifest);
    return supportedChannels ?? [];
  }

  return [];
};
