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
