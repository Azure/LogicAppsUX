import { useSelector } from 'react-redux';
import type { RootState } from './store';
import { equals, type ConnectionReference } from '@microsoft/logic-apps-shared';

export const useAllReferenceKeys = (): string[] => {
  const state = useSelector((state: RootState) => state.connection);
  return Object.keys(state.connectionReferences);
};

export const useConnectionReference = (): ConnectionReference | undefined => {
  const state = useSelector((state: RootState) => state.connection);
  const operationsGroupedByReferences = getOperationsGroupedByReferences(state.connectionsMapping as Record<string, string>);

  // There should be only one reference per connector, and in first release it is only one connector so defaulting to the first one.
  const firstReferenceKey = Object.keys(operationsGroupedByReferences)[0] as string;
  return state.connectionReferences[firstReferenceKey];
};

export const useOperationNodeIds = (connectorId: string): string[] => {
  const state = useSelector((state: RootState) => state.connection);
  const operationsGroupedByReferences = getOperationsGroupedByReferences(state.connectionsMapping as Record<string, string>);

  for (const [referenceKey, nodeIds] of Object.entries(operationsGroupedByReferences)) {
    const connectionReference = state.connectionReferences[referenceKey];
    if (connectionReference && equals(connectionReference.api.id, connectorId)) {
      return nodeIds;
    }
  }

  return [];
};

const getOperationsGroupedByReferences = (mapping: Record<string, string>): Record<string, string[]> => {
  return Object.entries(mapping).reduce((result: Record<string, string[]>, [nodeId, referenceKey]) => {
    if (!result[referenceKey]) {
      result[referenceKey] = [];
    }

    result[referenceKey].push(nodeId);
    return result;
  }, {});
};
