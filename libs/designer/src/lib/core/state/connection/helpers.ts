import { type ConnectionReference, getResourceNameFromId, getUniqueName, type ConnectionReferences } from '@microsoft/logic-apps-shared';
import type { UpdateConnectionPayload } from '../../../core/actions/bjsworkflow/connections';
import { getExistingReferenceKey } from '../../../core/utils/connectors/connections';

export const getReferenceForConnection = (
  references: ConnectionReferences,
  payload: Omit<UpdateConnectionPayload, 'nodeId'>
): { key: string; reference?: ConnectionReference } => {
  const { connectionId, connectorId, connectionProperties, connectionRuntimeUrl, authentication } = payload;
  const existingReferenceKey = getExistingReferenceKey(references, payload);

  if (existingReferenceKey) {
    return { key: existingReferenceKey };
  }

  const { name: newReferenceKey } = getUniqueName(Object.keys(references), connectorId.split('/').at(-1) as string);
  return {
    key: newReferenceKey,
    reference: {
      api: { id: connectorId },
      connection: { id: connectionId },
      connectionName: getResourceNameFromId(connectionId),
      connectionProperties,
      connectionRuntimeUrl,
      authentication,
    },
  };
};
