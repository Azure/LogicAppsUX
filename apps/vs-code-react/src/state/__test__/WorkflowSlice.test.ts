import { describe, expect, it } from 'vitest';
import workflowReducer, { initializeWorkflow, updateCallbackInfo, updateWorkflowProperties } from '../WorkflowSlice';

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

  it('updates centralized codeful overview workflow properties', () => {
    const state = workflowReducer(
      {
        baseUrl: 'http://localhost:7071/runtime/webhooks/workflow/api/management',
        apiVersion: '2019-10-01-edge-preview',
        workflowProperties: {
          name: 'source-workflow',
          stateType: 'Stateful',
        },
        workflowPropertiesList: [
          {
            name: 'source-workflow',
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
      updateWorkflowProperties({
        kind: 'Stateful',
        workflowProperties: {
          name: 'runtime-workflow',
          stateType: 'Stateful',
          kind: 'Stateful',
        },
        workflowPropertiesList: [
          {
            name: 'runtime-workflow',
            stateType: 'Stateful',
            kind: 'Stateful',
          },
        ],
      })
    );

    expect(state.workflowProperties.name).toBe('runtime-workflow');
    expect(state.workflowPropertiesList?.map((workflow) => workflow.name)).toEqual(['runtime-workflow']);
    expect(state.kind).toBe('Stateful');
  });
});
