import { describe, it, expect } from 'vitest';
import reducer, { initialize, changeDataMapperVersion, changeDesignerVersion } from '../projectSlice';
import type { ProjectState } from '../projectSlice';

describe('projectSlice', () => {
  const initialState: ProjectState = {
    initialized: false,
  };

  it('should return initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle initialize with a project name', () => {
    const state = reducer(initialState, initialize('designer'));
    expect(state.initialized).toBe(true);
    expect(state.project).toBe('designer');
  });

  it('should handle initialize with undefined', () => {
    const state = reducer(initialState, initialize(undefined));
    expect(state.initialized).toBe(true);
    expect(state.project).toBeUndefined();
  });

  it('should handle changeDesignerVersion', () => {
    const state = reducer(initialState, changeDesignerVersion(2));
    expect(state.designerVersion).toBe(2);
  });

  it('should handle changeDesignerVersion back to 1', () => {
    const stateV2 = reducer(initialState, changeDesignerVersion(2));
    const stateV1 = reducer(stateV2, changeDesignerVersion(1));
    expect(stateV1.designerVersion).toBe(1);
  });

  it('should handle changeDataMapperVersion', () => {
    const state = reducer(initialState, changeDataMapperVersion(2));
    expect(state.dataMapperVersion).toBe(2);
  });
});
