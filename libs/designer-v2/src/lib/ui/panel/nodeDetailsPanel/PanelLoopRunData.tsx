import { useLoopRepetitionAdmission } from '../../../core/hooks/useLoopRepetitionAdmission';
import { useNodeRepetition } from '../../../core/queries/runs';
import type { LoopRepetition } from '../../../core/state/workflow/workflowInterfaces';
import {
  useIsActionInSelectedTimelineRepetition,
  useIsWithinAgenticLoop,
  useNodeGraphId,
  useParentNodeId,
  useParentRunIndex,
  useRunData,
  useSelectedLoopRepetition,
} from '../../../core/state/workflow/workflowSelectors';

export function PanelLoopRunData({ nodeId }: { nodeId: string }) {
  const repetition = useSelectedLoopRepetition(nodeId);
  return repetition && !repetition.isEmpty ? <PanelRepetitionQuery nodeId={nodeId} repetition={repetition} /> : null;
}

function PanelRepetitionQuery({ nodeId, repetition }: { nodeId: string; repetition: LoopRepetition }) {
  const graphId = useNodeGraphId(nodeId);
  const isWithinAgenticLoop = useIsWithinAgenticLoop(graphId);
  const isTimelineRepetitionSelected = useIsActionInSelectedTimelineRepetition(nodeId);
  const parentId = useParentNodeId(nodeId);
  const parentStatus = useRunData(parentId ?? '')?.status;
  const parentRunIndex = useParentRunIndex(nodeId);
  // Cards can unmount due to viewport culling or graph collapse. The open pane observes the same query independently.
  const { data } = useNodeRepetition(
    isTimelineRepetitionSelected,
    nodeId,
    repetition.runId,
    repetition.name,
    parentStatus,
    parentRunIndex,
    isWithinAgenticLoop
  );
  useLoopRepetitionAdmission(nodeId, !isWithinAgenticLoop && isTimelineRepetitionSelected ? repetition : undefined, data);
  return null;
}
