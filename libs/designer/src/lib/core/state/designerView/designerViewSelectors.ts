import { equals, enableAgentConsumption } from '@microsoft/logic-apps-shared';
import type { RootState } from '../../store';
import { useSelector } from 'react-redux';
import { useEffect, useMemo, useState } from 'react';

export const useShowMinimap = () => {
  return useSelector((state: RootState) => state.designerView.showMinimap);
};

export const useClampPan = () => {
  return useSelector((state: RootState) => state.designerView.clampPan);
};

export const useShowDeleteModalNodeId = () => {
  return useSelector((state: RootState) => state.designerView.showDeleteModalNodeId);
};

export const useNodeContextMenuData = () => {
  return useSelector((state: RootState) => state.designerView.nodeContextMenuData);
};

export const useEdgeContextMenuData = () => {
  return useSelector((state: RootState) => state.designerView.edgeContextMenuData);
};

export const useIsAgenticWorkflow = (): boolean => {
  const workflowKind = useSelector((state: RootState) => state.workflow.workflowKind);
  const [isEnabledForConsumption, setIsEnabledForConsumption] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkFeatureFlag = async () => {
      try {
        const enabled = await enableAgentConsumption();
        if (!cancelled) {
          setIsEnabledForConsumption(enabled);
        }
      } catch {
        if (!cancelled) {
          setIsEnabledForConsumption(false);
        }
      }
    };

    checkFeatureFlag();

    return () => {
      cancelled = true;
    };
  }, []);

  const isAgenticOrStateful = useMemo(() => {
    return equals(workflowKind, 'agentic', true) || equals(workflowKind, 'stateful', true);
  }, [workflowKind]);

  if (isEnabledForConsumption) {
    return !workflowKind || isAgenticOrStateful;
  }

  return isAgenticOrStateful;
};

// Temporary hook for backwards compatibility with agentic wf, TODO: delete once stateful is merged in
export const useIsAgenticWorkflowOnly = () => {
  const workflowKind = useSelector((state: RootState) => state.workflow.workflowKind);
  return equals(workflowKind, 'agentic', true);
};

export const useIsA2AWorkflow = () => {
  return useSelector((state: RootState) => {
    const isStandardA2A = equals(state.workflow.workflowKind, 'agent', false);
    if (isStandardA2A) {
      return true;
    }
    const operations = state.workflow.operations;
    const nodesMetadata = state.workflow.nodesMetadata;

    const triggerNodeId = Object.keys(nodesMetadata).find((nodeId) => nodesMetadata[nodeId]?.isTrigger === true);

    if (triggerNodeId) {
      const triggerOperation = operations[triggerNodeId];

      if (triggerOperation) {
        // For Consumption A2A: Must be Request type AND Agent kind
        const isRequestType = equals(triggerOperation.type, 'Request', true);
        const isAgentKind = equals(triggerOperation.kind, 'Agent', true);

        return isRequestType && isAgentKind;
      }
    }

    return false;
  });
};

export const useWorkflowHasAgentLoop = () => {
  return useSelector((state: RootState) =>
    Object.values(state.workflow.operations).some((operation) => equals(operation.type, 'Agent', true))
  );
};
