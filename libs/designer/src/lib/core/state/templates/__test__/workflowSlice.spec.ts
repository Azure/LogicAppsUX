import { describe, it, expect } from 'vitest';
import { clearWorkflowDetails, setConsumption, setExistingWorkflowName, workflowSlice } from '../workflowSlice';
describe('workflow slice reducers', () => {
  it('update state call tests', async () => {
    const initialState = {
      isConsumption: false,
      subscriptionId: '',
      resourceGroup: '',
      workflowAppName: '',
      location: '',
      connections: {
        references: {},
        mapping: {},
      },
    };

    const state1 = workflowSlice.reducer(initialState, setExistingWorkflowName('workflowName'));
    expect(state1.existingWorkflowName).toEqual('workflowName');

    const state2 = workflowSlice.reducer(initialState, clearWorkflowDetails());
    expect(state2.existingWorkflowName).toEqual(undefined);

    const state3 = workflowSlice.reducer(initialState, setConsumption(false));
    expect(state3.isConsumption).toEqual(false);
    expect(state3.existingWorkflowName).toEqual(undefined);

    const state4 = workflowSlice.reducer(initialState, setConsumption(true));
    expect(state4.isConsumption).toEqual(true);
    expect(state4.existingWorkflowName).toEqual(undefined);
  });
});
