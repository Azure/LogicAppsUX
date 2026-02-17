import { describe, it, expect } from 'vitest';
import projectReducer, { initialize, changeDataMapperVersion, changeDesignerVersion } from '../projectSlice';
import type { ProjectState } from '../projectSlice';

describe('projectSlice', () => {
  const initialState: ProjectState = {
    initialized: false,
  };

  describe('initialize', () => {
    it('should set initialized to true and project name', () => {
      const result = projectReducer(initialState, initialize('designer'));
      expect(result.initialized).toBe(true);
      expect(result.project).toBe('designer');
    });

    it('should handle undefined project name', () => {
      const result = projectReducer(initialState, initialize(undefined));
      expect(result.initialized).toBe(true);
      expect(result.project).toBeUndefined();
    });
  });

  describe('changeDataMapperVersion', () => {
    it('should update dataMapperVersion', () => {
      const result = projectReducer(initialState, changeDataMapperVersion(2));
      expect(result.dataMapperVersion).toBe(2);
    });
  });

  describe('changeDesignerVersion', () => {
    it('should update designerVersion to 1', () => {
      const result = projectReducer(initialState, changeDesignerVersion(1));
      expect(result.designerVersion).toBe(1);
    });

    it('should update designerVersion to 2', () => {
      const result = projectReducer(initialState, changeDesignerVersion(2));
      expect(result.designerVersion).toBe(2);
    });

    it('should preserve other state when updating designerVersion', () => {
      const stateWithProject: ProjectState = {
        initialized: true,
        project: 'designer',
        dataMapperVersion: 1,
      };
      const result = projectReducer(stateWithProject, changeDesignerVersion(2));
      expect(result.designerVersion).toBe(2);
      expect(result.initialized).toBe(true);
      expect(result.project).toBe('designer');
      expect(result.dataMapperVersion).toBe(1);
    });
  });
});
