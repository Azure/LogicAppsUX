import { getIntl } from 'intl/src';
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
  const intl = getIntl();
  const detailTriggerStrings = {
    Request: intl.formatMessage({
      defaultMessage: 'Request',
      id: 'VOk0Eh',
      description: 'Trigger belongs to Request category',
    }),
    Recurrence: intl.formatMessage({
      defaultMessage: 'Recurrence',
      id: 'CdyJ6f',
      description: 'Trigger belongs to Recurrence category',
    }),
    Other: intl.formatMessage({
      defaultMessage: 'Other',
      id: 'bubMSG',
      description: 'Trigger that does not belong to pre-defined categories',
    }),
  };

  switch (triggerType.toLowerCase()) {
    case 'request':
      return detailTriggerStrings.Request;
    case 'recurrence':
    case 'slidingwindow':
      return detailTriggerStrings.Recurrence;
    default:
      return detailTriggerStrings.Other;
  }
};
