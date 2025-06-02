import { describe, expect, it } from 'vitest';
import reducer, { initDesignerOptions, initialDesignerOptionsState } from '../designerOptions/designerOptionsSlice';

describe('designer options slice reducers', () => {
  it('should initialize designer options state', async () => {
    const initialOptions = {
      readOnly: true,
      hostOptions: {
        displayRuntimeInfo: false,
        suppressCastingForSerialize: undefined,
        recurrenceInterval: undefined,
        maxWaitingRuns: undefined,
        forceEnableSplitOn: undefined,
        stringOverrides: undefined,
        maxStateHistorySize: 5,
      },
    };

    const state = reducer(initialDesignerOptionsState, initDesignerOptions(initialOptions));

    expect(state.readOnly).toEqual(true);
    expect(state.hostOptions.maxStateHistorySize).toEqual(5);
    expect(state.isVSCode).toEqual(false);
  });
});
