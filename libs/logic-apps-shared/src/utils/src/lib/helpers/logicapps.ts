import type { LogicAppsV2 } from '../models';

export function getResourceGroupFromWorkflowId(workflowID: string): string {
  const separators = workflowID.split('/');
  const resourceGroupLocation = 4;
  return separators?.[resourceGroupLocation];
}

export const getTriggerFromDefinition = (triggers: LogicAppsV2.Triggers): string => {
  return Object.values(triggers)
    .map((trigger) => getTriggerType(trigger.type))
    .join(', ');
};

export const getTriggerType = (triggerType: string): string => {
  switch (triggerType.toLowerCase()) {
    case 'request':
      return 'Request';
    case 'recurrence':
      return 'Schedule';
    default:
      return 'Unknown';
  }
};
