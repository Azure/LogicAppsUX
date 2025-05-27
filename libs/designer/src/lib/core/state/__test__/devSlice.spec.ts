import { describe, it, expect } from 'vitest';
import devReducer from '../dev/devSlice';
import { resetWorkflowState } from '../global';
import type { DevState } from '../dev/devInterfaces';
import { createAction } from '@reduxjs/toolkit';

describe('devSlice', () => {
  const initialState: DevState = {
    reduxActionCounts: {},
  };

  describe('initial state', () => {
    it('should return the initial state with action counting', () => {
      // The dev slice counts all actions, including the test action itself
      const result = devReducer(undefined, { type: 'unknown' });
      expect(result).toEqual({
        reduxActionCounts: {
          unknown: 1,
        },
      });
    });

// Removed redundant test case
  });

  describe('action counting behavior', () => {
    it('should count a single action dispatch', () => {
      const testAction = createAction<string>('test/action');
      const action = testAction('test payload');
      
      const result = devReducer(initialState, action);
      
      expect(result.reduxActionCounts).toEqual({
        'test/action': 1,
      });
    });

    it('should increment count for repeated actions', () => {
      const testAction = createAction<string>('test/repeatedAction');
      const action = testAction('test payload');
      
      let state = initialState;
      
      // First dispatch
      state = devReducer(state, action);
      expect(state.reduxActionCounts?.['test/repeatedAction']).toBe(1);
      
      // Second dispatch
      state = devReducer(state, action);
      expect(state.reduxActionCounts?.['test/repeatedAction']).toBe(2);
      
      // Third dispatch
      state = devReducer(state, action);
      expect(state.reduxActionCounts?.['test/repeatedAction']).toBe(3);
    });

    it('should count multiple different actions independently', () => {
      const actionA = createAction<string>('test/actionA');
      const actionB = createAction<string>('test/actionB');
      const actionC = createAction<string>('test/actionC');
      
      let state = initialState;
      
      // Dispatch actionA twice
      state = devReducer(state, actionA('payload1'));
      state = devReducer(state, actionA('payload2'));
      
      // Dispatch actionB once
      state = devReducer(state, actionB('payload3'));
      
      // Dispatch actionC three times
      state = devReducer(state, actionC('payload4'));
      state = devReducer(state, actionC('payload5'));
      state = devReducer(state, actionC('payload6'));
      
      expect(state.reduxActionCounts).toEqual({
        'test/actionA': 2,
        'test/actionB': 1,
        'test/actionC': 3,
      });
    });

    it('should preserve existing counts when adding new actions', () => {
      const existingState: DevState = {
        reduxActionCounts: {
          'existing/action': 5,
          'another/action': 2,
        },
      };
      
      const newAction = createAction<string>('new/action');
      const result = devReducer(existingState, newAction('payload'));
      
      expect(result.reduxActionCounts).toEqual({
        'existing/action': 5,
        'another/action': 2,
        'new/action': 1,
      });
    });

    it('should handle actions with complex payloads', () => {
      const complexAction = createAction<{ id: string; data: any }>('test/complexAction');
      const action = complexAction({
        id: 'test-id',
        data: { nested: { value: 123 }, array: [1, 2, 3] },
      });
      
      const result = devReducer(initialState, action);
      
      expect(result.reduxActionCounts).toEqual({
        'test/complexAction': 1,
      });
    });

    it('should handle actions with no payload', () => {
      const simpleAction = createAction('test/simpleAction');
      const action = simpleAction();
      
      const result = devReducer(initialState, action);
      
      expect(result.reduxActionCounts).toEqual({
        'test/simpleAction': 1,
      });
    });

    it('should handle built-in redux actions', () => {
      const builtInAction = { type: '@@redux/INIT' };
      
      const result = devReducer(initialState, builtInAction);
      
      expect(result.reduxActionCounts).toEqual({
        '@@redux/INIT': 1,
      });
    });
  });

  describe('resetWorkflowState integration', () => {
    it('should reset to initial state but count the resetWorkflowState action itself', () => {
      const stateWithCounts: DevState = {
        reduxActionCounts: {
          'test/action1': 5,
          'test/action2': 3,
          'test/action3': 10,
        },
      };
      
      const result = devReducer(stateWithCounts, resetWorkflowState());
      
      // The state should be reset but the resetWorkflowState action itself should be counted
      expect(result).toEqual({
        reduxActionCounts: {
          [resetWorkflowState().type]: 1,
        },
      });
      expect(result.reduxActionCounts).toEqual({
        [resetWorkflowState().type]: 1,
      });
    });

    it('should count the resetWorkflowState action when resetting from initial state', () => {
      const stateWithCounts: DevState = {
        reduxActionCounts: {
          'test/action1': 2,
        },
      };
      
      const result = devReducer(stateWithCounts, resetWorkflowState());
      
      expect(result.reduxActionCounts).toEqual({
        'resetWorkflowState': 1,
      });
    });

    it('should handle multiple workflow resets and count each one', () => {
      let state: DevState = {
        reduxActionCounts: {
          'test/action1': 5,
        },
      };
      
      // First reset
      state = devReducer(state, resetWorkflowState());
      expect(state.reduxActionCounts).toEqual({
        'resetWorkflowState': 1,
      });
      
      // Add some actions
      const testAction = createAction('test/afterReset');
      state = devReducer(state, testAction());
      expect(state.reduxActionCounts).toEqual({
        'resetWorkflowState': 1,
        'test/afterReset': 1,
      });
      
      // Second reset
      state = devReducer(state, resetWorkflowState());
      expect(state.reduxActionCounts).toEqual({
        'resetWorkflowState': 1,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle state with undefined reduxActionCounts', () => {
      const stateWithUndefinedCounts: DevState = {
        reduxActionCounts: undefined,
      };
      
      const testAction = createAction('test/action');
      const result = devReducer(stateWithUndefinedCounts, testAction());
      
      expect(result.reduxActionCounts).toEqual({
        'test/action': 1,
      });
    });

    it('should handle empty action type string', () => {
      const emptyAction = { type: '' };
      
      const result = devReducer(initialState, emptyAction);
      
      expect(result.reduxActionCounts).toEqual({
        '': 1,
      });
    });

    it('should handle action types with special characters', () => {
      const specialActions = [
        { type: 'test/action-with-dashes' },
        { type: 'test/action_with_underscores' },
        { type: 'test/action.with.dots' },
        { type: 'test/action with spaces' },
        { type: 'test/action@with@symbols' },
        { type: 'test/action/with/slashes' },
      ];
      
      let state = initialState;
      for (const action of specialActions) {
        state = devReducer(state, action);
      }
      
      expect(state.reduxActionCounts).toEqual({
        'test/action-with-dashes': 1,
        'test/action_with_underscores': 1,
        'test/action.with.dots': 1,
        'test/action with spaces': 1,
        'test/action@with@symbols': 1,
        'test/action/with/slashes': 1,
      });
    });

    it('should handle very long action type names', () => {
      const longActionType = 'a'.repeat(1000);
      const longAction = { type: longActionType };
      
      const result = devReducer(initialState, longAction);
      
      expect(result.reduxActionCounts?.[longActionType]).toBe(1);
    });
  });

  describe('performance and memory considerations', () => {
    it('should handle a large number of different actions', () => {
      let state = initialState;
      
      // Dispatch 100 different actions
      for (let i = 0; i < 100; i++) {
        const action = createAction(`test/action${i}`);
        state = devReducer(state, action());
      }
      
      expect(Object.keys(state.reduxActionCounts ?? {})).toHaveLength(100);
      
      // Each action should have a count of 1
      for (let i = 0; i < 100; i++) {
        expect(state.reduxActionCounts?.[`test/action${i}`]).toBe(1);
      }
    });

    it('should handle high frequency of the same action', () => {
      let state = initialState;
      const highFrequencyAction = createAction('test/highFrequency');
      
      // Dispatch the same action 1000 times
      for (let i = 0; i < 1000; i++) {
        state = devReducer(state, highFrequencyAction());
      }
      
      expect(state.reduxActionCounts?.['test/highFrequency']).toBe(1000);
    });
  });
});
