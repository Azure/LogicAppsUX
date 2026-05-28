import { getObjectPropertyValue, isNullOrEmpty } from '@microsoft/logic-apps-shared';

/**
 * Extracts the child workflow run name/ID from the outputs of a Workflow-type action.
 * Supports both raw API format and BoundParameters format.
 */
export const getChildRunNameFromOutputs = (outputs: any): string | undefined => {
  if (!isNullOrEmpty(outputs)) {
    // Raw API format: outputs.headers['x-ms-workflow-run-id']
    const rawRunId = getObjectPropertyValue(outputs, ['headers', 'x-ms-workflow-run-id']);
    if (!isNullOrEmpty(rawRunId)) {
      return rawRunId;
    }

    // BoundParameters format: outputs.headers.value['x-ms-workflow-run-id']
    return getObjectPropertyValue(outputs, ['headers', 'value', 'x-ms-workflow-run-id']);
  }
  return undefined;
};

/**
 * Extracts the child workflow ID from the inputs of a Workflow-type action.
 * Supports both raw API format and BoundParameters format.
 */
export const getChildWorkflowIdFromInputs = (childWorkflowInputs: any): string | undefined => {
  if (!isNullOrEmpty(childWorkflowInputs)) {
    // Raw API format: inputs.host.workflow.id
    const rawWorkflowId = getObjectPropertyValue(childWorkflowInputs, ['host', 'workflow', 'id']);
    if (!isNullOrEmpty(rawWorkflowId)) {
      return rawWorkflowId;
    }

    // BoundParameters format: inputs['host.workflow.id'].value
    const workflow = getObjectPropertyValue(childWorkflowInputs, ['host.workflow.id']);
    if (!isNullOrEmpty(workflow)) {
      return workflow.value;
    }
  }
  return undefined;
};
