import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { clearWorkflowDetails, setConsumption, setWorkflowName, workflowSlice } from '../workflowSlice';
describe('workflow slice reducers', () => {
  it('update state call tests', async () => {
    const initialState = {
      isConsumption: false,
    };

    const state1 = workflowSlice.reducer(initialState, setWorkflowName('workflowName'));
    expect(state1.workflowName).toEqual('workflowName');

    const state2 = workflowSlice.reducer(initialState, clearWorkflowDetails());
    expect(state2.workflowName).toEqual(undefined);

    const state3 = workflowSlice.reducer(initialState, setConsumption(false));
    expect(state3.isConsumption).toEqual(false);
    expect(state3.workflowName).toEqual(undefined);

    const state4 = workflowSlice.reducer(initialState, setConsumption(true));
    expect(state4.isConsumption).toEqual(true);
    expect(state4.workflowName).toEqual(undefined);
  });
});
