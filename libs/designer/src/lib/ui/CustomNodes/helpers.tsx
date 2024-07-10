import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';

export const shouldDisplayRunAfter = (operation: LogicAppsV2.ActionDefinition, isTrigger?: boolean): boolean => {
  if (isTrigger) {
    return false;
  }
  if (!operation || !operation.runAfter) {
    return false;
  }
  return Object.keys(operation.runAfter).length > 0;
};
