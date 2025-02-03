import { describe, it, expect } from 'vitest';
import { clearWorkflowDetails, setInitialData, workflowSlice } from '../workflowSlice';
describe('workflow slice reducers', () => {
  it('update state call tests', async () => {
    const initialState = {
      isConsumption: false,
      isCreateView: false,
      subscriptionId: '',
      resourceGroup: '',
      workflowAppName: '',
      location: '',
      connections: {
        references: {},
        mapping: {},
      },
    };

    const state1 = workflowSlice.reducer(
      initialState,
      setInitialData({
        existingWorkflowName: 'workflowName',
        isConsumption: false,
      } as any)
    );
    expect(state1.existingWorkflowName).toEqual('workflowName');
    expect(state1.isConsumption).toEqual(false);

    const state2 = workflowSlice.reducer(initialState, clearWorkflowDetails());
    expect(state2.existingWorkflowName).toEqual(undefined);
  });
});
