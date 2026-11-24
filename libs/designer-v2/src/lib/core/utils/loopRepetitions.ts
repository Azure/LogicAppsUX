import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';

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
