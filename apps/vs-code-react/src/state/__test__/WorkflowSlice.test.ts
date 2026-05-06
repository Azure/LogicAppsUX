import { describe, expect, it } from 'vitest';
import workflowReducer, { initializeWorkflow, updateCallbackInfo } from '../WorkflowSlice';

describe('WorkflowSlice', () => {
  it('initializes centralized codeful overview workflow properties', () => {
    const state = workflowReducer(
      undefined,
      initializeWorkflow({
        apiVersion: '2019-10-01-edge-preview',
        baseUrl: 'http://localhost:7071/runtime/webhooks/workflow/api/management',
        isCodeful: true,
        workflowProperties: {
          name: 'workflow-a',
          stateType: 'Stateful',
        },
        workflowPropertiesList: [
          {
            name: 'workflow-a',
            stateType: 'Stateful',
          },
          {
            name: 'workflow-b',
            stateType: 'Stateful',
          },
        ],
      })
    );

    expect(state.isCodeful).toBe(true);
    expect(state.workflowProperties.name).toBe('workflow-a');
    expect(state.workflowPropertiesList?.map((workflow) => workflow.name)).toEqual(['workflow-a', 'workflow-b']);
  });

  it('updates callback info for only the matching codeful workflow', () => {
    const state = workflowReducer(
      {
        baseUrl: '',
        apiVersion: '2019-10-01-edge-preview',
        workflowProperties: {
          name: 'workflow-a',
          stateType: 'Stateful',
        },
        workflowPropertiesList: [
          {
            name: 'workflow-a',
            stateType: 'Stateful',
          },
          {
            name: 'workflow-b',
            stateType: 'Stateful',
          },
        ],
        exportData: {
          selectedWorkflows: [],
          selectedSubscription: '',
          location: '',
          validationState: '',
          targetDirectory: {
            fsPath: '',
            path: '',
          },
          packageUrl: '',
          managedConnections: {
            isManaged: false,
            resourceGroup: undefined,
            resourceGroupLocation: undefined,
          },
          selectedAdvanceOptions: [],
        },
      },
      updateCallbackInfo({
        workflowName: 'workflow-b',
        callbackInfo: {
          value: 'http://localhost/workflows/workflow-b/triggers/manual/run',
          method: 'POST',
        },
      })
    );

    expect(state.workflowProperties.callbackInfo).toBeUndefined();
    expect(state.workflowPropertiesList?.[0].callbackInfo).toBeUndefined();
    expect(state.workflowPropertiesList?.[1].callbackInfo?.value).toBe('http://localhost/workflows/workflow-b/triggers/manual/run');
  });
});
