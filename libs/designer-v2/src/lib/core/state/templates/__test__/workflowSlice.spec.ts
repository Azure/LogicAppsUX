import { describe, it, expect } from 'vitest';
import { setInitialData, workflowSlice } from '../workflowSlice';
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
        isConsumption: false,
      } as any)
    );
    expect(state1.isConsumption).toEqual(false);
  });
});
