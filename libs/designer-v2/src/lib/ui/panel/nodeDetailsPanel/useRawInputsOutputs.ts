import { useNodeMetadata, useRunData, useSelectedLoopRepetition } from '../../../core/state/workflow/workflowSelectors';
import { RunService } from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

export interface RawInputsOutputs {
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  loopPayloadRevision?: string;
}

const emptyData: RawInputsOutputs = { inputs: {}, outputs: {} };

/**
 * Fetches the raw (pre-binding) action inputs and outputs for a node.
 * Uses a shared React Query cache key so the data is fetched once and shared
 * across the MonitoringTab, NodeDetailsPanel, and DesignerContextualMenu.
 */
export const useRawInputsOutputs = (nodeId: string, options?: { enabled?: boolean }) => {
  const runData = useRunData(nodeId);
  const loopRepetition = useSelectedLoopRepetition(nodeId);
  const scopedMetadata = useNodeMetadata(loopRepetition && runData ? nodeId : undefined);
  const loopPayloadRevision = scopedMetadata?.loopPayloadRevision;
  // Binding mutates the display data, not the response used for raw I/O and inline fallback.
  const payloadSource = loopRepetition ? scopedMetadata?.runDataRepetitionSource : runData;

  const actionTrackingId = runData?.correlation?.actionTrackingId;
  const startTime = runData?.startTime;
  const endTime = runData?.endTime;

  const getActionInputsOutputs = useCallback(async (): Promise<RawInputsOutputs> => {
    const actionLinks = await RunService().getActionLinks(runData, nodeId);
    const resolveSide = (
      linkedValue: Record<string, any> | undefined,
      inlineValue: Record<string, any> | undefined,
      hasContentLink: boolean
    ) => {
      if (hasContentLink) {
        return linkedValue ?? {};
      }
      // Production run services return `{}` when a side has no content link, which would mask
      // inline repetition payloads if merged with `??`. Prefer raw inline repetition data when
      // present on the unmutated repetition source.
      if (loopRepetition && inlineValue !== undefined) {
        return inlineValue;
      }
      return linkedValue ?? inlineValue ?? {};
    };
    return {
      inputs: resolveSide(actionLinks.inputs, payloadSource?.inputs, !!runData?.inputsLink?.uri),
      outputs: resolveSide(actionLinks.outputs, payloadSource?.outputs, !!runData?.outputsLink?.uri),
      ...(loopRepetition && { loopPayloadRevision }),
    };
  }, [nodeId, runData, payloadSource, loopRepetition, loopPayloadRevision]);

  return useQuery<RawInputsOutputs>(
    [
      'actionInputsOutputs',
      loopRepetition ? { nodeId, loopRepetition, loopPayloadRevision } : { nodeId, actionTrackingId, startTime, endTime },
    ],
    getActionInputsOutputs,
    {
      refetchOnWindowFocus: false,
      placeholderData: emptyData,
      ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
      ...(loopRepetition && {
        enabled: !!payloadSource && !!loopPayloadRevision && options?.enabled !== false,
        keepPreviousData: false,
        refetchOnMount: false,
      }),
    }
  );
};
