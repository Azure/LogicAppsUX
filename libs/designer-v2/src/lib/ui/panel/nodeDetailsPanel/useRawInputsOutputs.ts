import { useRunData } from '../../../core/state/workflow/workflowSelectors';
import { RunService } from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

export interface RawInputsOutputs {
  inputs: Record<string, any>;
  outputs: Record<string, any>;
}

const emptyData: RawInputsOutputs = { inputs: {}, outputs: {} };

/**
 * Fetches the raw (pre-binding) action inputs and outputs for a node.
 * Uses a shared React Query cache key so the data is fetched once and shared
 * across the MonitoringTab, NodeDetailsPanel, and DesignerContextualMenu.
 */
export const useRawInputsOutputs = (nodeId: string, options?: { enabled?: boolean }) => {
  const runData = useRunData(nodeId);

  const actionTrackingId = runData?.correlation?.actionTrackingId;
  const startTime = runData?.startTime;
  const endTime = runData?.endTime;

  const getActionInputsOutputs = useCallback(async (): Promise<RawInputsOutputs> => {
    const actionLinks = await RunService().getActionLinks(runData, nodeId);
    return {
      inputs: actionLinks.inputs ?? runData?.inputs ?? {},
      outputs: actionLinks.outputs ?? runData?.outputs ?? {},
    };
  }, [nodeId, runData]);

  return useQuery<RawInputsOutputs>(['actionInputsOutputs', { nodeId, actionTrackingId, startTime, endTime }], getActionInputsOutputs, {
    refetchOnWindowFocus: false,
    placeholderData: emptyData,
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
  });
};
