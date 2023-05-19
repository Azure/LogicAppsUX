import Constants from '../../common/constants';
import type { Settings } from '../actions/bjsworkflow/settings';
import type { OperationMetadataState } from '../state/operation/operationMetadataSlice';
import type { WorkflowState } from '../state/workflow/workflowInterfaces';
import { getTriggerNodeId } from './graph';
import type { LogicAppsV2 } from '@microsoft/utils-logic-apps';

export function hasSecureOutputs(nodeType: string, allSettings: Settings | undefined): boolean {
  const { secureInputs, secureOutputs } = allSettings || {};
  return isSecureOutputsLinkedToInputs(nodeType) ? !!secureInputs?.value : !!secureOutputs?.value;
}

export function isSecureOutputsLinkedToInputs(nodeType?: string): boolean {
  switch (nodeType?.toLowerCase() ?? '') {
    case Constants.NODE.TYPE.COMPOSE:
    case Constants.NODE.TYPE.PARSE_JSON:
    case Constants.NODE.TYPE.RESPONSE:
      return true;

    default:
      return false;
  }
}

export function getSplitOnValue(workflowState: WorkflowState, operationState: OperationMetadataState): string | undefined {
  const triggerNodeId = getTriggerNodeId(workflowState);
  const settings = operationState.settings[triggerNodeId];
  return settings
    ? settings.splitOn?.value?.enabled
      ? (settings.splitOn?.value?.value as string)
      : undefined
    : (workflowState.operations[triggerNodeId] as LogicAppsV2.Trigger)?.splitOn;
}
