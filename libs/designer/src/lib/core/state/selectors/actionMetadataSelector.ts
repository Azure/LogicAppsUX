import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const useActionMetadata = (actionId?: string) => {
  return useSelector((state: RootState) => {
    if (!actionId) {
      return undefined;
    }
    return state.workflow.actions[actionId];
  });
};

export const useNodeMetadata = (nodeId?: string) => {
  return useSelector((state: RootState) => {
    if (!nodeId) {
      return undefined;
    }
    return state.workflow.nodesMetadata[nodeId];
  });
};
