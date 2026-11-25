import { getRecordEntry, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import constants from '../../common/constants';
import type { LoopRepetition, WorkflowState } from '../state/workflow/workflowInterfaces';

/** Until, Foreach and tool runs expose their repetition counts at different positions. */
export const getLoopsCount = (action: LogicAppsV2.WorkflowRunAction | undefined): number | undefined => {
  const { inputsLink, iterationCount, repetitionCount } = action ?? {};
  const foreachItemsCount = inputsLink?.metadata?.foreachItemsCount;

  if (typeof iterationCount === 'number') {
    return iterationCount;
  }
  if (typeof foreachItemsCount === 'number') {
    return foreachItemsCount;
  }
  return typeof repetitionCount === 'number' ? repetitionCount : undefined;
};

export const getScopeRepetitionName = (index: number | undefined): string => String(index).padStart(6, '0');

/** Use the same outer-to-inner coordinates for the request and for admission to the selected action. */
export const getLoopRepetition = (state: WorkflowState, nodeId: string): LoopRepetition | undefined => {
  const runId = state.runInstance?.id;
  if (
    !runId ||
    state.workflowKind === 'agent' ||
    getRecordEntry(state.operations, nodeId)?.type?.toLowerCase() === constants.NODE.TYPE.AGENT
  ) {
    return undefined;
  }

  const loopAncestors: { id: string; metadata: WorkflowState['nodesMetadata'][string] | undefined }[] = [];
  let parentId = getRecordEntry(state.nodesMetadata, nodeId)?.parentNodeId;
  while (parentId) {
    const parent = getRecordEntry(state.nodesMetadata, parentId);
    const type = getRecordEntry(state.operations, parentId)?.type?.toLowerCase();
    if (type === constants.NODE.TYPE.AGENT) {
      return undefined;
    }
    if (type === constants.NODE.TYPE.FOREACH || type === constants.NODE.TYPE.UNTIL) {
      loopAncestors.push({ id: parentId, metadata: parent });
    }
    parentId = parent?.parentNodeId;
  }

  if (loopAncestors.length === 0) {
    return undefined;
  }

  // Walk outer-to-inner so each nested loop's admitted runData is validated against its outer coordinate.
  loopAncestors.reverse();
  const indexes: string[] = [];
  for (let depth = 0; depth < loopAncestors.length; depth++) {
    const { metadata } = loopAncestors[depth];
    const isAdmittedForOuterCoordinate =
      depth === 0 ? !!metadata?.runData : isSameLoopRepetition(metadata?.runDataRepetition, { runId, name: indexes.join('-') });
    const admittedCount = isAdmittedForOuterCoordinate ? getLoopsCount(metadata?.runData) : undefined;

    if (admittedCount === 0) {
      // Returning an empty coordinate hides stale child runData and suppresses impossible child repetition fetches.
      return { runId, name: '', isEmpty: true };
    }

    const rawIndex = Math.max(0, metadata?.runIndex ?? 0);
    const effectiveIndex = admittedCount !== undefined && admittedCount > 0 ? Math.min(rawIndex, admittedCount - 1) : rawIndex;
    indexes.push(getScopeRepetitionName(effectiveIndex));
  }

  return { runId, name: indexes.join('-') };
};

export const isSameLoopRepetition = (left: LoopRepetition | undefined, right: LoopRepetition): boolean =>
  !!left && !left.isEmpty && !right.isEmpty && left.runId === right.runId && left.name === right.name;

interface AgentRepetitionIdentityParams {
  runId: string | undefined;
  ownerNodeId: string | undefined;
  repetitionName: string | undefined;
  repetitionIndex: number | undefined;
  parentStatus: string | undefined;
}

/** Missing run or repetition data leaves the legacy/unscoped path unchanged. */
export const getAgentRepetitionIdentity = ({
  runId,
  ownerNodeId,
  repetitionName,
  repetitionIndex,
  parentStatus,
}: AgentRepetitionIdentityParams): string | undefined => {
  if (!runId || !ownerNodeId || repetitionName === undefined || repetitionIndex === undefined) {
    return undefined;
  }
  return [runId, ownerNodeId, repetitionName, String(repetitionIndex), parentStatus ?? ''].join('|');
};
