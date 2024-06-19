import reducer, { initDesignerOptions, initialDesignerOptionsState } from '../designerOptions/designerOptionsSlice';
import { describe, it, expect } from 'vitest';

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
        hideUTFExpressions: undefined,
        stringOverrides: undefined,
      },
    };

    const state = reducer(initialDesignerOptionsState, initDesignerOptions(initialOptions));

    expect(state.readOnly).toEqual(true);
  });
});
