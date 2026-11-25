import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import isEqual from 'lodash.isequal';
import type { useNodeRepetition } from '../queries/runs';
import { useNodeMetadata } from '../state/workflow/workflowSelectors';
import type { LoopRepetition } from '../state/workflow/workflowInterfaces';
import { setRepetitionRunData } from '../state/workflow/workflowSlice';
import { isSameLoopRepetition } from '../utils/loopRepetitions';

export function useLoopRepetitionAdmission(
  nodeId: string,
  repetition?: LoopRepetition,
  data?: ReturnType<typeof useNodeRepetition>['data']
) {
  const activeRepetition = repetition?.isEmpty ? undefined : repetition;
  const metadata = useNodeMetadata(activeRepetition ? nodeId : undefined);
  const response = data?.properties as LogicAppsV2.WorkflowRunAction | undefined;
  const loopPayloadRevision = data?.loopPayloadRevision;
  const hasCurrentResponse =
    !!activeRepetition &&
    isSameLoopRepetition(metadata?.runDataRepetition, activeRepetition) &&
    metadata?.loopPayloadRevision === loopPayloadRevision &&
    isEqual(metadata?.runDataRepetitionSource, response);
  const dispatch = useDispatch();

  // Metadata can be rebuilt while the query keeps the same key and result. Watch admission as well as the response.
  useEffect(() => {
    if (activeRepetition && response && loopPayloadRevision && !hasCurrentResponse) {
      dispatch(setRepetitionRunData({ nodeId, runData: response, loopRepetition: activeRepetition, loopPayloadRevision }));
    }
  }, [dispatch, hasCurrentResponse, nodeId, activeRepetition, response, loopPayloadRevision]);
}
